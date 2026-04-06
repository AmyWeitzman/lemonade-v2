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
  ActionRow,
  PlayerForEligibility,
  ActionHistoryRecord,
} from '../lib/actions';
import { grantCertification } from '../lib/certifications';
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
      educations: true,
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
    })),
    housingOwnerships: p.housingOwnerships.map((h) => ({
      endAge: h.endAge,
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

function playerHasBike(player: FullPlayer): boolean {
  return player.vehicleOwnerships.some(
    (v) => v.endAge === null && v.vehicle.type === 'bike',
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

function calculateLemonsEarned(action: ActionRow, timeBlocks: number): number {
  const effects = (action.effects ?? {}) as Record<string, unknown>;
  let lemons = 0;
  if (typeof effects.lemons === 'number') lemons += effects.lemons;
  if (typeof effects.lemonsPerBlock === 'number') lemons += effects.lemonsPerBlock * timeBlocks;
  if (typeof effects.lemonsPerTrip === 'number') lemons += effects.lemonsPerTrip;
  return lemons;
}

function calculateHealthDelta(
  action: ActionRow,
  timeBlocks: number,
): { temporary: number; permanent: number } {
  const effects = (action.effects ?? {}) as Record<string, unknown>;
  let temporary = 0;
  let permanent = 0;
  if (typeof effects.health === 'number') permanent += effects.health;
  if (typeof effects.healthPerBlock === 'number') temporary += effects.healthPerBlock * timeBlocks;
  return { temporary, permanent };
}

function calculateStressDelta(action: ActionRow, timeBlocks: number): number {
  const effects = (action.effects ?? {}) as Record<string, unknown>;
  let stress = 0;
  if (typeof effects.stress === 'number') stress += effects.stress;
  if (typeof effects.stressPerBlock === 'number') stress += effects.stressPerBlock * timeBlocks;
  return stress;
}

function calculateAttributeGains(
  action: ActionRow,
  timeBlocks: number,
): { skills: Record<string, number>; traits: Record<string, number> } {
  const effects = (action.effects ?? {}) as Record<string, unknown>;
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
      }),
    )
    .min(1),
});

const validateCartSchema = z.object({
  gameSessionId: z.string().min(1),
  actionIds: z.array(z.string().min(1)).min(1),
  quantities: z.record(z.string(), z.number().int().min(1)).optional(),
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

    let actions = allActions;

    if (category) {
      actions = actions.filter((a) => (a.category as string[]).includes(category));
    }

    if (seniorDiscount === true) {
      actions = actions.filter((a) => a.seniorDiscount);
    }

    if (ptoRequired === true) {
      actions = actions.filter((a) => a.requiresPTO);
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
        if (stressImpact === 'positive') return delta < 0;
        if (stressImpact === 'negative') return delta > 0;
        return delta === 0;
      });
    }

    if (healthImpact) {
      actions = actions.filter((a) => {
        const { temporary, permanent } = calculateHealthDelta(a, a.minTimeBlocks);
        const total = temporary + permanent;
        if (healthImpact === 'positive') return total > 0;
        if (healthImpact === 'negative') return total < 0;
        return total === 0;
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
      });
      const lemons = calculateLemonsEarned(a, a.minTimeBlocks);
      return {
        ...a,
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
          });
          return {
            ...a,
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

    const { gameSessionId, actionIds, quantities } = result.data;

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
        select: { currentYear: true },
      });
      const currentYear = session?.currentYear ?? 0;

      const eligPlayer = buildEligibilityPlayer(player, currentYear);
      const familySize = getFamilySize(player);
      const jobTitles = getActiveJobTitles(player);
      const hasBike = playerHasBike(player);
      const availableTimeBlocks = getAvailableTimeBlocks(player);
      const availableMoney = player.money + player.projectedIncome;
      let totalTimeBlocks = 0;
      let totalCost = 0;

      for (const actionId of actionIds) {
        const action = actions.find((a) => a.id === actionId);
        if (!action) {
          errors.push(`Action ${actionId} not found`);
          continue;
        }

        const qty = quantities?.[actionId] ?? 1;
        const tb = action.minTimeBlocks;

        const eligResult = checkActionEligibility(action, eligPlayer);
        if (!eligResult.eligible) {
          errors.push(`${action.name}: ${eligResult.reasons[0]}`);
        }

        const history = await prisma.actionHistory.findUnique({
          where: { playerId_actionId_year: { playerId: player.id, actionId, year: currentYear } },
        });
        const freqError = checkFrequencyLimit(action, history as ActionHistoryRecord | null);
        if (freqError) errors.push(freqError);

        const cost = calculateActionCost({
          action,
          timeBlocks: tb,
          familySize,
          playerAge: player.age,
          playerJobTitles: jobTitles,
          hasInsurance: player.hasHealthInsurance,
          hasBike,
        });

        totalTimeBlocks += tb * qty;
        totalCost += cost * qty;
      }

      if (totalTimeBlocks > availableTimeBlocks) {
        errors.push(`Not enough time blocks: need ${totalTimeBlocks}, have ${availableTimeBlocks}`);
      }
      if (totalCost > availableMoney) {
        errors.push(
          `Not enough money: need $${totalCost.toFixed(2)}, have $${availableMoney.toFixed(2)}`,
        );
      }

      res.json({
        valid: errors.length === 0,
        totalTimeBlocks,
        availableTimeBlocks,
        totalCost,
        availableMoney,
        errors,
      });
    } catch (err) {
      console.error('[actions/cart/validate]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

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
      const availableTimeBlocks = getAvailableTimeBlocks(player);
      const availableMoney = player.money + player.projectedIncome;

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
      let totalCost = 0;

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

        const tb = item.timeBlocks > 0 ? item.timeBlocks : action.minTimeBlocks;
        if (action.minTimeBlocks > 0 && tb < action.minTimeBlocks) {
          validationErrors.push(`${action.name}: minimum ${action.minTimeBlocks} time blocks required`);
        }
        if (action.maxTimeBlocks !== null && tb > action.maxTimeBlocks) {
          validationErrors.push(`${action.name}: maximum ${action.maxTimeBlocks} time blocks allowed`);
        }

        totalTimeBlocks += tb;
        totalCost += calculateActionCost({
          action,
          timeBlocks: tb,
          familySize,
          playerAge: player.age,
          playerJobTitles: jobTitles,
          hasInsurance: player.hasHealthInsurance,
          hasBike,
        });
      }

      if (totalTimeBlocks > availableTimeBlocks) {
        validationErrors.push(
          `Not enough time blocks: need ${totalTimeBlocks}, have ${availableTimeBlocks}`,
        );
      }
      if (totalCost > availableMoney) {
        validationErrors.push(
          `Not enough money: need $${totalCost.toFixed(2)}, have $${availableMoney.toFixed(2)}`,
        );
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
        const tb = item.timeBlocks > 0 ? item.timeBlocks : action.minTimeBlocks;

        totalLemonsEarned += calculateLemonsEarned(action, tb);
        const { temporary, permanent } = calculateHealthDelta(action, tb);
        healthDeltaTemp += temporary;
        healthDeltaPerm += permanent;
        stressDelta += calculateStressDelta(action, tb);

        const { skills, traits } = calculateAttributeGains(action, tb);
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
          const tb = item.timeBlocks > 0 ? item.timeBlocks : action.minTimeBlocks;
          const cost = calculateActionCost({
            action,
            timeBlocks: tb,
            familySize,
            playerAge: player.age,
            playerJobTitles: jobTitles,
            hasInsurance: player.hasHealthInsurance,
            hasBike,
          });
          const lemons = calculateLemonsEarned(action, tb);

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

        // Update player state
        await tx.player.update({
          where: { id: player.id },
          data: {
            money: { decrement: totalCost },
            health: newHealth,
            maxHealth: newMaxHealth,
            // Cast needed: Prisma client not regenerated after schema added temporaryHealthDebt
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
