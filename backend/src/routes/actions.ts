/**
 * Action System Routes
 *
 * GET  /api/actions               — catalog with filters + sort
 * GET  /api/actions/search        — search by name/description
 * GET  /api/actions/cart/validate — validate proposed cart
 * POST /api/actions/execute       — execute actions (cart checkout)
 *
 * Requirements: Req 8, Req 22, Req 34
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { calculateTimeBlocks } from '../lib/timeBlocks';
import { attemptCardDrawForYear } from '../lib/cards';
import {
  checkActionEligibility,
  calculateActionCost,
  checkFrequencyLimit,
  getSelectedOption,
  resolveActionEffects,
  actionRequiresPTO,
  ActionRow,
  PlayerForEligibility,
  ActionHistoryRecord,
} from '../lib/actions';
import { grantCertification, checkCertificationExpiry } from '../lib/certifications';
import { acquireHousing } from '../lib/housingActions';
import { acquireVehicle } from '../lib/vehicleActions';
import {
  GET_HOUSING_ACTION,
  GET_TRANSPORT_ACTION,
  resolveGetHousing,
  resolveGetTransportation,
  type ResolveHousingResult,
  type ResolveVehicleResult,
} from '../lib/acquisitionActions';
import type { HousingRow } from '../lib/housing';
import type { VehicleRow } from '../lib/vehicles';
import type { InflationRates } from '../lib/inflation';
import type { ParentContributions } from '../lib/playerInit';
import { getRequiredActions, type RequiredAction } from '../lib/actionRequirements';
import { getMandatoryExpensesTotal } from '../lib/expenses';
import { Prisma } from '@prisma/client';

const router = Router();

// ─── Prisma query helper ──────────────────────────────────────────────────────

type FullPlayer = NonNullable<Awaited<ReturnType<typeof fetchFullPlayer>>>;

// Extended player type that includes fields added after last Prisma client generation
interface ExtendedPlayer extends FullPlayer {
  childcarePlan: string;
  temporaryHealthDebt: number;
  employments: Array<
    FullPlayer['employments'][number] & { chosenLocation: string }
  >;
}

async function fetchFullPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
    include: {
      educations: { include: { program: true } },
      housingOwnerships: { include: { housing: true } },
      employments: { include: { job: true } },
      children: true,
      pets: true,
      vehicleOwnerships: { include: { vehicle: true } },
    },
  });
}

function asExtended(player: FullPlayer): ExtendedPlayer {
  return player as unknown as ExtendedPlayer;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a dollar amount for player-facing messages: thousands separators, and
 * cents only when the amount isn't a whole number (e.g. "$1,300" or "$1,172.50").
 */
function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return (
    '$' +
    rounded.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

function buildEligibilityPlayer(player: FullPlayer, currentYear?: number): PlayerForEligibility {
  const p = asExtended(player);
  return {
    age: p.age,
    health: p.health,
    skills: p.skills as Record<string, number>,
    traits: p.traits as Record<string, number>,
    certifications: p.certifications,
    currentYear: currentYear ?? 0,
    isRetired: p.isRetired,
    location: p.location,
    educations: p.educations.map((e) => ({
      isActive: e.isActive,
      graduated: e.graduated,
      programType: e.program.type,
    })),
    housingOwnerships: p.housingOwnerships.map((h) => ({
      endAge: h.endAge,
      housingName: h.housing.name,
      improvements: h.improvements,
    })),
    employments: p.employments.map((e) => ({
      isActive: e.isActive,
      job: { title: e.job.title },
      ptoRemaining: e.ptoRemaining,
      unpaidTimeOffRemaining: e.unpaidTimeOffRemaining,
    })),
    children: p.children.map((c) => ({
      age: c.age,
      hasChildren: c.hasChildren,
    })),
    vehicleOwnerships: p.vehicleOwnerships.map((v) => ({
      endAge: v.endAge,
      vehicle: { type: v.vehicle.type, passengerCapacity: v.vehicle.passengerCapacity },
    })),
  };
}

function getFamilySize(player: FullPlayer): number {
  let size = 1;
  if (player.maritalStatus === 'married') size += 1;
  size += player.children.filter((c) => c.age < 18).length;
  return size;
}

function getActiveJobTitles(player: FullPlayer): string[] {
  return player.employments.filter((e) => e.isActive).map((e) => e.job.title);
}

/** Purchase price / years owned of the player's current active home, for percent-of-home-value costs. */
function getHomeValueContext(player: FullPlayer): { originalHomeValue: number; yearsOwned: number } {
  const activeHome = player.housingOwnerships.find((h) => h.endAge === null);
  return {
    originalHomeValue: activeHome?.purchasePrice ?? 0,
    yearsOwned: activeHome?.yearsLived ?? 0,
  };
}

function playerHasBike(player: FullPlayer): boolean {
  return player.vehicleOwnerships.some(
    (v) => v.endAge === null && v.vehicle.type === 'bike',
  );
}

/** Actions the player MUST do this year (get housing / transportation). */
function computeRequiredActions(player: FullPlayer, currentYear: number): RequiredAction[] {
  const activeHousing = player.housingOwnerships.find((h) => h.endAge === null);
  const pc = player.parentContributions as ParentContributions | null;
  return getRequiredActions({
    currentYear,
    activeHousingType: activeHousing?.housing?.type ?? null,
    parentMaxAge: pc ? pc.maxParentAge : undefined,
    age: player.age,
    couchSurfYearsUsed:
      (player as unknown as { couchSurfYearsUsed?: number }).couchSurfYearsUsed ?? 0,
    hasVehicle: player.vehicleOwnerships.some((o) => o.endAge === null && !o.isSpouseVehicle),
  });
}

/** Annual rent of the cheapest rental in the catalog (for couch-surf eligibility). */
async function getCheapestRentAnnual(): Promise<number> {
  const rentals = await prisma.housing.findMany({
    where: { isRental: true, rentPerYear: { gt: 0 } },
    select: { rentPerYear: true },
  });
  return rentals.reduce(
    (m, r) => Math.min(m, r.rentPerYear ?? Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY,
  );
}

function getAvailableTimeBlocks(player: FullPlayer): number {
  const p = asExtended(player);
  const spouse = p.spouse as {
    jobId?: string | null;
    isJobPartTime?: boolean;
    educationProgramId?: string | null;
    isEduPartTime?: boolean;
  } | null;

  const breakdown = calculateTimeBlocks({
    employments: p.employments.map((e) => ({
      isActive: e.isActive,
      isPartTime: e.isPartTime,
      ptoUsed: 0,
      chosenLocation: e.chosenLocation,
      job: { timeBlocks: e.job.timeBlocks },
    })),
    educations: p.educations.map((e) => ({
      isActive: e.isActive,
      isPartTime: e.isPartTime,
      graduated: e.graduated,
    })),
    children: p.children.map((c) => ({ age: c.age })),
    pets: p.pets.map((pt) => ({ isAlive: pt.isAlive })),
    playerHousingLocation: p.location,
    playerHousingType: p.housingOwnerships.find((h) => h.endAge === null)?.housing?.type,
    spouse: spouse
      ? {
          jobId: spouse.jobId ?? null,
          isJobPartTime: spouse.isJobPartTime ?? false,
          educationProgramId: spouse.educationProgramId ?? null,
          isEduPartTime: spouse.isEduPartTime ?? false,
        }
      : null,
    childcarePlan: p.childcarePlan as Parameters<typeof calculateTimeBlocks>[0]['childcarePlan'],
  });

  return breakdown.activities;
}

function calculateLemonsEarned(
  action: ActionRow,
  timeBlocks: number,
  effectsOverride?: Record<string, unknown>,
): number {
  const effects = effectsOverride ?? ((action.effects ?? {}) as Record<string, unknown>);
  let lemons = 0;
  if (typeof effects.lemons === 'number') lemons += effects.lemons;
  if (typeof effects.lemonsPerBlock === 'number') lemons += effects.lemonsPerBlock * timeBlocks;
  if (typeof effects.lemonsPerTrip === 'number') lemons += effects.lemonsPerTrip;
  return lemons;
}

function calculateHealthDelta(
  action: ActionRow,
  timeBlocks: number,
  effectsOverride?: Record<string, unknown>,
): { temporary: number; permanent: number } {
  const effects = effectsOverride ?? ((action.effects ?? {}) as Record<string, unknown>);
  let temporary = 0;
  let permanent = 0;
  if (typeof effects.health === 'number') permanent += effects.health;
  if (typeof effects.healthPerBlock === 'number') temporary += effects.healthPerBlock * timeBlocks;
  return { temporary, permanent };
}

function calculateStressDelta(
  action: ActionRow,
  timeBlocks: number,
  effectsOverride?: Record<string, unknown>,
): number {
  const effects = effectsOverride ?? ((action.effects ?? {}) as Record<string, unknown>);
  let stress = 0;
  if (typeof effects.stress === 'number') stress += effects.stress;
  if (typeof effects.stressPerBlock === 'number') stress += effects.stressPerBlock * timeBlocks;
  return stress;
}

function calculateAttributeGains(
  action: ActionRow,
  timeBlocks: number,
  effectsOverride?: Record<string, unknown>,
): { skills: Record<string, number>; traits: Record<string, number> } {
  const effects = effectsOverride ?? ((action.effects ?? {}) as Record<string, unknown>);
  const skills: Record<string, number> = {};
  const traits: Record<string, number> = {};

  const SKILL_KEYS = ['math', 'science', 'art', 'music', 'writing', 'analysis', 'homeRepair', 'technology'];
  const TRAIT_KEYS = [
    'bravery', 'perseverance', 'charisma', 'compassion', 'creativity', 'organization',
    'patience', 'caution', 'sociability', 'stressTolerance', 'goodWithKids', 'physicalAbility', 'communication',
  ];

  for (const [key, val] of Object.entries(effects)) {
    const perBlockMatch = key.match(/^(\w+)PerBlock$/);
    if (perBlockMatch) {
      const attr = perBlockMatch[1]!;
      const amount = typeof val === 'number' ? val * timeBlocks : 0;
      if (SKILL_KEYS.includes(attr)) skills[attr] = (skills[attr] ?? 0) + amount;
      else if (TRAIT_KEYS.includes(attr)) traits[attr] = (traits[attr] ?? 0) + amount;
    }
    if (SKILL_KEYS.includes(key) && typeof val === 'number') {
      skills[key] = (skills[key] ?? 0) + val;
    }
    if (TRAIT_KEYS.includes(key) && typeof val === 'number') {
      traits[key] = (traits[key] ?? 0) + val;
    }
  }

  return { skills, traits };
}

/**
 * Resolve the authoritative activity/PTO blocks for a cart item. When the
 * selected option defines its own timeBlocks (e.g. Study Abroad's sightseeing
 * variants), that value wins over whatever the client submitted so cost/time
 * can't be desynced from the chosen variant.
 */
function resolveCartItemBlocks(
  action: ActionRow,
  item: { timeBlocks: number; ptoBlocks?: number; selectedOption?: string },
): { activityBlocks: number; ptoBlocks: number } {
  const opt = getSelectedOption(action, item.selectedOption);
  // Actions that don't allow PTO (e.g. school/gig actions) can't have any of
  // their blocks marked as PTO, regardless of what the client submits.
  const ptoBlocks = action.allowsPTO === false ? 0 : (item.ptoBlocks ?? 0);
  const activityBlocks =
    opt?.timeBlocks !== undefined
      ? opt.timeBlocks
      : item.timeBlocks > 0
        ? item.timeBlocks
        : Math.max(0, action.minTimeBlocks - ptoBlocks);
  return { activityBlocks, ptoBlocks };
}

/** Resolve the authoritative cost for a cart item, honoring a selected option's fixed cost override. */
function resolveCartItemCost(
  action: ActionRow,
  item: { selectedOption?: string },
  costInput: Omit<Parameters<typeof calculateActionCost>[0], 'action'>,
): number {
  const opt = getSelectedOption(action, item.selectedOption);
  if (opt?.cost !== undefined) return opt.cost;
  return calculateActionCost({ action, ...costInput });
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const listActionsSchema = z.object({
  gameSessionId: z.string().min(1),
  category: z.string().optional(),
  stressImpact: z.enum(['positive', 'negative', 'neutral']).optional(),
  healthImpact: z.enum(['positive', 'negative', 'neutral']).optional(),
  maxCost: z.coerce.number().optional(),
  maxTimeBlocks: z.coerce.number().optional(),
  eligibleOnly: z.coerce.boolean().optional(),
  location: z.string().optional(),
  showAll: z.coerce.boolean().optional(), // Req 47.3: bypass player-location default filter
  goodDeed: z.coerce.boolean().optional(),
  seniorDiscount: z.coerce.boolean().optional(),
  ptoRequired: z.coerce.boolean().optional(),
  sort: z.enum(['lemons_per_tb', 'lemons_per_dollar', 'cost_per_tb', 'min_cost']).optional(),
});

const executeActionsSchema = z.object({
  gameSessionId: z.string().min(1),
  actions: z
    .array(
      z.object({
        actionId: z.string().min(1),
        timeBlocks: z.number().int().min(0),
        ptoBlocks: z.number().int().min(0).default(0),
        selectedOption: z.string().optional(),
        // "Get Housing" / "Get Transportation" carry the chosen home / vehicle.
        selectedHousingId: z.string().optional(),
        housingLocation: z.enum(['city', 'suburb']).optional(),
        selectedVehicleId: z.string().optional(),
      }),
    )
    .min(1),
});

// Query-string transport: these arrive as JSON-encoded strings over GET, but may
// also be passed as real objects (e.g. from a JSON body), so accept either.
const jsonQueryRecord = <V extends z.ZodTypeAny>(valueSchema: V) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, z.record(z.string(), valueSchema)).optional();

const validateCartSchema = z.object({
  gameSessionId: z.string().min(1),
  actionIds: z.array(z.string().min(1)).min(1),
  quantities: jsonQueryRecord(z.number().int().min(1)),
  selectedOptions: jsonQueryRecord(z.string()),
  // actionId -> chosen housing / vehicle id for "Get Housing" / "Get Transportation"
  selectedHousingIds: jsonQueryRecord(z.string()),
  housingLocations: jsonQueryRecord(z.string()),
  selectedVehicleIds: jsonQueryRecord(z.string()),
});

// ─── GET /api/actions ─────────────────────────────────────────────────────────

router.get('/', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = listActionsSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const {
    gameSessionId,
    category,
    stressImpact,
    healthImpact,
    maxCost,
    maxTimeBlocks,
    eligibleOnly,
    location,
    goodDeed,
    seniorDiscount,
    ptoRequired,
    sort,
  } = result.data;

  try {
    const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
    if (!player) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    const allActions = (await prisma.action.findMany()) as unknown as ActionRow[];
    const session = await prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      select: { currentYear: true },
    });
    const currentYear = session?.currentYear ?? 0;
    const eligPlayer = buildEligibilityPlayer(player, currentYear);
    const familySize = getFamilySize(player);
    const jobTitles = getActiveJobTitles(player);
    const hasBike = playerHasBike(player);
    const homeValueContext = getHomeValueContext(player);

    let actions = allActions;

    if (category) {
      actions = actions.filter((a) => (a.category as string[]).includes(category));
    }

    if (seniorDiscount === true) {
      actions = actions.filter((a) => a.seniorDiscount);
    }

    if (ptoRequired === true) {
      actions = actions.filter((a) => {
        const reqs = (a.requirements ?? {}) as Record<string, unknown>;
        return (
          a.requiresPTO === true ||
          reqs.hasPTOOrUnpaidTimeBlocks === true ||
          reqs.hasPTODaysAvailable === true ||
          (typeof reqs.ptoOrUnpaidTimeBlocks === 'number' && reqs.ptoOrUnpaidTimeBlocks > 0)
        );
      });
    }

    if (goodDeed === true) {
      actions = actions.filter((a) => {
        const effects = (a.effects ?? {}) as Record<string, unknown>;
        return effects.isGoodDeedOpportunity === true;
      });
    }

    if (location) {
      actions = actions.filter((a) => {
        const reqs = (a.requirements ?? {}) as { location?: string };
        return !reqs.location || reqs.location === 'both' || reqs.location === location;
      });
    }

    if (maxCost !== undefined) {
      actions = actions.filter((a) => {
        const cost = calculateActionCost({
          action: a,
          timeBlocks: a.minTimeBlocks,
          familySize,
          playerAge: player.age,
          playerJobTitles: jobTitles,
          hasInsurance: player.hasHealthInsurance,
          hasBike,
          ...homeValueContext,
        });
        return cost <= maxCost;
      });
    }

    if (maxTimeBlocks !== undefined) {
      actions = actions.filter((a) => a.minTimeBlocks <= maxTimeBlocks);
    }

    if (stressImpact) {
      actions = actions.filter((a) => {
        const delta = calculateStressDelta(a, a.minTimeBlocks);
        if (stressImpact === 'positive') return delta < 0;          // decreases stress
        if (stressImpact === 'neutral') return delta <= 0;          // does not increase stress
        if (stressImpact === 'negative') return delta > 0;
        return true;
      });
    }

    if (healthImpact) {
      actions = actions.filter((a) => {
        const { temporary, permanent } = calculateHealthDelta(a, a.minTimeBlocks);
        const total = temporary + permanent;
        if (healthImpact === 'positive') return total > 0;          // increases health
        if (healthImpact === 'neutral') return total >= 0;          // does not decrease health
        if (healthImpact === 'negative') return total < 0;
        return true;
      });
    }

    const annotated = actions.map((a) => {
      const eligResult = checkActionEligibility(a, eligPlayer);
      const cost = calculateActionCost({
        action: a,
        timeBlocks: a.minTimeBlocks,
        familySize,
        playerAge: player.age,
        playerJobTitles: jobTitles,
        hasInsurance: player.hasHealthInsurance,
        hasBike,
        ...homeValueContext,
      });
      const lemons = calculateLemonsEarned(a, a.minTimeBlocks);
      return {
        ...a,
        requiresPTO: actionRequiresPTO(a, eligPlayer),
        eligible: eligResult.eligible,
        eligibilityReasons: eligResult.reasons,
        calculatedCost: cost,
        calculatedLemons: lemons,
      };
    });

    const filtered = eligibleOnly ? annotated.filter((a) => a.eligible) : annotated;

    if (sort) {
      filtered.sort((a, b) => {
        const tbA = Math.max(a.minTimeBlocks, 1);
        const tbB = Math.max(b.minTimeBlocks, 1);
        const costA = Math.max(a.calculatedCost, 1);
        const costB = Math.max(b.calculatedCost, 1);
        switch (sort) {
          case 'lemons_per_tb':
            return b.calculatedLemons / tbB - a.calculatedLemons / tbA;
          case 'lemons_per_dollar':
            return b.calculatedLemons / costB - a.calculatedLemons / costA;
          case 'cost_per_tb':
            return costA / tbA - costB / tbB;
          case 'min_cost':
            return a.calculatedCost - b.calculatedCost;
          default:
            return 0;
        }
      });
    }

    res.json({ actions: filtered });
  } catch (err) {
    console.error('[actions/list]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/actions/search ──────────────────────────────────────────────────

router.get('/search', authorize, async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string | undefined)?.trim();
  const gameSessionId = req.query.gameSessionId as string | undefined;

  if (!q) {
    res.status(400).json({ error: 'q query parameter is required' });
    return;
  }

  try {
    const dbActions = await prisma.action.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
    });

    const actions = dbActions as unknown as ActionRow[];

    if (gameSessionId && req.user) {
      const player = await fetchFullPlayer(req.user.userId, gameSessionId);
      if (player) {
        const sessionForYear = await prisma.gameSession.findUnique({
          where: { id: gameSessionId },
          select: { currentYear: true },
        });
        const eligPlayer = buildEligibilityPlayer(player, sessionForYear?.currentYear ?? 0);
        const familySize = getFamilySize(player);
        const jobTitles = getActiveJobTitles(player);
        const hasBike = playerHasBike(player);
        const homeValueContext = getHomeValueContext(player);

        const annotated = actions.map((a) => {
          const eligResult = checkActionEligibility(a, eligPlayer);
          const cost = calculateActionCost({
            action: a,
            timeBlocks: a.minTimeBlocks,
            familySize,
            playerAge: player.age,
            playerJobTitles: jobTitles,
            hasInsurance: player.hasHealthInsurance,
            hasBike,
            ...homeValueContext,
          });
          return {
            ...a,
            requiresPTO: actionRequiresPTO(a, eligPlayer),
            eligible: eligResult.eligible,
            eligibilityReasons: eligResult.reasons,
            calculatedCost: cost,
          };
        });
        res.json({ actions: annotated });
        return;
      }
    }

    res.json({ actions });
  } catch (err) {
    console.error('[actions/search]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/actions/cart/validate ──────────────────────────────────────────

router.get(
  '/cart/validate',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const bodyOrQuery = Object.keys(req.body ?? {}).length > 0 ? req.body : req.query;
    const result = validateCartSchema.safeParse(bodyOrQuery);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const {
      gameSessionId,
      actionIds,
      quantities,
      selectedOptions,
      selectedHousingIds,
      housingLocations,
      selectedVehicleIds,
    } = result.data;

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      const dbActions = await prisma.action.findMany({ where: { id: { in: actionIds } } });
      const actions = dbActions as unknown as ActionRow[];

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true, inflationRates: true },
      });
      const currentYear = session?.currentYear ?? 0;
      const cheapestRentAnnual = await getCheapestRentAnnual();
      const couchYears = (player as unknown as { couchSurfYearsUsed?: number }).couchSurfYearsUsed ?? 0;

      const eligPlayer = buildEligibilityPlayer(player, currentYear);
      const familySize = getFamilySize(player);
      const jobTitles = getActiveJobTitles(player);
      const hasBike = playerHasBike(player);
      const homeValueContext = getHomeValueContext(player);
      const availableTimeBlocks = getAvailableTimeBlocks(player);
      // Affordability is based on actual cash on hand, not projected future income —
      // otherwise checkout could succeed and drive the player's real balance negative.
      const availableMoney = player.money;
      let totalTimeBlocks = 0;
      let totalCost = 0;
      const errors: string[] = [];
      const resolvedHousing: Array<Extract<ResolveHousingResult, { housing: HousingRow }>> = [];
      const resolvedVehicles: Array<Extract<ResolveVehicleResult, { vehicle: VehicleRow }>> = [];

      for (const actionId of actionIds) {
        const action = actions.find((a) => a.id === actionId);
        if (!action) {
          errors.push(`Action ${actionId} not found`);
          continue;
        }

        const qty = quantities?.[actionId] ?? 1;
        const selectedOption = selectedOptions?.[actionId];
        const { activityBlocks: tb } = resolveCartItemBlocks(action, { timeBlocks: 0, selectedOption });

        const eligResult = checkActionEligibility(action, eligPlayer);
        if (!eligResult.eligible) {
          errors.push(`${action.name}: ${eligResult.reasons[0]}`);
        }

        // "Get Housing" / "Get Transportation" — validate the chosen home / vehicle
        if (action.name === GET_HOUSING_ACTION) {
          const housing = selectedHousingIds?.[actionId]
            ? ((await prisma.housing.findUnique({ where: { id: selectedHousingIds[actionId] } })) as unknown as HousingRow | null)
            : null;
          const r = resolveGetHousing({
            housing,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            player: { ...(player as any), couchSurfYearsUsed: couchYears },
            cheapestRentAnnual,
            projectedIncome: player.projectedIncome,
            requestedLocation: housingLocations?.[actionId],
            inflationRates: (session?.inflationRates as unknown as InflationRates[]) ?? [],
            currentYear,
          });
          if ('error' in r) errors.push(r.error);
          else resolvedHousing.push(r);
        } else if (action.name === GET_TRANSPORT_ACTION) {
          const vehicle = selectedVehicleIds?.[actionId]
            ? ((await prisma.vehicle.findUnique({ where: { id: selectedVehicleIds[actionId] } })) as unknown as VehicleRow | null)
            : null;
          const r = resolveGetTransportation({
            vehicle,
            player: {
              age: player.age,
              location: player.location,
              maritalStatus: player.maritalStatus,
              children: player.children.map((c) => ({ age: c.age })),
              spouse: player.spouse,
              employments: player.employments.map((e) => ({
                isActive: e.isActive,
                job: { title: e.job.title, benefits: e.job.benefits },
              })),
              money: player.money,
              vehicleOwnerships: player.vehicleOwnerships.map((o) => ({
                id: o.id,
                endAge: o.endAge,
                isSpouseVehicle: o.isSpouseVehicle,
              })),
            },
          });
          if ('error' in r) errors.push(r.error);
          else resolvedVehicles.push(r);
        }

        const history = await prisma.actionHistory.findUnique({
          where: { playerId_actionId_year: { playerId: player.id, actionId, year: currentYear } },
        });
        const freqError = checkFrequencyLimit(action, history as ActionHistoryRecord | null);
        if (freqError) errors.push(freqError);

        const cost = resolveCartItemCost(action, { selectedOption }, {
          timeBlocks: tb,
          familySize,
          playerAge: player.age,
          playerJobTitles: jobTitles,
          hasInsurance: player.hasHealthInsurance,
          hasBike,
          ...homeValueContext,
        });

        totalTimeBlocks += tb * qty;
        totalCost += cost * qty;
      }

      // Reserve time blocks for required actions not yet in the cart.
      const requiredActions = computeRequiredActions(player, currentYear);
      const cartActionNames = new Set(
        actionIds.map((id) => actions.find((a) => a.id === id)?.name).filter(Boolean) as string[],
      );
      const unmetRequired = requiredActions.filter((r) => !cartActionNames.has(r.actionName));
      const reservedBlocks = unmetRequired.reduce((s, r) => s + r.blocks, 0);

      if (totalTimeBlocks + reservedBlocks > availableTimeBlocks) {
        if (reservedBlocks > 0) {
          errors.push(
            `${reservedBlocks} time block${reservedBlocks === 1 ? ' is' : 's are'} set aside for a required action (${unmetRequired
              .map((r) => r.actionName)
              .join(', ')}). Remove something from your plan or add that action.`,
          );
        } else {
          errors.push(
            `This cart uses ${totalTimeBlocks} time blocks, but you only have ${availableTimeBlocks} available. Reduce or remove an item to continue.`,
          );
        }
      }
      // "Get Housing"/"Get Transportation" can't be done more than once a year.
      for (const actionId of actionIds) {
        const action = actions.find((a) => a.id === actionId);
        if (
          action &&
          (action.name === GET_HOUSING_ACTION || action.name === GET_TRANSPORT_ACTION) &&
          (quantities?.[actionId] ?? 1) > 1
        ) {
          errors.push(`${action.name} can only be done once per year.`);
        }
      }

      // Combined up-front cost: action costs + home purchase + vehicle purchase,
      // minus proceeds from selling the player's current owned home.
      const housingUpFront = resolvedHousing.reduce((s, r) => s + r.purchasePrice - r.saleProceeds, 0);
      const vehiclePurchase = resolvedVehicles.reduce((s, r) => s + r.purchasePrice, 0);
      const upFront = totalCost + Math.max(0, housingUpFront) + vehiclePurchase;
      if (Math.max(0, housingUpFront) + vehiclePurchase > 0) {
        if (upFront > availableMoney) {
          errors.push(
            `Your plan needs ${formatMoney(upFront)} up front (including the home / vehicle purchase). You have ${formatMoney(availableMoney)} — take a loan on the Finances page to cover the rest.`,
          );
        }
      } else if (totalCost > availableMoney) {
        errors.push(
          `This cart costs ${formatMoney(totalCost)}, but you only have ${formatMoney(availableMoney)}. Reduce or remove an item to continue.`,
        );
      }

      res.json({
        valid: errors.length === 0,
        totalTimeBlocks,
        availableTimeBlocks,
        totalCost,
        availableMoney,
        errors,
        requiredActions,
        reservedBlocks,
      });
    } catch (err) {
      console.error('[actions/cart/validate]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/actions/recommended ────────────────────────────────────────────
// Lightweight "you should probably do this" list for the Actions page.

router.get('/recommended', authorize, async (req: Request, res: Response): Promise<void> => {
  const gameSessionId = req.query.gameSessionId as string | undefined;
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
    const session = await prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      select: { currentYear: true },
    });
    const currentYear = session?.currentYear ?? 0;

    const recs: Array<{ actionName: string; reason: string; severity: 'info' | 'warning'; link: string }> = [];

    // Required this year → strongly recommend.
    for (const r of computeRequiredActions(player, currentYear)) {
      recs.push({ actionName: r.actionName, reason: r.reason, severity: 'warning', link: '/actions' });
    }

    // No job + projected to end the year in the red → find a job.
    const hasJob = player.employments.some((e) => e.isActive);
    const spouse = player.spouse as { salary?: number } | null;
    const spouseIncome = player.maritalStatus === 'married' ? (spouse?.salary ?? 0) : 0;
    if (!hasJob && spouseIncome === 0) {
      const mandatoryExpenses = await getMandatoryExpensesTotal(player.id);
      const projectedEndOfYear = player.money + player.projectedIncome - mandatoryExpenses;
      if (projectedEndOfYear < 1000) {
        recs.push({
          actionName: 'Find a Job',
          reason:
            projectedEndOfYear < 0
              ? `After this year's expenses you're projected to be ${formatMoney(-projectedEndOfYear)} in the hole — you need income.`
              : "Money will be tight after this year's expenses — a job would give you breathing room.",
          severity: 'warning',
          link: '/jobs',
        });
      }
    }

    // Expired CPR → renew it (needed for some jobs and actions).
    if (checkCertificationExpiry(player, currentYear).some((c) => c.type === 'cpr')) {
      recs.push({
        actionName: 'Get CPR Certification',
        reason: 'Your CPR certification has expired — renew it to stay eligible for the jobs and actions that require it.',
        severity: 'info',
        link: '/actions',
      });
    }

    // Idle activity blocks → relax (avoids wasting the year).
    const availableBlocks = getAvailableTimeBlocks(player);
    if (availableBlocks >= 4) {
      recs.push({
        actionName: 'Relax',
        reason: `You have ${availableBlocks} unused time blocks — spend them on something before the year ends.`,
        severity: 'info',
        link: '/actions',
      });
    }

    res.json({ recommendations: recs });
  } catch (err) {
    console.error('[actions/recommended]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/actions/execute ────────────────────────────────────────────────

router.post(
  '/execute',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = executeActionsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, actions: cartItems } = result.data;
    const middlewarePlayer = req.player!;

    if (middlewarePlayer.gameSessionId !== gameSessionId) {
      res.status(403).json({ error: 'Player does not belong to this session' });
      return;
    }

    try {
      const player = await fetchFullPlayer(req.user!.userId, gameSessionId);
      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: {
          currentYear: true,
          inflationRates: true,
          pitcherCurrentLemons: true,
          pitcherContributionsByPlayer: true,
          pitcherYearlyGoal: true,
        },
      });
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const currentYear = session.currentYear;
      const eligPlayer = buildEligibilityPlayer(player, currentYear);
      const familySize = getFamilySize(player);
      const jobTitles = getActiveJobTitles(player);
      const hasBike = playerHasBike(player);
      const homeValueContext = getHomeValueContext(player);
      const availableTimeBlocks = getAvailableTimeBlocks(player);
      // Affordability is based on actual cash on hand, not projected future income —
      // otherwise checkout could succeed and drive the player's real balance negative.
      const availableMoney = player.money;

      // ── Pre-validate ──────────────────────────────────────────────────────

      const actionIds = cartItems.map((c) => c.actionId);
      const dbActions = await prisma.action.findMany({ where: { id: { in: actionIds } } });
      const actionMap = new Map(
        (dbActions as unknown as ActionRow[]).map((a) => [a.id, a]),
      );

      const historyRecords = await prisma.actionHistory.findMany({
        where: { playerId: player.id, year: currentYear, actionId: { in: actionIds } },
      });
      const historyMap = new Map(
        (historyRecords as unknown as ActionHistoryRecord[]).map((h) => [h.actionId, h]),
      );

      const validationErrors: string[] = [];
      let totalTimeBlocks = 0;
      let totalPtoBlocks = 0;
      let totalCost = 0;

      // Reject doing a "once per year" action more than once in a single checkout
      // (the frontend expands cart quantity into repeated entries).
      const perActionCount = new Map<string, number>();
      for (const item of cartItems) {
        perActionCount.set(item.actionId, (perActionCount.get(item.actionId) ?? 0) + 1);
      }
      for (const [aid, n] of perActionCount) {
        const a = actionMap.get(aid);
        if (n > 1 && a && ['once_per_year', 'once_per_two_years'].includes(a.frequency)) {
          validationErrors.push(`${a.name} can only be done once${a.frequency === 'once_per_two_years' ? ' every two years' : ' per year'}.`);
        }
      }

      // Total PTO available across all active employments
      const totalPtoAvailable = player.employments
        .filter((e) => e.isActive)
        .reduce((sum, e) => sum + e.ptoRemaining, 0);

      for (const item of cartItems) {
        const action = actionMap.get(item.actionId);
        if (!action) {
          validationErrors.push(`Action ${item.actionId} not found`);
          continue;
        }

        const eligResult = checkActionEligibility(action, eligPlayer);
        if (!eligResult.eligible) {
          validationErrors.push(`${action.name}: ${eligResult.reasons.join('; ')}`);
        }

        const history = historyMap.get(item.actionId) ?? null;
        const freqError = checkFrequencyLimit(action, history);
        if (freqError) validationErrors.push(freqError);

        const userInput = action.userInput as { options?: Array<{ value: string }> } | null;
        if (userInput?.options?.length && !getSelectedOption(action, item.selectedOption)) {
          validationErrors.push(`${action.name}: a plan must be selected`);
        }

        const { activityBlocks: tb, ptoBlocks } = resolveCartItemBlocks(action, item);
        const totalItemBlocks = tb + ptoBlocks;

        if (action.minTimeBlocks > 0 && totalItemBlocks < action.minTimeBlocks) {
          validationErrors.push(`${action.name}: minimum ${action.minTimeBlocks} time blocks required`);
        }
        if (action.maxTimeBlocks !== null && totalItemBlocks > action.maxTimeBlocks) {
          validationErrors.push(`${action.name}: maximum ${action.maxTimeBlocks} time blocks allowed`);
        }

        // Required-PTO actions must use PTO (unless the player is exempt — no job, not in school)
        const requiresPTO = actionRequiresPTO(action, eligPlayer);
        if (requiresPTO && ptoBlocks < action.minTimeBlocks) {
          validationErrors.push(`${action.name}: requires PTO blocks`);
        }

        totalTimeBlocks += tb;
        totalPtoBlocks += ptoBlocks;
        totalCost += resolveCartItemCost(action, item, {
          timeBlocks: totalItemBlocks,
          familySize,
          playerAge: player.age,
          playerJobTitles: jobTitles,
          hasInsurance: player.hasHealthInsurance,
          hasBike,
          ...homeValueContext,
        });
      }

      // Reserve time blocks for required actions not being done in this checkout.
      const requiredActions = computeRequiredActions(player, currentYear);
      const cartActionNames = new Set(
        cartItems.map((c) => actionMap.get(c.actionId)?.name).filter(Boolean) as string[],
      );
      const unmetRequired = requiredActions.filter((r) => !cartActionNames.has(r.actionName));
      const reservedBlocks = unmetRequired.reduce((s, r) => s + r.blocks, 0);

      if (totalTimeBlocks + reservedBlocks > availableTimeBlocks) {
        validationErrors.push(
          reservedBlocks > 0
            ? `${reservedBlocks} time block${reservedBlocks === 1 ? ' is' : 's are'} set aside for a required action (${unmetRequired
                .map((r) => r.actionName)
                .join(', ')}). Remove something or add that action to your plan.`
            : `This cart uses ${totalTimeBlocks} time blocks, but you only have ${availableTimeBlocks} available. Reduce or remove an item to continue.`,
        );
      }
      if (totalPtoBlocks > totalPtoAvailable) {
        validationErrors.push(
          `This cart uses ${totalPtoBlocks} PTO blocks, but you only have ${totalPtoAvailable} available. Reduce or remove an item to continue.`,
        );
      }
      if (totalCost > availableMoney) {
        validationErrors.push(
          `This cart costs ${formatMoney(totalCost)}, but you only have ${formatMoney(availableMoney)}. Reduce or remove an item to continue.`,
        );
      }

      // ── "Get Housing" / "Get Transportation" — resolve the player's choice ──
      const housingResolved = new Map<string, Extract<ResolveHousingResult, { housing: HousingRow }>>();
      const vehicleResolved = new Map<string, Extract<ResolveVehicleResult, { vehicle: VehicleRow }>>();
      {
        const cheapestRentAnnual = await getCheapestRentAnnual();
        const couchYears = (player as unknown as { couchSurfYearsUsed?: number }).couchSurfYearsUsed ?? 0;
        for (const item of cartItems) {
          const action = actionMap.get(item.actionId);
          if (!action) continue;
          if (action.name === GET_HOUSING_ACTION) {
            const housing = item.selectedHousingId
              ? ((await prisma.housing.findUnique({ where: { id: item.selectedHousingId } })) as unknown as HousingRow | null)
              : null;
            const r = resolveGetHousing({
              housing,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              player: { ...(player as any), couchSurfYearsUsed: couchYears },
              cheapestRentAnnual,
              projectedIncome: player.projectedIncome,
              requestedLocation: item.housingLocation,
              inflationRates: (session.inflationRates as unknown as InflationRates[]) ?? [],
              currentYear,
            });
            if ('error' in r) validationErrors.push(r.error);
            else housingResolved.set(item.actionId, r);
          } else if (action.name === GET_TRANSPORT_ACTION) {
            const vehicle = item.selectedVehicleId
              ? ((await prisma.vehicle.findUnique({ where: { id: item.selectedVehicleId } })) as unknown as VehicleRow | null)
              : null;
            const r = resolveGetTransportation({
              vehicle,
              player: {
                age: player.age,
                location: player.location,
                maritalStatus: player.maritalStatus,
                children: player.children.map((c) => ({ age: c.age })),
                spouse: player.spouse,
                employments: player.employments.map((e) => ({
                  isActive: e.isActive,
                  job: { title: e.job.title, benefits: e.job.benefits },
                })),
                money: player.money,
                vehicleOwnerships: player.vehicleOwnerships.map((o) => ({
                  id: o.id,
                  endAge: o.endAge,
                  isSpouseVehicle: o.isSpouseVehicle,
                })),
              },
            });
            if ('error' in r) validationErrors.push(r.error);
            else vehicleResolved.set(item.actionId, r);
          }
        }

        // Combined up-front cost: action costs + home purchase + vehicle purchase,
        // minus proceeds from selling the player's current owned home.
        const housingUpFront = [...housingResolved.values()].reduce(
          (s, r) => s + r.purchasePrice - r.saleProceeds,
          0,
        );
        const vehiclePurchase = [...vehicleResolved.values()].reduce((s, r) => s + r.purchasePrice, 0);
        const extraUpFront = Math.max(0, housingUpFront) + vehiclePurchase;
        if (extraUpFront > 0 && totalCost + extraUpFront > availableMoney) {
          validationErrors.push(
            `Your plan needs ${formatMoney(totalCost + extraUpFront)} up front (including the home / vehicle purchase). You have ${formatMoney(availableMoney)} — take a loan on the Finances page first.`,
          );
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({ errors: validationErrors });
        return;
      }

      // ── Apply effects ─────────────────────────────────────────────────────

      let totalLemonsEarned = 0;
      let healthDeltaTemp = 0;
      let healthDeltaPerm = 0;
      let stressDelta = 0;
      const skillGains: Record<string, number> = {};
      const traitGains: Record<string, number> = {};

      // Compute all deltas before the transaction
      for (const item of cartItems) {
        const action = actionMap.get(item.actionId)!;
        const { activityBlocks, ptoBlocks } = resolveCartItemBlocks(action, item);
        const tb = activityBlocks + ptoBlocks;
        const itemEffects = resolveActionEffects(action, item.selectedOption);

        totalLemonsEarned += calculateLemonsEarned(action, tb, itemEffects);
        const { temporary, permanent } = calculateHealthDelta(action, tb, itemEffects);
        healthDeltaTemp += temporary;
        healthDeltaPerm += permanent;
        stressDelta += calculateStressDelta(action, tb, itemEffects);

        const { skills, traits } = calculateAttributeGains(action, tb, itemEffects);
        for (const [k, v] of Object.entries(skills)) skillGains[k] = (skillGains[k] ?? 0) + v;
        for (const [k, v] of Object.entries(traits)) traitGains[k] = (traitGains[k] ?? 0) + v;
      }

      // Compute new health values
      const ep = asExtended(player);
      const chronicCount = (ep.chronicConditions as string[]).length;
      let newHealth = ep.health;
      let newMaxHealth = ep.maxHealth;
      let newTempDebt = ep.temporaryHealthDebt;

      if (healthDeltaTemp > 0) {
        const gain = chronicCount > 0 ? Math.ceil(healthDeltaTemp * 0.8) : healthDeltaTemp;
        newHealth = Math.min(newHealth + gain, newMaxHealth);
      } else if (healthDeltaTemp < 0) {
        const actualLoss = Math.min(-healthDeltaTemp, newHealth);
        newHealth = Math.max(0, newHealth + healthDeltaTemp);
        newTempDebt += actualLoss;
      }

      if (healthDeltaPerm > 0) {
        newMaxHealth = Math.min(100, newMaxHealth + healthDeltaPerm);
        const gain = chronicCount > 0 ? Math.ceil(healthDeltaPerm * 0.8) : healthDeltaPerm;
        newHealth = Math.min(newHealth + gain, newMaxHealth);
      } else if (healthDeltaPerm < 0) {
        newMaxHealth = Math.max(0, newMaxHealth + healthDeltaPerm);
        newHealth = Math.max(0, Math.min(newHealth + healthDeltaPerm, newMaxHealth));
      }

      // Compute new skills/traits
      const currentSkills = player.skills as Record<string, number>;
      const currentTraits = player.traits as Record<string, number>;
      const newSkills = { ...currentSkills };
      const newTraits = { ...currentTraits };
      for (const [k, v] of Object.entries(skillGains)) {
        newSkills[k] = Math.min(100, Math.max(0, (newSkills[k] ?? 0) + v));
      }
      for (const [k, v] of Object.entries(traitGains)) {
        newTraits[k] = Math.min(100, Math.max(0, (newTraits[k] ?? 0) + v));
      }

      const newStress = Math.min(100, Math.max(0, ep.stress + stressDelta));

      // Grant CPR certification if "Get CPR Certification" action is in the cart (Req 43.5)
      let newCertifications: unknown = player.certifications;
      const hasCprAction = cartItems.some((item) => {
        const action = actionMap.get(item.actionId);
        return action?.name === 'Get CPR Certification';
      });
      if (hasCprAction) {
        newCertifications = grantCertification(
          { certifications: player.certifications },
          'cpr',
          currentYear,
        );
      }

      // Pitcher contributions
      const contributions = (session.pitcherContributionsByPlayer ?? {}) as Record<string, number>;
      if (totalLemonsEarned > 0) {
        contributions[player.id] = (contributions[player.id] ?? 0) + totalLemonsEarned;
      }

      await prisma.$transaction(async (tx) => {
        // Upsert action history for each cart item
        for (const item of cartItems) {
          const action = actionMap.get(item.actionId)!;
          const { activityBlocks, ptoBlocks } = resolveCartItemBlocks(action, item);
          const tb = activityBlocks + ptoBlocks;
          const cost = resolveCartItemCost(action, item, {
            timeBlocks: tb,
            familySize,
            playerAge: player.age,
            playerJobTitles: jobTitles,
            hasInsurance: player.hasHealthInsurance,
            hasBike,
            ...homeValueContext,
          });
          const lemons = calculateLemonsEarned(action, tb, resolveActionEffects(action, item.selectedOption));

          await tx.actionHistory.upsert({
            where: {
              playerId_actionId_year: {
                playerId: player.id,
                actionId: action.id,
                year: currentYear,
              },
            },
            create: {
              playerId: player.id,
              actionId: action.id,
              year: currentYear,
              count: 1,
              totalCost: cost,
              totalTimeBlocks: tb,
              lemonsEarned: lemons,
            },
            update: {
              count: { increment: 1 },
              totalCost: { increment: cost },
              totalTimeBlocks: { increment: tb },
              lemonsEarned: { increment: lemons },
            },
          });
        }

        // ── Acquire housing / vehicles for "Get Housing" / "Get Transportation" ──
        // Stress from these is already in the action effects, so applyMoveStress
        // / applyChangeStress are false here.
        for (const [, r] of housingResolved) {
          await acquireHousing(tx, {
            player,
            housing: r.housing,
            housingId: r.housing.id,
            resolvedLocation: r.resolvedLocation,
            currentOwnership: r.currentOwnership,
            inflationRates: (session.inflationRates as unknown as InflationRates[]) ?? [],
            currentYear,
            applyMoveStress: false,
          });
        }
        for (const [, r] of vehicleResolved) {
          await acquireVehicle(tx, {
            player: { id: player.id, age: player.age },
            vehicleId: r.vehicle.id,
            vehicleType: r.vehicle.type,
            purchasePrice: r.purchasePrice,
            forSpouse: false,
            currentOwnershipId: r.currentOwnershipId,
            applyChangeStress: false,
          });
        }

        // Deduct PTO from employments (distribute across active employments in order)
        if (totalPtoBlocks > 0) {
          let ptoToDeduct = totalPtoBlocks;
          const activeEmployments = player.employments.filter((e) => e.isActive && e.ptoRemaining > 0);
          for (const emp of activeEmployments) {
            if (ptoToDeduct <= 0) break;
            const deduct = Math.min(ptoToDeduct, emp.ptoRemaining);
            await tx.employment.update({
              where: { id: emp.id },
              data: {
                ptoRemaining: { decrement: deduct },
                ptoUsed: { increment: deduct },
              },
            });
            ptoToDeduct -= deduct;
          }
        }

        // Update player state
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: { decrement: totalCost },
            health: newHealth,
            maxHealth: newMaxHealth,
            ...(({ temporaryHealthDebt: newTempDebt }) as Record<string, unknown>),
            stress: newStress,
            totalLemonsEarned: { increment: totalLemonsEarned },
            skills: newSkills,
            traits: newTraits,
            certifications: newCertifications as Prisma.InputJsonValue,
          } as Parameters<typeof tx.player.update>[0]['data'],
        });

        // Update session pitcher
        if (totalLemonsEarned > 0) {
          await tx.gameSession.update({
            where: { id: gameSessionId },
            data: {
              pitcherCurrentLemons: { increment: totalLemonsEarned },
              pitcherContributionsByPlayer: contributions,
            },
          });
        }
      });

      // ── Broadcast WebSocket events ────────────────────────────────────────

      const io = getIO();

      if (totalLemonsEarned > 0) {
        const updatedSession = await prisma.gameSession.findUnique({
          where: { id: gameSessionId },
          select: { pitcherCurrentLemons: true, pitcherYearlyGoal: true },
        });
        io.to(`game:${gameSessionId}`).emit('lemonAdded', {
          playerId: player.id,
          lemonsAdded: totalLemonsEarned,
          totalLemons: updatedSession?.pitcherCurrentLemons ?? 0,
          pitcherGoal: updatedSession?.pitcherYearlyGoal ?? 0,
        });
      }

      const updatedPlayer = await prisma.player.findUnique({
        where: { id: player.id },
        select: {
          money: true,
          health: true,
          maxHealth: true,
          stress: true,
          age: true,
          isAlive: true,
          isRetired: true,
          yearComplete: true,
          totalLemonsEarned: true,
        },
      });

      io.to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: updatedPlayer ?? {},
      });

      // ── Attempt card draw ─────────────────────────────────────────────────

      const cardPlayer = await prisma.player.findUnique({
        where: { id: player.id },
        include: {
          vehicleOwnerships: { select: { endAge: true, vehicle: { select: { type: true } } } },
          housingOwnerships: { select: { endAge: true, housing: { select: { type: true } } } },
          children: { select: { age: true } },
          pets: { select: { isAlive: true } },
        },
      });

      if (cardPlayer) {
        await attemptCardDrawForYear(
          {
            id: cardPlayer.id,
            age: cardPlayer.age,
            location: cardPlayer.location,
            cardsReceivedThisYear: cardPlayer.cardsReceivedThisYear,
            gameSessionId: cardPlayer.gameSessionId,
            vehicleOwnerships: cardPlayer.vehicleOwnerships,
            housingOwnerships: cardPlayer.housingOwnerships,
            children: cardPlayer.children,
            pets: cardPlayer.pets,
          },
          prisma,
          io,
          gameSessionId,
          currentYear,
        );
      }

      res.json({
        success: true,
        lemonsEarned: totalLemonsEarned,
        healthChange: { temporary: healthDeltaTemp, permanent: healthDeltaPerm },
        stressChange: stressDelta,
        skillGains,
        traitGains,
        totalCost,
        totalTimeBlocks,
      });
    } catch (err) {
      console.error('[actions/execute]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
