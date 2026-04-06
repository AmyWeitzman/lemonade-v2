/**
 * Housing System Routes
 *
 * GET  /api/housing                  — catalog with filters + compare
 * POST /api/housing/:id/select       — select housing for player
 * POST /api/housing/improvements     — apply home improvement to owned home
 * POST /api/housing/sell             — sell current owned home
 *
 * Requirements: Req 12, Req 42
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  checkHousingEligibility,
  calculateMarketValue,
  calculatePoolCost,
  calculateSolarPanelsCost,
  calculateRemodelValueIncrease,
  SOLAR_PANELS_VALUE_INCREASE,
  HOUSING_CHANGE_STRESS,
  HousingRow,
  HomeImprovement,
} from '../lib/housing';
import type { InflationRates } from '../lib/inflation';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FullPlayer = NonNullable<Awaited<ReturnType<typeof fetchFullPlayer>>>;

async function fetchFullPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
    include: {
      children: true,
      pets: true,
      educations: { where: { isActive: true } },
      housingOwnerships: {
        where: { endAge: null },
        include: { housing: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

function buildEligibilityPlayer(player: FullPlayer) {
  return {
    age: player.age,
    maritalStatus: player.maritalStatus,
    children: player.children.map((c) => ({ age: c.age })),
    pets: player.pets.map((p) => ({ type: p.type, isAlive: p.isAlive })),
    educations: player.educations.map((e) => ({ isActive: e.isActive, programType: (e as any).programType })),
  };
}

/** Count total occupants: player (1) + spouse (if married) + kids under 18 */
function countOccupants(player: FullPlayer): number {
  const kidsUnder18 = player.children.filter((c) => c.age < 18).length;
  const spouseCount = player.maritalStatus === 'married' ? 1 : 0;
  return 1 + spouseCount + kidsUnder18;
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const listHousingSchema = z.object({
  gameSessionId: z.string().min(1),
  location: z.enum(['city', 'suburb']).optional(),
  showAll: z.coerce.boolean().optional(), // Req 47.3: bypass player-location default filter
  minCapacity: z.coerce.number().optional(),
  maxPetLarge: z.coerce.number().optional(),
  maxPetSmall: z.coerce.number().optional(),
  rentalOnly: z.coerce.boolean().optional(),
  buyOnly: z.coerce.boolean().optional(),
  maxCost: z.coerce.number().optional(),
  compare: z.string().optional(), // comma-separated housing IDs
});

const selectHousingSchema = z.object({
  gameSessionId: z.string().min(1),
  // Required when housing.location === 'both' — player picks which area they're living in
  location: z.enum(['city', 'suburb']).optional(),
});



const improvementsSchema = z.object({
  gameSessionId: z.string().min(1),
  type: z.enum(['remodel', 'pool', 'solar_panels']),
  investmentAmount: z.number().optional(), // required for remodel
});

const sellSchema = z.object({
  gameSessionId: z.string().min(1),
});

// ─── GET /api/housing ─────────────────────────────────────────────────────────

router.get('/', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = listHousingSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const { gameSessionId, location, showAll, minCapacity, maxPetLarge, maxPetSmall, rentalOnly, buyOnly, maxCost, compare } =
    result.data;

  try {
    const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    // ── Compare mode ──────────────────────────────────────────────────────────
    if (compare) {
      const ids = compare.split(',').map((s) => s.trim()).filter(Boolean);
      const compareHousing = await prisma.housing.findMany({
        where: { id: { in: ids } },
      }) as unknown as HousingRow[];

      const eligPlayer = buildEligibilityPlayer(player);
      const occupants = countOccupants(player);

      const annotated = compareHousing.map((h) => {
        const eligResult = checkHousingEligibility(h, eligPlayer);
        return {
          ...h,
          eligible: eligResult.eligible,
          eligibilityReasons: eligResult.reasons,
          warnings: eligResult.warnings,
          estimatedAnnualCost: h.isRental
            ? (h.rentPerYear ?? 0) + h.utilitiesBase + h.utilitiesPerPerson * occupants
            : h.utilitiesBase + h.utilitiesPerPerson * occupants + (h.insurancePerYear ?? 0),
        };
      });

      res.json({ compare: annotated });
      return;
    }

    // ── Catalog listing ───────────────────────────────────────────────────────
    const allHousing = (await prisma.housing.findMany({
      orderBy: [
        { isRental: 'asc' },
        { purchasePrice: 'asc' },
        { rentPerYear: 'asc' },
      ],
    })) as unknown as HousingRow[];

    let housing = allHousing;

    // Filters
    if (location) {
      // Explicit location filter overrides the player-location default
      housing = housing.filter((h) => h.location === location || h.location === 'both');
    } else if (!showAll) {
      // Req 47.3 — default: filter to player's current location (showAll=true bypasses this)
      housing = housing.filter((h) => h.location === player.location || h.location === 'both');
    }
    if (minCapacity !== undefined) {
      housing = housing.filter((h) => h.maxOccupancy >= minCapacity);
    }
    if (maxPetLarge !== undefined) {
      housing = housing.filter((h) => h.petLimitLarge >= maxPetLarge);
    }
    if (maxPetSmall !== undefined) {
      housing = housing.filter((h) => h.petLimitSmall >= maxPetSmall);
    }
    if (rentalOnly) {
      housing = housing.filter((h) => h.isRental);
    }
    if (buyOnly) {
      housing = housing.filter((h) => !h.isRental);
    }
    if (maxCost !== undefined) {
      housing = housing.filter((h) => {
        const cost = h.isRental ? (h.rentPerYear ?? 0) : (h.purchasePrice ?? 0);
        return cost <= maxCost;
      });
    }

    // Annotate with eligibility
    const eligPlayer = buildEligibilityPlayer(player);
    const occupants = countOccupants(player);

    const annotated = housing.map((h) => {
      const eligResult = checkHousingEligibility(h, eligPlayer);
      const currentOwnership = player.housingOwnerships[0];
      const isCurrentHome = currentOwnership?.housingId === h.id;

      return {
        ...h,
        eligible: eligResult.eligible,
        eligibilityReasons: eligResult.reasons,
        warnings: eligResult.warnings,
        isCurrentHome,
        estimatedAnnualCost: h.isRental
          ? (h.rentPerYear ?? 0) + h.utilitiesBase + h.utilitiesPerPerson * occupants
          : h.utilitiesBase + h.utilitiesPerPerson * occupants + (h.insurancePerYear ?? 0),
      };
    });

    res.json({ housing: annotated });
  } catch (err) {
    console.error('[housing/list]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/housing/:id/select ─────────────────────────────────────────────

router.post(
  '/:id/select',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const { id: housingId } = req.params;

    const result = selectHousingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, location: requestedLocation } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const housing = await prisma.housing.findUnique({ where: { id: housingId } }) as unknown as HousingRow | null;
      if (!housing) {
        res.status(404).json({ error: 'Housing not found' });
        return;
      }

      // Already in this housing?
      const currentOwnership = player.housingOwnerships[0];
      if (currentOwnership?.housingId === housingId) {
        res.status(400).json({ error: 'You are already living in this housing' });
        return;
      }

      // Eligibility check
      const eligPlayer = buildEligibilityPlayer(player);
      const eligResult = checkHousingEligibility(housing, eligPlayer);
      if (!eligResult.eligible) {
        res.status(400).json({ error: 'Housing requirements not met', reasons: eligResult.reasons });
        return;
      }

      // Fetch session for inflation data and current year
      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { inflationRates: true, currentYear: true },
      });
      if (!session) {
        res.status(404).json({ error: 'Game session not found' });
        return;
      }

      const inflationRates = (session.inflationRates as unknown as InflationRates[]) ?? [];
      const currentYear = session.currentYear;

      // Resolve location:
      // - city/suburb-only housing → use housing's location
      // - 'both' housing → use the location the player explicitly chose (required)
      if (housing.location === 'both' && !requestedLocation) {
        res.status(400).json({ error: 'This housing is available in both areas. Please specify a location (city or suburb).' });
        return;
      }
      const resolvedLocation = housing.location === 'both' ? requestedLocation! : housing.location;

      // ── Handle sale of current owned home ────────────────────────────────
      let saleProceeds = 0;
      let soldOwnershipId: string | null = null;

      if (currentOwnership && !currentOwnership.isRental) {
        const improvements = (currentOwnership.improvements as unknown as HomeImprovement[]) ?? [];
        const purchasePrice = currentOwnership.purchasePrice ?? 0;

        // Determine purchase year from startAge — approximate using session year offset
        // We use the inflationRates array length to estimate: purchaseYear = currentYear - yearsLived
        const purchaseYear = currentYear - currentOwnership.yearsLived;

        saleProceeds = calculateMarketValue(
          purchasePrice,
          inflationRates,
          purchaseYear,
          currentYear,
          improvements,
        );

        soldOwnershipId = currentOwnership.id;
      }

      // ── Stress for changing housing ───────────────────────────────────────
      const stressIncrease = currentOwnership ? HOUSING_CHANGE_STRESS : 0;

      // ── Persist in transaction ────────────────────────────────────────────
      const newOwnership = await prisma.$transaction(async (tx) => {
        // Close out old ownership record
        if (currentOwnership) {
          await tx.housingOwnership.update({
            where: { id: currentOwnership.id },
            data: {
              endAge: player.age,
              ...(soldOwnershipId && !currentOwnership.isRental
                ? { salePrice: saleProceeds }
                : {}),
            },
          });
        }

        // Add sale proceeds to player money
        const moneyDelta = saleProceeds;
        const newStress = Math.min(100, player.stress + stressIncrease);

        // Create new ownership record
        const created = await tx.housingOwnership.create({
          data: {
            playerId: player.id,
            housingId,
            startAge: player.age,
            isRental: housing.isRental,
            purchasePrice: housing.isRental ? null : housing.purchasePrice,
            totalRentPaid: 0,
            yearsLived: 0,
            chosenLocation: resolvedLocation,
            improvements: [],
          } as any,
        });

        // Update player: location, stress, money (add sale proceeds)
        await tx.player.update({
          where: { id: player.id },
          data: {
            location: resolvedLocation,
            stress: newStress,
            ...(moneyDelta > 0 ? { money: { increment: moneyDelta } } : {}),
          },
        });

        return created;
      });

      // Notify player
      const locationChanged = resolvedLocation !== player.location;
      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'housing',
          title: 'Housing Selected',
          message: `You are now living in ${housing.name}${locationChanged ? ` (moved to ${resolvedLocation})` : ''}${saleProceeds > 0 ? `. Sold previous home for $${Math.round(saleProceeds).toLocaleString()}` : ''}.`,
        },
        getIO(),
      );

      if (stressIncrease > 0) {
        await sendNotification(
          player.id,
          {
            type: 'warning',
            category: 'housing',
            title: 'Moving Stress',
            message: `Moving to a new home added +${stressIncrease}% stress.`,
          },
          getIO(),
        );
      }

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {
          location: resolvedLocation as string,
          stress: Math.min(100, player.stress + stressIncrease),
        } as Record<string, unknown>,
      });

      res.status(201).json({
        ownership: newOwnership,
        saleProceeds,
        stressAdded: stressIncrease,
        locationChanged,
        warnings: eligResult.warnings,
      });
    } catch (err) {
      console.error('[housing/select]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/housing/improvements ──────────────────────────────────────────

router.post(
  '/improvements',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = improvementsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, type, investmentAmount } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const currentOwnership = player.housingOwnerships[0];
      if (!currentOwnership) {
        res.status(400).json({ error: 'You do not have an active housing record' });
        return;
      }

      if (currentOwnership.isRental) {
        res.status(400).json({ error: 'Home improvements are only available for owned homes' });
        return;
      }

      const housing = currentOwnership.housing as unknown as HousingRow;
      const improvements = (currentOwnership.improvements as unknown as HomeImprovement[]) ?? [];

      // Check if improvement already exists
      const alreadyHas = improvements.some((i) => i.type === type);
      if (alreadyHas && type !== 'remodel') {
        res.status(400).json({ error: `You already have a ${type} installed` });
        return;
      }

      // Validate improvement is allowed for this housing
      if (type === 'remodel' && !housing.allowsRemodeling) {
        res.status(400).json({ error: 'This home does not allow remodeling' });
        return;
      }
      if (type === 'pool' && !housing.allowsPool) {
        res.status(400).json({ error: 'This home does not allow a pool' });
        return;
      }
      if (type === 'solar_panels' && !housing.allowsSolarPanels) {
        res.status(400).json({ error: 'This home does not allow solar panels' });
        return;
      }

      let cost = 0;
      let valueIncrease = 0;
      let annualMaintenanceCost: number | undefined;

      if (type === 'remodel') {
        if (!investmentAmount || investmentAmount <= 0) {
          res.status(400).json({ error: 'investmentAmount is required for remodel' });
          return;
        }
        cost = investmentAmount;
        valueIncrease = calculateRemodelValueIncrease(investmentAmount);
      } else if (type === 'pool') {
        const purchasePrice = currentOwnership.purchasePrice ?? 0;
        const poolCalc = calculatePoolCost(purchasePrice, currentOwnership.yearsLived);
        cost = poolCalc.installCost;
        valueIncrease = poolCalc.valueIncrease;
        annualMaintenanceCost = poolCalc.annualMaintenance;
      } else if (type === 'solar_panels') {
        const purchasePrice = currentOwnership.purchasePrice ?? 0;
        cost = calculateSolarPanelsCost(purchasePrice, currentOwnership.yearsLived);
        valueIncrease = SOLAR_PANELS_VALUE_INCREASE;
      }

      // Check player can afford it
      if (player.money < cost) {
        res.status(400).json({
          error: `Cannot afford this improvement. Cost: $${Math.round(cost).toLocaleString()}, you have: $${Math.round(player.money).toLocaleString()}`,
        });
        return;
      }

      const newImprovement: HomeImprovement = {
        type,
        cost,
        valueIncrease,
        ...(annualMaintenanceCost !== undefined ? { annualMaintenanceCost } : {}),
        appliedAge: player.age,
      };

      const updatedImprovements = [...improvements, newImprovement];

      await prisma.$transaction(async (tx) => {
        await tx.housingOwnership.update({
          where: { id: currentOwnership.id },
          data: { improvements: updatedImprovements as any },
        });

        await tx.player.update({
          where: { id: player.id },
          data: { money: { decrement: cost } },
        });

        // Solar panels: grant 2 lemons immediately for this year
        if (type === 'solar_panels') {
          await tx.player.update({
            where: { id: player.id },
            data: { totalLemonsEarned: { increment: 2 } },
          });

          // Update pitcher
          const session = await tx.gameSession.findUnique({
            where: { id: gameSessionId },
            select: { pitcherCurrentLemons: true, pitcherContributionsByPlayer: true },
          });
          if (session) {
            const contributions = (session.pitcherContributionsByPlayer as Record<string, number>) ?? {};
            contributions[player.id] = (contributions[player.id] ?? 0) + 2;
            await tx.gameSession.update({
              where: { id: gameSessionId },
              data: {
                pitcherCurrentLemons: { increment: 2 },
                pitcherContributionsByPlayer: contributions,
              },
            });
          }
        }
      });

      const messages: string[] = [];
      if (type === 'remodel') {
        messages.push(`Remodel complete! Home value increased by $${Math.round(valueIncrease).toLocaleString()}.`);
      } else if (type === 'pool') {
        messages.push(`Pool installed! Home value increased by $${Math.round(valueIncrease).toLocaleString()}. Annual maintenance: $${annualMaintenanceCost?.toLocaleString()}/yr.`);
      } else if (type === 'solar_panels') {
        messages.push(`Solar panels installed! Utilities reduced by 60% and you earned 2 lemons.`);
      }

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'housing',
          title: 'Home Improvement',
          message: messages[0] ?? 'Improvement applied.',
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money - cost },
      });

      res.status(201).json({
        improvement: newImprovement,
        cost,
        valueIncrease,
        annualMaintenanceCost,
      });
    } catch (err) {
      console.error('[housing/improvements]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/housing/sell ───────────────────────────────────────────────────

router.post(
  '/sell',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = sellSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const currentOwnership = player.housingOwnerships[0];
      if (!currentOwnership) {
        res.status(400).json({ error: 'You do not have an active housing record' });
        return;
      }

      if (currentOwnership.isRental) {
        res.status(400).json({ error: 'You cannot sell a rental — select new housing to move out' });
        return;
      }

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { inflationRates: true, currentYear: true },
      });
      if (!session) {
        res.status(404).json({ error: 'Game session not found' });
        return;
      }

      const inflationRates = (session.inflationRates as unknown as InflationRates[]) ?? [];
      const currentYear = session.currentYear;
      const improvements = (currentOwnership.improvements as unknown as HomeImprovement[]) ?? [];
      const purchasePrice = currentOwnership.purchasePrice ?? 0;
      const purchaseYear = currentYear - currentOwnership.yearsLived;

      const marketValue = calculateMarketValue(
        purchasePrice,
        inflationRates,
        purchaseYear,
        currentYear,
        improvements,
      );

      await prisma.$transaction(async (tx) => {
        // Close ownership record
        await tx.housingOwnership.update({
          where: { id: currentOwnership.id },
          data: {
            endAge: player.age,
            salePrice: marketValue,
          },
        });

        // Add proceeds to player money
        await tx.player.update({
          where: { id: player.id },
          data: { money: { increment: marketValue } },
        });
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'housing',
          title: 'Home Sold',
          message: `Your home sold for $${Math.round(marketValue).toLocaleString()}. Please select new housing.`,
          persistent: true,
          actionRequired: true,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money + marketValue },
      });

      res.json({
        salePrice: marketValue,
        purchasePrice,
        appreciation: marketValue - purchasePrice,
        improvementValue: improvements.reduce((s, i) => s + i.valueIncrease, 0),
      });
    } catch (err) {
      console.error('[housing/sell]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
