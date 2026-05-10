/**
 * Transportation System Routes
 *
 * GET  /api/vehicles                  — catalog with filters + compare
 * POST /api/vehicles/:id/purchase     — purchase a vehicle
 * POST /api/vehicles/:id/sell         — sell current vehicle
 *
 * Requirements: Req 13
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import {
  VehicleRow,
  PlayerForVehicle,
  calculateAnnualVehicleCosts,
  calculateDepreciatedValue,
  checkVehicleCapacity,
  hasMechanicBenefit,
  isBikeValidForTravel,
  VEHICLE_CHANGE_STRESS,
  getVehicleAgeYears,
} from '../lib/vehicles';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FullPlayer = NonNullable<Awaited<ReturnType<typeof fetchFullPlayer>>>;

async function fetchFullPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
    include: {
      children: true,
      employments: {
        where: { isActive: true },
        include: { job: true },
      },
      vehicleOwnerships: {
        where: { endAge: null },
        include: { vehicle: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

function buildVehiclePlayer(player: FullPlayer): PlayerForVehicle {
  return {
    age: player.age,
    location: player.location,
    maritalStatus: player.maritalStatus,
    children: player.children.map((c) => ({ age: c.age })),
    spouse: player.spouse,
    employments: player.employments.map((e) => ({
      isActive: e.isActive,
      job: { title: e.job.title, benefits: e.job.benefits },
    })),
  };
}

/** Get the player's current (non-spouse) active vehicle ownership */
function getCurrentPlayerOwnership(player: FullPlayer) {
  return player.vehicleOwnerships.find((o) => !o.isSpouseVehicle) ?? null;
}

/** Get the spouse's current active vehicle ownership */
function getCurrentSpouseOwnership(player: FullPlayer) {
  return player.vehicleOwnerships.find((o) => o.isSpouseVehicle) ?? null;
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const listVehiclesSchema = z.object({
  gameSessionId: z.string().min(1),
  maxCost: z.coerce.number().optional(),
  minPeople: z.coerce.number().optional(),
  carOnly: z.coerce.boolean().optional(),
  nonCarOnly: z.coerce.boolean().optional(),
  fuelType: z.enum(['none', 'gas', 'electric', 'hybrid']).optional(),
  ageVariant: z.enum(['new', 'used_5yr', 'used_10yr']).optional(),
  compare: z.string().optional(), // comma-separated vehicle IDs
});

const purchaseVehicleSchema = z.object({
  gameSessionId: z.string().min(1),
  forSpouse: z.boolean().optional().default(false),
});

const sellVehicleSchema = z.object({
  gameSessionId: z.string().min(1),
  forSpouse: z.boolean().optional().default(false),
});

// ─── GET /api/vehicles ────────────────────────────────────────────────────────

router.get('/', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = listVehiclesSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const { gameSessionId, maxCost, minPeople, carOnly, nonCarOnly, fuelType, ageVariant, compare } =
    result.data;

  try {
    const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    const vehiclePlayer = buildVehiclePlayer(player);
    const isMechanic = hasMechanicBenefit(vehiclePlayer);

    // ── Compare mode ──────────────────────────────────────────────────────────
    if (compare) {
      const ids = compare.split(',').map((s) => s.trim()).filter(Boolean);
      const compareVehicles = (await prisma.vehicle.findMany({
        where: { id: { in: ids } },
      })) as unknown as VehicleRow[];

      const annotated = compareVehicles.map((v) => {
        const capacityCheck = checkVehicleCapacity(v, vehiclePlayer);
        const annualCosts = calculateAnnualVehicleCosts(v, 0, isMechanic);
        const bikeValid =
          v.type === 'bike'
            ? isBikeValidForTravel(v, player.location, player.location)
            : true;
        return {
          ...v,
          eligible: capacityCheck.eligible,
          eligibilityReason: capacityCheck.reason,
          bikeAreaRestriction: v.type === 'bike' && !bikeValid,
          estimatedAnnualCosts: annualCosts,
        };
      });

      res.json({ compare: annotated });
      return;
    }

    // ── Catalog listing ───────────────────────────────────────────────────────
    const allVehicles = (await prisma.vehicle.findMany({
      orderBy: [{ type: 'asc' }, { purchasePrice: 'asc' }],
    })) as unknown as VehicleRow[];

    let vehicles = allVehicles;

    // Filters
    if (maxCost !== undefined) {
      vehicles = vehicles.filter((v) => {
        const cost = v.purchasePrice ?? v.annualCost ?? 0;
        return cost <= maxCost;
      });
    }
    if (minPeople !== undefined) {
      vehicles = vehicles.filter((v) => v.passengerCapacity >= minPeople);
    }
    if (carOnly) {
      vehicles = vehicles.filter((v) => v.type === 'car');
    }
    if (nonCarOnly) {
      vehicles = vehicles.filter((v) => v.type !== 'car');
    }
    if (fuelType) {
      vehicles = vehicles.filter((v) => v.fuelType === fuelType);
    }
    if (ageVariant) {
      vehicles = vehicles.filter((v) => v.ageVariant === ageVariant);
    }

    // Annotate with eligibility and cost estimates
    const currentPlayerOwnership = getCurrentPlayerOwnership(player);
    const currentSpouseOwnership = getCurrentSpouseOwnership(player);

    const annotated = vehicles.map((v) => {
      const capacityCheck = checkVehicleCapacity(v, vehiclePlayer);
      const annualCosts = calculateAnnualVehicleCosts(v, 0, isMechanic);
      const bikeValid =
        v.type === 'bike'
          ? isBikeValidForTravel(v, player.location, player.location)
          : true;

      return {
        ...v,
        eligible: capacityCheck.eligible,
        eligibilityReason: capacityCheck.reason,
        bikeAreaRestriction: v.type === 'bike' && !bikeValid,
        isCurrentPlayerVehicle: currentPlayerOwnership?.vehicleId === v.id,
        isCurrentSpouseVehicle: currentSpouseOwnership?.vehicleId === v.id,
        estimatedAnnualCosts: annualCosts,
      };
    });

    res.json({ vehicles: annotated });
  } catch (err) {
    console.error('[vehicles/list]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/vehicles/:id/purchase ─────────────────────────────────────────

router.post(
  '/:id/purchase',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const { id: vehicleId } = req.params;

    const result = purchaseVehicleSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, forSpouse } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      // Spouse vehicle requires married status
      if (forSpouse && player.maritalStatus !== 'married') {
        res.status(400).json({ error: 'You must be married to purchase a vehicle for your spouse' });
        return;
      }

      const vehicle = (await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      })) as unknown as VehicleRow | null;
      if (!vehicle) {
        res.status(404).json({ error: 'Vehicle not found' });
        return;
      }

      // Public transit has no purchase — it's an annual cost
      if (vehicle.type === 'public_transit' && vehicle.purchasePrice === null) {
        res.status(400).json({ error: 'Public transit is paid annually, not purchased' });
        return;
      }

      const purchasePrice = vehicle.purchasePrice;
      if (purchasePrice === null) {
        res.status(400).json({ error: 'This vehicle has no purchase price' });
        return;
      }

      // Capacity check (only for player's own vehicle, not spouse's)
      if (!forSpouse) {
        const vehiclePlayer = buildVehiclePlayer(player);
        const capacityCheck = checkVehicleCapacity(vehicle, vehiclePlayer);
        if (!capacityCheck.eligible) {
          res.status(400).json({ error: capacityCheck.reason });
          return;
        }
      }

      // Check player can afford it
      if (player.money < purchasePrice) {
        res.status(400).json({
          error: `Cannot afford this vehicle. Cost: $${purchasePrice.toLocaleString()}, you have: $${Math.round(player.money).toLocaleString()}`,
        });
        return;
      }

      // Get current ownership to close out
      const currentOwnership = forSpouse
        ? getCurrentSpouseOwnership(player)
        : getCurrentPlayerOwnership(player);

      const hadPreviousVehicle = currentOwnership !== null;

      // Persist in transaction
      const newOwnership = await prisma.$transaction(async (tx) => {
        // Close out old ownership
        if (currentOwnership) {
          await tx.vehicleOwnership.update({
            where: { id: currentOwnership.id },
            data: { endAge: player.age },
          });
        }

        // Create new ownership record
        const created = await tx.vehicleOwnership.create({
          data: {
            playerId: player.id,
            vehicleId,
            startAge: player.age,
            purchasePrice,
            wasParentGift: false,
            isSpouseVehicle: forSpouse,
            totalMaintenancePaid: 0,
            totalInsurancePaid: 0,
            yearsOwned: 0,
          },
        });

        // Deduct purchase price and apply stress (no stress when switching to public transit)
        const stressIncrease =
          hadPreviousVehicle && vehicle.type !== 'public_transit' ? VEHICLE_CHANGE_STRESS : 0;
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: { decrement: purchasePrice },
            stress: { increment: stressIncrease },
          },
        });

        return { created, stressIncrease };
      });

      const stressAdded = newOwnership.stressIncrease;

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'vehicle',
          title: 'Vehicle Purchased',
          message: `You purchased a ${vehicle.name} for $${purchasePrice.toLocaleString()}${forSpouse ? ' (for spouse)' : ''}.`,
        },
        getIO(),
      );

      if (stressAdded > 0) {
        await sendNotification(
          player.id,
          {
            type: 'warning',
            category: 'vehicle',
            title: 'Vehicle Change Stress',
            message: `Changing vehicles added +${stressAdded}% stress.`,
          },
          getIO(),
        );
      }

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {
          money: player.money - purchasePrice,
          stress: Math.min(100, player.stress + stressAdded),
        } as Record<string, unknown>,
      });

      res.status(201).json({
        ownership: newOwnership.created,
        purchasePrice,
        stressAdded,
        forSpouse,
      });
    } catch (err) {
      console.error('[vehicles/purchase]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/vehicles/:id/sell ──────────────────────────────────────────────

router.post(
  '/:id/sell',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const { id: vehicleId } = req.params;

    const result = sellVehicleSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, forSpouse } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      // Find the active ownership for this vehicle
      const ownership = player.vehicleOwnerships.find(
        (o) => o.vehicleId === vehicleId && o.isSpouseVehicle === forSpouse,
      );

      if (!ownership) {
        res.status(404).json({
          error: forSpouse
            ? 'No active vehicle ownership found for spouse'
            : 'No active vehicle ownership found for this vehicle',
        });
        return;
      }

      const vehicle = (await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      })) as unknown as VehicleRow | null;
      if (!vehicle) {
        res.status(404).json({ error: 'Vehicle not found' });
        return;
      }

      // Public transit and bikes have no resale value
      if (vehicle.type === 'public_transit' || vehicle.type === 'bike') {
        res.status(400).json({ error: `${vehicle.type === 'bike' ? 'Bikes' : 'Public transit'} cannot be sold` });
        return;
      }

      const purchasePrice = ownership.purchasePrice ?? vehicle.purchasePrice ?? 0;
      const salePrice = calculateDepreciatedValue(vehicle, purchasePrice, ownership.yearsOwned);

      await prisma.$transaction(async (tx) => {
        // Close ownership record
        await tx.vehicleOwnership.update({
          where: { id: ownership.id },
          data: {
            endAge: player.age,
            salePrice,
          },
        });

        // Add sale proceeds to player money
        await tx.player.update({
          where: { id: player.id },
          data: { money: { increment: salePrice } },
        });
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'vehicle',
          title: 'Vehicle Sold',
          message: `Your ${vehicle.name} sold for $${Math.round(salePrice).toLocaleString()}. Please select a new vehicle.`,
          persistent: true,
          actionRequired: true,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: player.money + salePrice } as Record<string, unknown>,
      });

      res.json({
        salePrice: Math.round(salePrice),
        purchasePrice,
        yearsOwned: ownership.yearsOwned,
        depreciation: purchasePrice - salePrice,
        forSpouse,
      });
    } catch (err) {
      console.error('[vehicles/sell]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/vehicles/owned ──────────────────────────────────────────────────

router.get(
  '/owned',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const { gameSessionId } = req.query as { gameSessionId?: string };
    if (!gameSessionId) {
      res.status(400).json({ error: 'gameSessionId is required' });
      return;
    }

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const vehiclePlayer = buildVehiclePlayer(player);
      const isMechanic = hasMechanicBenefit(vehiclePlayer);

      const playerOwnership = getCurrentPlayerOwnership(player);
      const spouseOwnership = getCurrentSpouseOwnership(player);

      function annotateOwnership(ownership: typeof playerOwnership) {
        if (!ownership) return null;
        const v = ownership.vehicle as unknown as VehicleRow;
        const annualCosts = calculateAnnualVehicleCosts(v, ownership.yearsOwned, isMechanic);
        const depreciatedValue =
          v.type !== 'bike' && v.type !== 'public_transit' && ownership.purchasePrice
            ? calculateDepreciatedValue(v, ownership.purchasePrice, ownership.yearsOwned)
            : null;
        return {
          ownership: {
            id: ownership.id,
            vehicleId: ownership.vehicleId,
            startAge: ownership.startAge,
            purchasePrice: ownership.purchasePrice,
            wasParentGift: ownership.wasParentGift,
            isSpouseVehicle: ownership.isSpouseVehicle,
            totalMaintenancePaid: ownership.totalMaintenancePaid,
            totalInsurancePaid: ownership.totalInsurancePaid,
            yearsOwned: ownership.yearsOwned,
          },
          vehicle: v,
          annualCosts,
          depreciatedValue,
          isMechanicDiscount: isMechanic,
        };
      }

      res.json({
        player: annotateOwnership(playerOwnership),
        spouse: annotateOwnership(spouseOwnership),
        isMechanic,
      });
    } catch (err) {
      console.error('[vehicles/owned]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
