// backend/src/index.ts
import 'dotenv/config';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';

import usersRouter from './routes/users.routes';
import hangoutsRouter from './routes/hangouts.routes';
import chatRouter from './routes/chat.routes';
import { initSocketServer } from './socket';
import { startChatCleanupJob } from './jobs/chat.cleanup';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ?? 3001;

// ─── Global Middleware ────────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost'
];
if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || process.env.CORS_ORIGIN === '*' || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Clerk middleware injects auth state into every request (non-blocking)
app.use(clerkMiddleware());

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/users', usersRouter);
app.use('/api/hangouts', hangoutsRouter);
app.use('/api/chat', chatRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    success: false,
    message: err.message ?? 'Internal server error.',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

// Socket.IO is attached to the same HTTP server (same port)
initSocketServer(server);
startChatCleanupJob();

server.listen(PORT, () => {
  console.log(`🚀 Wango API running on http://localhost:${PORT}`);
});

