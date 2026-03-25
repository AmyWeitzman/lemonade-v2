import type { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
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
