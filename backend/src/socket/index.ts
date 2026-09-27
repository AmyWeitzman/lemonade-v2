import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './events';
import { handleJoinGame, handleLeaveGame, handleDisconnect, handleReconnect, handleSendMessage, handleReactToMessage } from './handlers';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_jwt_secret_change_in_production';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function initSocket(server: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication error: missing token'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
        playerId?: string;
        gameSessionId?: string;
      };

      socket.data.userId = payload.userId;
      socket.data.username = payload.username;

      if (payload.playerId) {
        socket.data.playerId = payload.playerId;
      }
      if (payload.gameSessionId) {
        socket.data.gameSessionId = payload.gameSessionId;
      }

      next();
    } catch {
      next(new Error('Authentication error: invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id} (user: ${socket.data.username})`);

    // If the socket already has a gameSessionId from the JWT, auto-rejoin
    if (socket.data.gameSessionId) {
      handleReconnect(socket, io).catch((err) => {
        console.error('[socket] reconnect error:', err);
      });
    }

    socket.on('joinGame', (payload) => {
      handleJoinGame(socket, io, payload.gameSessionId).catch((err) => {
        console.error('[socket] joinGame error:', err);
      });
    });

    socket.on('leaveGame', (payload) => {
      handleLeaveGame(socket, io, payload.gameSessionId).catch((err) => {
        console.error('[socket] leaveGame error:', err);
      });
    });

    socket.on('sendMessage', (payload) => {
      handleSendMessage(socket, io, payload).catch((err) => {
        console.error('[socket] sendMessage error:', err);
      });
    });

    socket.on('reactToMessage', (payload) => {
      handleReactToMessage(socket, io, payload).catch((err) => {
        console.error('[socket] reactToMessage error:', err);
      });
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, io).catch((err) => {
        console.error('[socket] disconnect error:', err);
      });
    });
  });

  return io;
}

export function getIO(): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocket() first.');
  }
  return io;
}
