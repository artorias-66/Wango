// backend/src/socket/index.ts
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { verifyToken } from '@clerk/backend';
import { prisma } from '../db';
import { saveMessage, isRoomMember, markRoomRead } from '../services/chat.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServerToClientEvents {
  new_message: (msg: {
    id: number;
    body: string;
    createdAt: string;
    sender: { id: number; name: string; avatarColor: string };
  }) => void;
  member_joined: (data: { userId: number; name: string }) => void;
  error: (data: { message: string }) => void;
}

interface ClientToServerEvents {
  join_room: (data: { roomId: number }) => void;
  send_message: (data: { roomId: number; body: string }) => void;
  mark_read: (data: { roomId: number }) => void;
}

interface SocketData {
  dbUserId: number;
  name: string;
  avatarColor: string;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export function initSocketServer(httpServer: HttpServer): SocketIOServer {

  const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost',
    'http://localhost',
    'capacitor://localhost'
  ];
  if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    httpServer,
    {
      path: '/api/socket.io',
      cors: {
        origin: (origin, callback) => {
          if (!origin || process.env.CORS_ORIGIN === '*' || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
      },
    },
  );

  // ─── Redis adapter for horizontal scaling ─────────────────────────────────
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const pubClient = new Redis(redisUrl);
  const subClient = pubClient.duplicate();

  Promise.all([Promise.resolve(), Promise.resolve()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter connected');
    })
    .catch((err: Error) => {
      console.warn('⚠️  Redis unavailable — Socket.IO running without adapter (single instance only):', err.message);
    });

  // ─── Clerk JWT auth on handshake ──────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) throw new Error('No token');

      // Verify Clerk JWT using standalone verifyToken
      const { sub: clerkId } = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });

      const dbUser = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true, name: true, avatarColor: true },
      });

      if (!dbUser) throw new Error('User not in database');

      socket.data.dbUserId = dbUser.id;
      socket.data.name = dbUser.name;
      socket.data.avatarColor = dbUser.avatarColor;

      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // ─── Connection handler ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { dbUserId, name, avatarColor } = socket.data;
    console.log(`[WS] Connected: user ${dbUserId} (${name})`);

    // Client asks to join a specific chat room
    socket.on('join_room', async ({ roomId }) => {
      const allowed = await isRoomMember(roomId, dbUserId);
      if (!allowed) {
        socket.emit('error', { message: 'You are not a member of this chat.' });
        return;
      }

      const roomName = `chat-${roomId}`;
      await socket.join(roomName);
      markRoomRead(roomId, dbUserId).catch(console.error);

      // Notify others in the room
      socket.to(roomName).emit('member_joined', { userId: dbUserId, name });
      console.log(`[WS] User ${dbUserId} joined room ${roomId}`);
    });

    // Client sends a message
    socket.on('send_message', async ({ roomId, body }) => {
      if (!body?.trim()) return;

      const allowed = await isRoomMember(roomId, dbUserId);
      if (!allowed) {
        socket.emit('error', { message: 'You are not a member of this chat.' });
        return;
      }

      const msg = await saveMessage(roomId, dbUserId, body.trim());

      // Broadcast to everyone in the room (including sender, for consistency)
      io.to(`chat-${roomId}`).emit('new_message', msg);
    });

    // Client explicitly marks a room as read (e.g. when chat tab is focused)
    socket.on('mark_read', async ({ roomId }) => {
      markRoomRead(roomId, dbUserId).catch(console.error);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Disconnected: user ${dbUserId}`);
    });
  });

  return io;
}
