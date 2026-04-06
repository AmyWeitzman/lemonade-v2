/**
 * Certification Routes
 *
 * GET /api/certifications/:playerId — list all certifications with status and expiry
 *
 * Requirements: Req 43
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { getCertificationStatus } from '../lib/certifications';

const router = Router();

// ─── GET /api/certifications/:playerId ───────────────────────────────────────

router.get('/:playerId', authorize, async (req: Request, res: Response): Promise<void> => {
  const { playerId } = req.params;

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        certifications: true,
        gameSessionId: true,
        gameSession: { select: { currentYear: true } },
      },
    });

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    // Only the player themselves can view their certifications
    const requestingPlayer = await prisma.player.findFirst({
      where: { userId: req.user!.userId, gameSessionId: player.gameSessionId },
      select: { id: true },
    });

    if (!requestingPlayer || requestingPlayer.id !== playerId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const currentYear = player.gameSession.currentYear;
    const certifications = getCertificationStatus(player, currentYear);

    res.json({ certifications });
  } catch (err) {
    console.error('[certifications/get]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
