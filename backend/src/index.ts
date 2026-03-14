import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder API router — routes added in subsequent tasks
app.get('/api', (_req, res) => {
  res.json({ message: 'Lemonade API 🍋' });
});

// Socket.IO connection handler — full implementation in Task 5
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🍋 Lemonade backend running on http://localhost:${PORT}`);
});

export { app, io };
