import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';
import playersRouter from './routes/players';
import yearRouter from './routes/year';
import timeblocksRouter from './routes/timeblocks';
import actionsRouter from './routes/actions';
import jobsRouter from './routes/jobs';
import educationRouter from './routes/education';
import { initSocket, getIO } from './socket';

const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'Lemonade API 🍋' });
});

app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/players', playersRouter);
app.use('/api/players', timeblocksRouter);
app.use('/api/year', yearRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/education', educationRouter);

// Socket.IO — full typed setup with JWT auth and room management
const io = initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🍋 Lemonade backend running on http://localhost:${PORT}`);
});

export { app, io, getIO };
