/**
 * Messaging Routes
 *
 * POST /api/messages                          — send a chat message
 * GET  /api/messages/:sessionId               — paginated message history
 * GET  /api/messages/:sessionId/recent        — last 50 messages
 * POST /api/messages/:messageId/react         — toggle emoji reaction
 *
 * Requirements: Req 25
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';
import { stripHtml } from '../lib/messages';
import { getIO } from '../socket';

const router = Router();

const SUPPORTED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🍋', '💪', '🤔', '👏'];

// ─── POST /api/messages ───────────────────────────────────────────────────────

router.post('/', authorize, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.user!;
  const { gameSessionId, content } = req.body as { gameSessionId?: string; content?: string };

  if (!gameSessionId || typeof content !== 'string') {
    res.status(400).json({ error: 'gameSessionId and content are required' });
    return;
  }

  // Sanitize: strip HTML, trim, enforce max 500 chars
  const sanitized = stripHtml(content).trim().slice(0, 500);
  if (!sanitized) {
    res.status(400).json({ error: 'Message content cannot be empty' });
    return;
  }

  // Look up the player for this user + session
  const player = await prisma.player.findFirst({
    where: { userId, gameSessionId },
    select: { id: true, name: true },
  });

  if (!player) {
    res.status(403).json({ error: 'Player not found in this session' });
    return;
  }

  try {
    const message = await prisma.message.create({
      data: {
        gameSessionId,
        playerId: player.id,
        playerName: player.name,
        content: sanitized,
        isSystemMessage: false,
        reactions: [],
      },
    });

    const payload = {
      id: message.id,
      gameSessionId: message.gameSessionId,
      playerId: message.playerId ?? '',
      playerName: message.playerName,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      reactions: [],
      isSystemMessage: false,
    };

    // Broadcast to all players in the session room
    try {
      const io = getIO();
      io.to(`game:${gameSessionId}`).emit('messageReceived', payload);
    } catch {
      // Socket not initialized — non-fatal
    }

    res.status(201).json({ message: payload });
  } catch (err) {
    console.error('[messages/post]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/messages/:sessionId ────────────────────────────────────────────

router.get('/:sessionId', authorize, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));
  const skip = (page - 1) * limit;

  try {
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { gameSessionId: sessionId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { gameSessionId: sessionId } }),
    ]);

    res.json({
      messages: messages.map(formatMessage),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[messages/get-paginated]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/messages/:sessionId/recent ─────────────────────────────────────

router.get('/:sessionId/recent', authorize, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  try {
    // Fetch last 50 ordered desc, then reverse for chronological display
    const raw = await prisma.message.findMany({
      where: { gameSessionId: sessionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const messages = raw.reverse();

    res.json({ messages: messages.map(formatMessage) });
  } catch (err) {
    console.error('[messages/get-recent]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/messages/:messageId/react ─────────────────────────────────────

router.post('/:messageId/react', authorize, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.user!;
  const { messageId } = req.params;
  const { emoji } = req.body as { emoji?: string };

  if (!emoji || !SUPPORTED_EMOJIS.includes(emoji)) {
    res.status(400).json({ error: 'Invalid or unsupported emoji', supported: SUPPORTED_EMOJIS });
    return;
  }

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Look up the player for this user in the message's session
    const player = await prisma.player.findFirst({
      where: { userId, gameSessionId: message.gameSessionId },
      select: { id: true },
    });

    if (!player) {
      res.status(403).json({ error: 'Player not found in this session' });
      return;
    }

    const playerId = player.id;

    // Toggle reaction
    const reactions = (message.reactions as { emoji: string; playerIds: string[] }[]) ?? [];
    const existing = reactions.find((r) => r.emoji === emoji);

    let updatedReactions: { emoji: string; playerIds: string[] }[];

    if (existing) {
      const alreadyReacted = existing.playerIds.includes(playerId);
      if (alreadyReacted) {
        // Remove player from this emoji's list
        const newPlayerIds = existing.playerIds.filter((id) => id !== playerId);
        if (newPlayerIds.length === 0) {
          // Remove the reaction entry entirely
          updatedReactions = reactions.filter((r) => r.emoji !== emoji);
        } else {
          updatedReactions = reactions.map((r) =>
            r.emoji === emoji ? { ...r, playerIds: newPlayerIds } : r,
          );
        }
      } else {
        // Add player to existing emoji entry
        updatedReactions = reactions.map((r) =>
          r.emoji === emoji ? { ...r, playerIds: [...r.playerIds, playerId] } : r,
        );
      }
    } else {
      // New emoji reaction
      updatedReactions = [...reactions, { emoji, playerIds: [playerId] }];
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: updatedReactions },
    });

    const formattedReactions = (
      updated.reactions as { emoji: string; playerIds: string[] }[]
    ).map((r) => ({ emoji: r.emoji, playerIds: r.playerIds, count: r.playerIds.length }));

    // Broadcast reaction update to the session room
    const reactionForEmoji = formattedReactions.find((r) => r.emoji === emoji) ?? {
      emoji,
      playerIds: [],
      count: 0,
    };

    try {
      const io = getIO();
      io.to(`game:${message.gameSessionId}`).emit('messageReactionUpdated', {
        messageId,
        emoji,
        playerIds: reactionForEmoji.playerIds,
        count: reactionForEmoji.count,
      });
    } catch {
      // Socket not initialized — non-fatal
    }

    res.json({ reactions: formattedReactions });
  } catch (err) {
    console.error('[messages/react]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessage(msg: {
  id: string;
  gameSessionId: string;
  playerId: string | null;
  playerName: string;
  content: string;
  isSystemMessage: boolean;
  reactions: unknown;
  createdAt: Date;
}) {
  const reactions = (msg.reactions as { emoji: string; playerIds: string[] }[] | null) ?? [];
  return {
    id: msg.id,
    gameSessionId: msg.gameSessionId,
    playerId: msg.playerId ?? '',
    playerName: msg.playerName,
    content: msg.content,
    timestamp: msg.createdAt.toISOString(),
    isSystemMessage: msg.isSystemMessage,
    reactions: reactions.map((r) => ({
      emoji: r.emoji,
      playerIds: r.playerIds,
      count: r.playerIds.length,
    })),
  };
}

export default router;
