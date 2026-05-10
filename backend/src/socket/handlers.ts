import type { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { stripHtml } from '../lib/messages';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './events';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Lazy-load Redis to avoid import errors if Redis is not configured
let redis: import('ioredis').Redis | null = null;

async function getRedis(): Promise<import('ioredis').Redis> {
  if (!redis) {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }
  return redis;
}

function roomName(gameSessionId: string): string {
  return `game:${gameSessionId}`;
}

/**
 * Player joins a game session room.
 * Emits `playerJoined` to all players in the room.
 */
export async function handleJoinGame(
  socket: AppSocket,
  io: IO,
  gameSessionId: string,
): Promise<void> {
  const { userId } = socket.data;

  // Look up the player record for this user + session
  const player = await prisma.player.findFirst({
    where: { userId, gameSessionId },
    select: { id: true, name: true, age: true, isAlive: true, yearComplete: true },
  });

  if (!player) {
    socket.emit('notification', {
      id: `err-${Date.now()}`,
      playerId: '',
      type: 'error',
      category: 'session',
      title: 'Join failed',
      message: 'Player record not found for this session.',
      persistent: false,
      actionRequired: false,
    });
    return;
  }

  // Store on socket data
  socket.data.gameSessionId = gameSessionId;
  socket.data.playerId = player.id;
  socket.data.playerName = player.name;

  await socket.join(roomName(gameSessionId));
  // Also join a player-specific room so targeted notifications can be delivered
  await socket.join(`player:${player.id}`);

  io.to(roomName(gameSessionId)).emit('playerJoined', {
    playerId: player.id,
    playerName: player.name,
    gameSessionId,
  });

  console.log(`[socket] ${player.name} (${socket.id}) joined room ${roomName(gameSessionId)}`);
}

/**
 * Player explicitly leaves a game session room.
 * Emits `playerLeft` to remaining players.
 */
export async function handleLeaveGame(
  socket: AppSocket,
  io: IO,
  gameSessionId: string,
): Promise<void> {
  const { playerId, playerName } = socket.data;

  await socket.leave(roomName(gameSessionId));

  io.to(roomName(gameSessionId)).emit('playerLeft', {
    playerId: playerId ?? '',
    playerName: playerName ?? socket.data.username,
    gameSessionId,
  });

  // Clear session data from socket
  socket.data.gameSessionId = undefined;
  socket.data.playerId = undefined;
  socket.data.playerName = undefined;

  console.log(`[socket] ${playerName ?? socket.id} left room ${roomName(gameSessionId)}`);
}

/**
 * Handle socket disconnection.
 * Stores last-seen timestamp in Redis and emits `playerLeft` to the room.
 */
export async function handleDisconnect(socket: AppSocket, io: IO): Promise<void> {
  const { playerId, playerName, gameSessionId } = socket.data;

  console.log(`[socket] disconnected: ${socket.id} (player: ${playerName ?? 'unknown'})`);

  // Store last-seen in Redis
  if (playerId) {
    try {
      const r = await getRedis();
      await r.set(`player:${playerId}:lastSeen`, new Date().toISOString());
    } catch (err) {
      console.error('[socket] Redis lastSeen error:', err);
    }
  }

  // Notify room
  if (gameSessionId && playerId) {
    io.to(roomName(gameSessionId)).emit('playerLeft', {
      playerId,
      playerName: playerName ?? '',
      gameSessionId,
    });
  }
}

/**
 * Handle reconnection — re-join the room and restore state.
 * Called automatically when a socket connects with a gameSessionId in its JWT data.
 */
export async function handleReconnect(socket: AppSocket, io: IO): Promise<void> {
  const { userId, gameSessionId } = socket.data;

  if (!gameSessionId) return;

  // Look up the player record
  const player = await prisma.player.findFirst({
    where: { userId, gameSessionId },
    select: { id: true, name: true, age: true, isAlive: true, yearComplete: true },
  });

  if (!player) return;

  socket.data.playerId = player.id;
  socket.data.playerName = player.name;

  await socket.join(roomName(gameSessionId));
  // Also join a player-specific room so targeted notifications can be delivered
  await socket.join(`player:${player.id}`);

  // Notify room that player rejoined
  io.to(roomName(gameSessionId)).emit('playerJoined', {
    playerId: player.id,
    playerName: player.name,
    gameSessionId,
  });

  // Clear last-seen from Redis
  try {
    const r = await getRedis();
    await r.del(`player:${player.id}:lastSeen`);
  } catch (err) {
    console.error('[socket] Redis reconnect error:', err);
  }

  console.log(`[socket] ${player.name} (${socket.id}) reconnected to room ${roomName(gameSessionId)}`);
}

const SUPPORTED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🍋', '💪', '🤔', '👏'];

/**
 * Handle sendMessage socket event.
 * Sanitizes content, saves to DB, and broadcasts messageReceived to the session room.
 */
export async function handleSendMessage(
  socket: AppSocket,
  io: IO,
  payload: { gameSessionId: string; content: string },
): Promise<void> {
  const { playerId, playerName } = socket.data;

  if (!playerId || !playerName) {
    return; // Not in a game session
  }

  const { gameSessionId, content } = payload;

  if (!gameSessionId || typeof content !== 'string') return;

  // Sanitize: strip HTML, trim, enforce max 500 chars
  const sanitized = stripHtml(content).trim().slice(0, 500);
  if (!sanitized) return;

  try {
    const message = await prisma.message.create({
      data: {
        gameSessionId,
        playerId,
        playerName,
        content: sanitized,
        isSystemMessage: false,
        reactions: [],
      },
    });

    io.to(roomName(gameSessionId)).emit('messageReceived', {
      id: message.id,
      gameSessionId: message.gameSessionId,
      playerId: message.playerId ?? '',
      playerName: message.playerName,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      reactions: [],
      isSystemMessage: false,
    });
  } catch (err) {
    console.error('[socket] sendMessage error:', err);
  }
}

/**
 * Handle reactToMessage socket event.
 * Toggles an emoji reaction on a message and broadcasts messageReactionUpdated.
 */
export async function handleReactToMessage(
  socket: AppSocket,
  io: IO,
  payload: { messageId: string; emoji: string },
): Promise<void> {
  const { playerId } = socket.data;

  if (!playerId) return;

  const { messageId, emoji } = payload;

  if (!messageId || !emoji || !SUPPORTED_EMOJIS.includes(emoji)) return;

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return;

    const reactions = (message.reactions as { emoji: string; playerIds: string[] }[]) ?? [];
    const existing = reactions.find((r) => r.emoji === emoji);

    let updatedReactions: { emoji: string; playerIds: string[] }[];

    if (existing) {
      const alreadyReacted = existing.playerIds.includes(playerId);
      if (alreadyReacted) {
        const newPlayerIds = existing.playerIds.filter((id) => id !== playerId);
        if (newPlayerIds.length === 0) {
          updatedReactions = reactions.filter((r) => r.emoji !== emoji);
        } else {
          updatedReactions = reactions.map((r) =>
            r.emoji === emoji ? { ...r, playerIds: newPlayerIds } : r,
          );
        }
      } else {
        updatedReactions = reactions.map((r) =>
          r.emoji === emoji ? { ...r, playerIds: [...r.playerIds, playerId] } : r,
        );
      }
    } else {
      updatedReactions = [...reactions, { emoji, playerIds: [playerId] }];
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: updatedReactions },
    });

    const reactionForEmoji = (
      updated.reactions as { emoji: string; playerIds: string[] }[]
    ).find((r) => r.emoji === emoji) ?? { emoji, playerIds: [], count: 0 };

    io.to(roomName(message.gameSessionId)).emit('messageReactionUpdated', {
      messageId,
      emoji,
      playerIds: reactionForEmoji.playerIds,
      count: reactionForEmoji.playerIds.length,
    });
  } catch (err) {
    console.error('[socket] reactToMessage error:', err);
  }
}
