/**
 * PTO Routes
 *
 * POST /api/pto/request — request PTO (convert work TBs to activity TBs)
 *
 * Requirements: Req 35
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { validatePlayerAlive } from '../middleware/validatePlayerAlive';
import { getIO } from '../socket';
import { sendNotification } from '../lib/yearCycle';
import { calculateMaxPTO, hasSufficientPTO } from '../lib/pto';

const router = Router();

const requestPTOSchema = z.object({
  gameSessionId: z.string().min(1),
  employmentId: z.string().min(1),
  blocksRequested: z.number().int().min(1),
});

// ─── POST /api/pto/request ────────────────────────────────────────────────────

router.post(
  '/request',
  authorize,
  validatePlayerAlive,
  async (req: Request, res: Response): Promise<void> => {
    const result = requestPTOSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' });
      return;
    }

    const { gameSessionId, employmentId, blocksRequested } = result.data;

    try {
      const player = await prisma.player.findUnique({
        where: { userId_gameSessionId: { userId: req.user!.userId, gameSessionId } },
        include: {
          employments: { where: { isActive: true }, include: { job: true } },
        },
      });

      if (!player) {
        res.status(404).json({ error: 'Player not found in this session' });
        return;
      }

      if (player.gameSessionId !== gameSessionId) {
        res.status(403).json({ error: 'Player does not belong to this session' });
        return;
      }

      // Find the specific employment
      const employment = player.employments.find((e) => e.id === employmentId);
      if (!employment) {
        res.status(404).json({ error: 'Active employment not found' });
        return;
      }

      // Part-time jobs get no PTO
      if (employment.isPartTime) {
        res.status(400).json({ error: 'Part-time jobs do not have PTO' });
        return;
      }

      // Check if job has PTO
      if (employment.job.ptoTimeBlocks <= 0) {
        res.status(400).json({ error: 'This job does not offer PTO' });
        return;
      }

      // Validate max PTO (half of job's time blocks)
      const maxPTO = calculateMaxPTO(employment.job.timeBlocks, employment.isPartTime);
      if (blocksRequested > maxPTO) {
        res.status(400).json({
          error: `Cannot request more than ${maxPTO} PTO blocks (half of job's ${employment.job.timeBlocks} time blocks)`,
        });
        return;
      }

      // Validate player has enough PTO remaining
      if (!hasSufficientPTO(employment.ptoRemaining, blocksRequested)) {
        res.status(400).json({
          error: `Insufficient PTO: have ${employment.ptoRemaining} blocks, need ${blocksRequested}`,
        });
        return;
      }

      // Check once-per-year limit: ptoUsed must be 0 (no PTO requested yet this year)
      const currentPtoUsed = (employment as unknown as { ptoUsed: number }).ptoUsed ?? 0;
      if (currentPtoUsed > 0) {
        res.status(400).json({
          error: 'PTO can only be requested once per year. Please include all needed PTO in one request.',
        });
        return;
      }

      // Deduct from ptoRemaining, set ptoUsed for this year
      await prisma.employment.update({
        where: { id: employmentId },
        data: {
          ptoRemaining: { decrement: blocksRequested },
          ...({ ptoUsed: blocksRequested } as Record<string, unknown>),
        } as Parameters<typeof prisma.employment.update>[0]['data'],
      });

      await sendNotification(
        player.id,
        {
          type: 'success',
          category: 'job',
          title: 'PTO Approved',
          message: `${blocksRequested} PTO block${blocksRequested !== 1 ? 's' : ''} approved. These work time blocks are now available as activity time blocks.`,
        },
        getIO(),
      );

      getIO().to(`game:${gameSessionId}`).emit('playerStateChanged', {
        playerId: player.id,
        changes: {},
      });

      res.status(200).json({
        success: true,
        blocksRequested,
        ptoRemaining: employment.ptoRemaining - blocksRequested,
        ptoUsed: blocksRequested,
        message: `${blocksRequested} work time block${blocksRequested !== 1 ? 's' : ''} converted to activity time blocks.`,
      });
    } catch (err) {
      console.error('[pto/request]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
