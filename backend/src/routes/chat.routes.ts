// backend/src/routes/chat.routes.ts
import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { prisma } from '../db';
import { getMessages, getUserRooms, markRoomRead, isRoomMember } from '../services/chat.service';
import type { Request, Response } from 'express';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDbUser(clerkId: string) {
  return prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
}

// ─── GET /api/chat/my-rooms ───────────────────────────────────────────────────
// List all chat rooms the current user is a member of (with unread counts)
router.get('/my-rooms', requireAuth(), async (req: Request, res: Response) => {
  const clerkId = (req as any).auth?.userId as string;
  if (!clerkId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; };
  const dbUser = await getDbUser(clerkId);
  if (!dbUser) {
    res.status(404).json({ success: false, message: 'User not found. Sync your profile first.' });
    return;
  }

  const rooms = await getUserRooms(dbUser.id);
  res.json({ success: true, data: rooms });
});

// ─── GET /api/chat/:roomId/messages ──────────────────────────────────────────
// Paginated message history; marks the room as read
router.get('/:roomId/messages', requireAuth(), async (req: Request, res: Response) => {
  const clerkId = (req as any).auth?.userId as string;
  if (!clerkId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
  const roomId = parseInt(String(req.params['roomId'] ?? ''), 10);
  const cursorId = req.query.cursor ? parseInt(String(req.query.cursor), 10) : undefined;
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 100);

  if (isNaN(roomId)) {
    res.status(400).json({ success: false, message: 'Invalid room ID.' });
    return;
  }

  const dbUser = await getDbUser(clerkId);
  if (!dbUser) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const member = await isRoomMember(roomId, dbUser.id);
  if (!member) {
    res.status(403).json({ success: false, message: 'You are not a member of this chat.' });
    return;
  }

  // Mark as read (async, don't await — faster response)
  markRoomRead(roomId, dbUser.id).catch(console.error);

  const messages = await getMessages(roomId, limit, cursorId);
  res.json({ success: true, data: messages });
});

export default router;
