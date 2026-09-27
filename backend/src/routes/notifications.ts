/**
 * Notification Routes
 *
 * GET  /api/notifications/:playerId       — fetch all notifications for a player
 * POST /api/notifications/:id/dismiss     — dismiss a notification
 *
 * Requirements: Req 21
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';

const router = Router();

// ─── GET /api/notifications/:playerId ────────────────────────────────────────

router.get('/:playerId', authorize, async (req: Request, res: Response): Promise<void> => {
  const { playerId } = req.params;

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        playerId,
        dismissedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ notifications });
  } catch (err) {
    console.error('[notifications/get]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/notifications/:id/dismiss ─────────────────────────────────────

router.post('/:id/dismiss', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (!notification.dismissible) {
      res.status(400).json({ error: 'This notification cannot be dismissed' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { dismissedAt: new Date() },
    });

    res.json({ notification: updated });
  } catch (err) {
    console.error('[notifications/dismiss]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
