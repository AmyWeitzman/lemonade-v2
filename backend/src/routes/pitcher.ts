/**
 * Lemonade Pitcher Routes
 *
 * GET /api/pitcher/:sessionId — current pitcher state
 *
 * Requirements: Req 7
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { calculateRecommendedPerPlayer } from '../lib/pitcher';

const router = Router();

// ─── GET /api/pitcher/:sessionId ──────────────────────────────────────────────

router.get('/:sessionId', authorize, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        pitcherCurrentLemons: true,
        pitcherYearlyGoal: true,
        pitcherInGraceYear: true,
        pitcherContributionsByPlayer: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const livingPlayers = await prisma.player.findMany({
      where: { gameSessionId: sessionId, isAlive: true },
      select: { id: true },
    });

    const recommendedPerPlayer = calculateRecommendedPerPlayer(
      session.pitcherYearlyGoal,
      livingPlayers.length,
    );

    res.json({
      currentLemons: session.pitcherCurrentLemons,
      yearlyGoal: session.pitcherYearlyGoal,
      recommendedPerPlayer,
      inGraceYear: session.pitcherInGraceYear,
      contributionsByPlayer: (session.pitcherContributionsByPlayer ?? {}) as Record<string, number>,
    });
  } catch (err) {
    console.error('[pitcher/get]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
