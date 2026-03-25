import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { startNewYear } from '../lib/yearCycle';
import { getIO } from '../socket';

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const completeYearSchema = z.object({
  gameSessionId: z.string().min(1),
});

// ─── POST /api/year/complete ──────────────────────────────────────────────────

router.post(
  '/complete',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = completeYearSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0].message });
      return;
    }

    const { gameSessionId } = result.data;
    const player = req.player!;

    try {
      // Validate player belongs to this session
      if (player.gameSessionId !== gameSessionId) {
        res.status(403).json({ error: 'Player does not belong to this session' });
        return;
      }

      // Check player hasn't already marked year complete
      if (player.yearComplete) {
        res.status(400).json({ error: 'Year already marked as complete' });
        return;
      }

      // Mark player year complete
      await prisma.player.update({
        where: { id: player.id },
        data: { yearComplete: true },
      });

      // Check if ALL living players have completed their year
      const livingPlayers = await prisma.player.findMany({
        where: { gameSessionId, isAlive: true },
        select: { id: true, yearComplete: true },
      });

      const allComplete = livingPlayers.every((p) => p.yearComplete);

      if (allComplete) {
        // Trigger new year for all players
        const io = getIO();
        await startNewYear(gameSessionId, io);
      }

      res.json({ yearComplete: true, allPlayersComplete: allComplete });
    } catch (err) {
      console.error('[year/complete]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── GET /api/year/status ─────────────────────────────────────────────────────

router.get('/status', authorize, async (req: Request, res: Response): Promise<void> => {
  const gameSessionId = req.query.gameSessionId as string | undefined;

  if (!gameSessionId) {
    res.status(400).json({ error: 'gameSessionId query parameter is required' });
    return;
  }

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      select: { currentYear: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const players = await prisma.player.findMany({
      where: { gameSessionId },
      select: {
        id: true,
        name: true,
        yearComplete: true,
        age: true,
        isAlive: true,
      },
    });

    const allComplete = players.filter((p) => p.isAlive).every((p) => p.yearComplete);

    res.json({
      currentYear: session.currentYear,
      allComplete,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        yearComplete: p.yearComplete,
        age: p.age,
        isAlive: p.isAlive,
      })),
    });
  } catch (err) {
    console.error('[year/status]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
