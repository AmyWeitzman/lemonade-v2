/**
 * Card System Routes
 *
 * GET  /api/cards/good-deed/options      — get this year's 3 annual good deed options
 * POST /api/cards/good-deed/select       — select one annual good deed option
 * POST /api/cards/:cardEventId/respond   — accept or decline a good deed opportunity
 * POST /api/cards/:cardEventId/apply-effects — apply a drawn card's effects
 *
 * NOTE: Static routes (/good-deed/*) are registered BEFORE parameterized routes
 * (/:cardEventId/*) to prevent Express matching "good-deed" as a cardEventId param.
 *
 * Requirements: Req 9, Req 19
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import {
  getGoodDeedMultiplier,
  getBadDeedMultiplier,
  applyCardEffects,
  pickAnnualGoodDeedOptions,
  broadcastGoodDeedOpportunity,
  CardEffects,
} from '../lib/cards';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const respondSchema = z.object({
  gameSessionId: z.string().min(1),
  accepted: z.boolean(),
});

const selectGoodDeedSchema = z.object({
  gameSessionId: z.string().min(1),
  option: z.string().min(1),
});

const getOptionsSchema = z.object({
  gameSessionId: z.string().min(1),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchPlayer(userId: string, gameSessionId: string) {
  return prisma.player.findUnique({
    where: { userId_gameSessionId: { userId, gameSessionId } },
    select: {
      id: true,
      money: true,
      health: true,
      maxHealth: true,
      stress: true,
      autoInsuranceRate: true,
      skills: true,
      traits: true,
      chronicConditions: true,
      goodDeedCount: true,
      badDeedCount: true,
      totalLemonsEarned: true,
      gameSessionId: true,
      isAlive: true,
    },
  });
}

// ─── GET /api/cards/good-deed/options ─────────────────────────────────────────
// Static routes MUST come before /:cardEventId/* to avoid param collision.

/**
 * Return this year's 3 annual good deed options for the session.
 * All players see the same 3 options (deterministic by sessionId + year).
 * Req 19.9
 */
router.get(
  '/good-deed/options',
  authorize,
  async (req: Request, res: Response): Promise<void> => {
    const result = getOptionsSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }
    const { gameSessionId } = result.data;
    try {
      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { currentYear: true },
      });
      if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
      const options = pickAnnualGoodDeedOptions(gameSessionId, session.currentYear);
      res.json({ options, year: session.currentYear });
    } catch (err) {
      console.error('[cards/good-deed/options]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/cards/good-deed/select ─────────────────────────────────────────

/**
 * Player selects one of the 3 annual good deed options.
 * Grants 2 lemons × Good_Deed_Multiplier, increments goodDeedCount.
 * Req 19.10, Req 19.11
 */
router.post(
  '/good-deed/select',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = selectGoodDeedSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }
    const { gameSessionId, option } = result.data;
    try {
      const player = await fetchPlayer(req.user!.userId, gameSessionId);
      if (!player) { res.status(404).json({ error: 'Player not found in this session' }); return; }

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: {
          currentYear: true,
          pitcherCurrentLemons: true,
          pitcherContributionsByPlayer: true,
          pitcherYearlyGoal: true,
        },
      });
      if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

      const validOptions = pickAnnualGoodDeedOptions(gameSessionId, session.currentYear);
      if (!validOptions.includes(option)) {
        res.status(400).json({
          error: "Invalid option. Must be one of this year's 3 annual good deed options.",
          validOptions,
        });
        return;
      }

      // Idempotency check — tracked via Notification marker (category='annual_good_deed', message=year)
      const existingSelection = await prisma.notification.findFirst({
        where: { playerId: player.id, category: 'annual_good_deed', message: String(session.currentYear) },
      });
      if (existingSelection) {
        res.status(409).json({ error: 'Already selected an annual good deed this year' });
        return;
      }

      const multiplier = getGoodDeedMultiplier(player.goodDeedCount);
      const lemonsEarned = 2 * multiplier;
      const contributions = (session.pitcherContributionsByPlayer ?? {}) as Record<string, number>;
      contributions[player.id] = (contributions[player.id] ?? 0) + lemonsEarned;

      await prisma.$transaction(async (tx) => {
        await tx.notification.create({
          data: {
            playerId: player.id,
            type: 'success',
            category: 'annual_good_deed',
            title: 'Annual Good Deed Completed',
            message: String(session.currentYear),
            persistent: false,
            dismissible: true,
            actionRequired: false,
          },
        });
        await tx.player.update({
          where: { id: player.id },
          data: { totalLemonsEarned: { increment: lemonsEarned }, goodDeedCount: { increment: 1 } },
        });
        await tx.gameSession.update({
          where: { id: gameSessionId },
          data: {
            pitcherCurrentLemons: { increment: lemonsEarned },
            pitcherContributionsByPlayer: contributions,
          },
        });
      });

      const io = getIO();
      const updatedSession = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { pitcherCurrentLemons: true, pitcherYearlyGoal: true },
      });
      io.to(`game:${gameSessionId}`).emit('lemonAdded', {
        playerId: player.id,
        lemonsAdded: lemonsEarned,
        totalLemons: updatedSession?.pitcherCurrentLemons ?? 0,
        pitcherGoal: updatedSession?.pitcherYearlyGoal ?? 0,
      });
      io.to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { totalLemonsEarned: player.totalLemonsEarned + lemonsEarned },
      });

      res.json({
        option,
        lemonsEarned,
        multiplier,
        newGoodDeedCount: player.goodDeedCount + 1,
        newTotalLemonsEarned: player.totalLemonsEarned + lemonsEarned,
      });
    } catch (err) {
      console.error('[cards/good-deed/select]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/cards/:cardEventId/respond ─────────────────────────────────────

/**
 * Respond to a good deed opportunity from another player's card draw.
 * Accept  → earn 2 lemons × Good_Deed_Multiplier, increment goodDeedCount  (Req 19.6)
 * Decline → lose 1 lemon × Bad_Deed_Multiplier,  increment badDeedCount   (Req 19.7)
 */
router.post(
  '/:cardEventId/respond',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const { cardEventId } = req.params;
    const result = respondSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }
    const { gameSessionId, accepted } = result.data;
    try {
      const player = await fetchPlayer(req.user!.userId, gameSessionId);
      if (!player) { res.status(404).json({ error: 'Player not found in this session' }); return; }

      const cardEvent = await prisma.cardEvent.findUnique({
        where: { id: cardEventId },
        include: { player: { select: { gameSessionId: true, id: true, name: true } } },
      });
      if (!cardEvent || cardEvent.player.gameSessionId !== gameSessionId) {
        res.status(404).json({ error: 'Card event not found in this session' }); return;
      }
      if (cardEvent.playerId === player.id) {
        res.status(400).json({ error: 'Cannot respond to your own good deed opportunity' }); return;
      }

      const existingResponses = (cardEvent.goodDeedResponses ?? []) as Array<{ playerId: string; accepted: boolean }>;
      if (existingResponses.some((r) => r.playerId === player.id)) {
        res.status(409).json({ error: 'Already responded to this good deed opportunity' }); return;
      }

      const goodDeedMultiplier = getGoodDeedMultiplier(player.goodDeedCount);
      const badDeedMultiplier = getBadDeedMultiplier(player.badDeedCount);
      let lemonDelta: number;
      let goodDeedIncrement = 0;
      let badDeedIncrement = 0;

      if (accepted) {
        lemonDelta = 2 * goodDeedMultiplier;   // Req 19.6
        goodDeedIncrement = 1;
      } else {
        lemonDelta = -(1 * badDeedMultiplier); // Req 19.7
        badDeedIncrement = 1;
      }

      const session = await prisma.gameSession.findUnique({
        where: { id: gameSessionId },
        select: { pitcherCurrentLemons: true, pitcherContributionsByPlayer: true, pitcherYearlyGoal: true },
      });
      if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

      const contributions = (session.pitcherContributionsByPlayer ?? {}) as Record<string, number>;
      const newTotalLemons = player.totalLemonsEarned + lemonDelta;
      const updatedResponses = [...existingResponses, { playerId: player.id, accepted }];

      await prisma.$transaction(async (tx) => {
        await tx.player.update({
          where: { id: player.id },
          data: {
            totalLemonsEarned: Math.max(0, newTotalLemons),
            goodDeedCount: { increment: goodDeedIncrement },
            badDeedCount: { increment: badDeedIncrement },
          },
        });
        await tx.cardEvent.update({
          where: { id: cardEventId },
          data: { goodDeedResponses: updatedResponses },
        });
        if (lemonDelta > 0) {
          contributions[player.id] = (contributions[player.id] ?? 0) + lemonDelta;
          await tx.gameSession.update({
            where: { id: gameSessionId },
            data: {
              pitcherCurrentLemons: { increment: lemonDelta },
              pitcherContributionsByPlayer: contributions,
            },
          });
        }
      });

      const io = getIO();
      if (lemonDelta > 0) {
        const updatedSession = await prisma.gameSession.findUnique({
          where: { id: gameSessionId },
          select: { pitcherCurrentLemons: true, pitcherYearlyGoal: true },
        });
        io.to(`game:${gameSessionId}`).emit('lemonAdded', {
          playerId: player.id,
          lemonsAdded: lemonDelta,
          totalLemons: updatedSession?.pitcherCurrentLemons ?? 0,
          pitcherGoal: updatedSession?.pitcherYearlyGoal ?? 0,
        });
      }
      io.to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { totalLemonsEarned: Math.max(0, newTotalLemons) },
      });

      res.json({
        accepted,
        lemonDelta,
        multiplierUsed: accepted ? goodDeedMultiplier : badDeedMultiplier,
        newTotalLemonsEarned: Math.max(0, newTotalLemons),
        goodDeedCount: player.goodDeedCount + goodDeedIncrement,
        badDeedCount: player.badDeedCount + badDeedIncrement,
      });
    } catch (err) {
      console.error('[cards/respond]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── POST /api/cards/:cardEventId/apply-effects ───────────────────────────────

/**
 * Apply a drawn card's effects to the player who drew it.
 * Broadcasts goodDeedOpportunity to other players if the card is a good deed card.
 * Req 9.4, Req 9.5, Req 19.5
 */
router.post(
  '/:cardEventId/apply-effects',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const { cardEventId } = req.params;
    const gameSessionId = (req.body.gameSessionId as string | undefined)?.trim();
    if (!gameSessionId) { res.status(400).json({ error: 'gameSessionId is required' }); return; }

    try {
      const player = await fetchPlayer(req.user!.userId, gameSessionId);
      if (!player) { res.status(404).json({ error: 'Player not found in this session' }); return; }

      const cardEvent = await prisma.cardEvent.findUnique({
        where: { id: cardEventId },
        include: {
          card: true,
          player: { select: { id: true, gameSessionId: true, name: true } },
        },
      });
      if (!cardEvent || cardEvent.player.gameSessionId !== gameSessionId) {
        res.status(404).json({ error: 'Card event not found in this session' }); return;
      }
      if (cardEvent.playerId !== player.id) {
        res.status(403).json({ error: 'Can only apply effects for your own card events' }); return;
      }

      const effects = (cardEvent.card.effects ?? {}) as CardEffects;
      const chronicCount = (player.chronicConditions as string[]).length;

      const state = applyCardEffects(
        {
          money: player.money,
          health: player.health,
          maxHealth: player.maxHealth,
          temporaryHealthDebt: 0,
          stress: player.stress,
          autoInsuranceRate: player.autoInsuranceRate,
          skills: player.skills as Record<string, number>,
          traits: player.traits as Record<string, number>,
          chronicConditionCount: chronicCount,
        },
        effects,
      );

      await prisma.player.update({
        where: { id: player.id },
        data: {
          money: state.money,
          health: state.health,
          maxHealth: state.maxHealth,
          stress: state.stress,
          autoInsuranceRate: state.autoInsuranceRate,
          skills: state.skills,
          traits: state.traits,
        } as Parameters<typeof prisma.player.update>[0]['data'],
      });

      const io = getIO();
      io.to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: { money: state.money, health: state.health, maxHealth: state.maxHealth, stress: state.stress },
      });

      if (cardEvent.card.isGoodDeedOpportunity) {
        const goodDeedMultiplier = getGoodDeedMultiplier(player.goodDeedCount);
        const lemonReward = 2 * goodDeedMultiplier;
        broadcastGoodDeedOpportunity(io, gameSessionId, player.id, cardEventId, lemonReward);
      }

      res.json({
        effectsApplied: effects,
        updatedState: {
          money: state.money,
          health: state.health,
          maxHealth: state.maxHealth,
          stress: state.stress,
          autoInsuranceRate: state.autoInsuranceRate,
          skills: state.skills,
          traits: state.traits,
        },
        isGoodDeedOpportunity: cardEvent.card.isGoodDeedOpportunity,
      });
    } catch (err) {
      console.error('[cards/apply-effects]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
