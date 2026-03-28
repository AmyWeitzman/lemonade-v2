import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { recalculatePitcherGoal } from '../lib/pitcher';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a random 6-character uppercase alphanumeric join code */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Generate a unique join code (retries on collision) */
async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCode();
    const existing = await prisma.gameSession.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique join code after 10 attempts');
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createSessionSchema = z.object({
  displayName: z.string().min(1).max(50),
  theme: z.string().default('default'),
  maxPlayers: z.number().int().min(2).max(16).default(8),
});

const joinSessionSchema = z.object({
  code: z.string().length(6).toUpperCase(),
  displayName: z.string().min(1).max(50),
});

const kickSchema = z.object({
  playerId: z.string().min(1),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/sessions — create a new game session
router.post('/', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = createSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { displayName, theme, maxPlayers } = result.data;
  const userId = req.user!.userId;

  try {
    const code = await generateUniqueCode();

    // Create session + host player in a transaction
    const session = await prisma.$transaction(async (tx) => {
      // Create the session first (hostPlayerId will be set after player is created)
      const newSession = await tx.gameSession.create({
        data: {
          code,
          hostPlayerId: '', // placeholder — updated below
          theme,
          maxPlayers,
          status: 'waiting',
        },
      });

      // Create the host player record
      const hostPlayer = await tx.player.create({
        data: {
          userId,
          gameSessionId: newSession.id,
          name: displayName,
        },
      });

      // Update session with real hostPlayerId
      const updatedSession = await tx.gameSession.update({
        where: { id: newSession.id },
        data: { hostPlayerId: hostPlayer.id },
        include: { players: true },
      });

      return updatedSession;
    });

    res.status(201).json({ session });
  } catch (err) {
    console.error('[sessions/create]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions — list all waiting sessions, excluding ones the user has hidden
router.get('/', authorize, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const hidden = await prisma.sessionHide.findMany({
      where: { userId },
      select: { gameSessionId: true },
    });
    const hiddenIds = hidden.map((h) => h.gameSessionId);

    const sessions = await prisma.gameSession.findMany({
      where: {
        status: 'waiting',
        id: { notIn: hiddenIds.length ? hiddenIds : [''] },
      },
      include: {
        players: { select: { id: true, name: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ sessions });
  } catch (err) {
    console.error('[sessions/list]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id — get a specific session
router.get('/:id', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            userId: true,
            age: true,
            isAlive: true,
            yearComplete: true,
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({ session });
  } catch (err) {
    console.error('[sessions/get]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/join — join a session by code
router.post('/:id/join', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = joinSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { code, displayName } = result.data;
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { players: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.code !== code) {
      res.status(400).json({ error: 'Invalid join code' });
      return;
    }

    if (session.status !== 'waiting') {
      res.status(400).json({ error: 'Session is no longer accepting players' });
      return;
    }

    if (session.players.length >= session.maxPlayers) {
      res.status(400).json({ error: 'Session is full' });
      return;
    }

    // Check if user already has a player in this session
    const existingPlayer = session.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      res.status(400).json({ error: 'You are already in this session' });
      return;
    }

    const player = await prisma.player.create({
      data: {
        userId,
        gameSessionId: id,
        name: displayName,
      },
    });

    res.status(201).json({ player });
  } catch (err) {
    console.error('[sessions/join]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/leave — leave a session
router.post('/:id/leave', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const player = await prisma.player.findFirst({
      where: { gameSessionId: id, userId },
    });

    if (!player) {
      res.status(404).json({ error: 'You are not in this session' });
      return;
    }

    const session = await prisma.gameSession.findUnique({ where: { id } });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // If the host is leaving, either transfer host or end the session
    if (session.hostPlayerId === player.id) {
      // Find another player to transfer host to
      const nextHost = await prisma.player.findFirst({
        where: { gameSessionId: id, id: { not: player.id }, isAlive: true },
      });

      if (nextHost) {
        await prisma.$transaction([
          prisma.player.delete({ where: { id: player.id } }),
          prisma.gameSession.update({
            where: { id },
            data: { hostPlayerId: nextHost.id },
          }),
        ]);
        await recalculatePitcherGoal(id);
        res.json({ message: 'Left session; host transferred', newHostPlayerId: nextHost.id });
      } else {
        // No other players — delete the session
        await prisma.gameSession.delete({ where: { id } });
        res.json({ message: 'Left session; session deleted (no remaining players)' });
      }
      return;
    }

    // Non-host player leaving: delete player record, recalculate pitcher
    await prisma.player.delete({ where: { id: player.id } });
    await recalculatePitcherGoal(id);

    res.json({ message: 'Left session' });
  } catch (err) {
    console.error('[sessions/leave]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/kick — any player can kick another player
router.post('/:id/kick', authorize, async (req: Request, res: Response): Promise<void> => {
  const result = kickSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { playerId } = result.data;
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { players: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Verify requester is in this session
    const requestingPlayer = session.players.find((p) => p.userId === userId);
    if (!requestingPlayer) {
      res.status(403).json({ error: 'You are not in this session' });
      return;
    }

    // Verify target player exists in session
    const targetPlayer = session.players.find((p) => p.id === playerId);
    if (!targetPlayer) {
      res.status(404).json({ error: 'Player not found in this session' });
      return;
    }

    // Cannot kick yourself
    if (targetPlayer.id === requestingPlayer.id) {
      res.status(400).json({ error: 'Cannot kick yourself; use leave instead' });
      return;
    }

    await prisma.player.delete({ where: { id: playerId } });
    await recalculatePitcherGoal(id);

    res.json({ message: 'Player kicked' });
  } catch (err) {
    console.error('[sessions/kick]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/hide — hide a session from the requesting user's history
router.post('/:id/hide', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const session = await prisma.gameSession.findUnique({ where: { id } });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await prisma.sessionHide.upsert({
      where: { userId_gameSessionId: { userId, gameSessionId: id } },
      create: { userId, gameSessionId: id },
      update: {}, // already hidden — no-op
    });

    res.json({ message: 'Session hidden from your history' });
  } catch (err) {
    console.error('[sessions/hide]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sessions/:id — host deletes the session
router.delete('/:id', authorize, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { players: { select: { id: true, userId: true } } },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const requestingPlayer = session.players.find((p) => p.userId === userId);
    if (!requestingPlayer || session.hostPlayerId !== requestingPlayer.id) {
      res.status(403).json({ error: 'Only the host can delete the session' });
      return;
    }

    await prisma.gameSession.delete({ where: { id } });

    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error('[sessions/delete]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
