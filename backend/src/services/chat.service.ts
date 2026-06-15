// backend/src/services/chat.service.ts
import { prisma } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatRoomSummary {
  id: number;
  hangoutPostId: number;
  hangoutTitle: string;
  hangoutCategory: string;
  scheduledAt: string;
  expiresAt: string;
  memberCount: number;
  unreadCount: number;
  lastMessage: { body: string; createdAt: string; senderName: string } | null;
}

export interface MessageRecord {
  id: number;
  body: string;
  createdAt: string;
  sender: { id: number; name: string; avatarColor: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute midnight (23:59:59.999) at the end of the hangout's scheduled day (UTC).
 */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ─── Core chat operations ─────────────────────────────────────────────────────

/**
 * Create a ChatRoom for a hangout if one doesn't already exist,
 * then ensure both the host and newly accepted user are members.
 */
export async function upsertChatRoom(
  hangoutPostId: number,
  userIds: number[],
  scheduledAt: Date,
): Promise<number> {
  const expiresAt = endOfDay(scheduledAt);

  const room = await prisma.chatRoom.upsert({
    where: { hangoutPostId },
    create: { hangoutPostId, expiresAt },
    update: {},
    select: { id: true },
  });

  // Add all users as members (idempotent — unique constraint prevents dupes)
  await prisma.chatMember.createMany({
    data: userIds.map((userId) => ({ chatRoomId: room.id, userId })),
    skipDuplicates: true,
  });

  return room.id;
}

/**
 * Persist a new message and return it fully populated.
 */
export async function saveMessage(
  chatRoomId: number,
  senderId: number,
  body: string,
): Promise<MessageRecord> {
  const msg = await prisma.message.create({
    data: { chatRoomId, senderId, body },
    include: {
      sender: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  return {
    id: msg.id,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
    sender: msg.sender,
  };
}

/**
 * Cursor-based paginated message history (newest-first when scrolling up).
 * Pass cursorId to get messages older than that ID.
 */
export async function getMessages(
  chatRoomId: number,
  limit = 50,
  cursorId?: number,
): Promise<MessageRecord[]> {
  const msgs = await prisma.message.findMany({
    where: {
      chatRoomId,
      ...(cursorId ? { id: { lt: cursorId } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  return msgs
    .reverse() // return in chronological order for display
    .map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
    }));
}

/**
 * All chat rooms where the user is a member, with unread count and last message preview.
 */
export async function getUserRooms(userId: number): Promise<ChatRoomSummary[]> {
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    include: {
      chatRoom: {
        include: {
          hangoutPost: { select: { title: true, category: true, scheduledAt: true } },
          _count: { select: { members: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { chatRoom: { createdAt: 'desc' } },
  });

  return Promise.all(
    memberships.map(async (m) => {
      const room = m.chatRoom;
      const unreadCount = await prisma.message.count({
        where: {
          chatRoomId: room.id,
          createdAt: { gt: m.lastReadAt },
        },
      });

      const lastMsg = room.messages[0] ?? null;

      return {
        id: room.id,
        hangoutPostId: room.hangoutPostId,
        hangoutTitle: room.hangoutPost.title,
        hangoutCategory: room.hangoutPost.category,
        scheduledAt: room.hangoutPost.scheduledAt.toISOString(),
        expiresAt: room.expiresAt.toISOString(),
        memberCount: room._count.members,
        unreadCount,
        lastMessage: lastMsg
          ? {
              body: lastMsg.body,
              createdAt: lastMsg.createdAt.toISOString(),
              senderName: lastMsg.sender.name,
            }
          : null,
      };
    }),
  );
}

/**
 * Update lastReadAt to now — called when a user opens a chat.
 */
export async function markRoomRead(chatRoomId: number, userId: number): Promise<void> {
  await prisma.chatMember.updateMany({
    where: { chatRoomId, userId },
    data: { lastReadAt: new Date() },
  });
}

/**
 * Verify that a user is a member of a chat room (auth guard for socket joins).
 */
export async function isRoomMember(chatRoomId: number, userId: number): Promise<boolean> {
  const member = await prisma.chatMember.findUnique({
    where: { chatRoomId_userId: { chatRoomId, userId } },
    select: { id: true },
  });
  return !!member;
}

// ─── Cleanup cron ─────────────────────────────────────────────────────────────

/**
 * Delete all ChatRooms whose expiresAt has passed.
 * Messages and ChatMembers are cascade-deleted by the DB.
 * Call this from a nightly cron job.
 */
export async function deleteExpiredRooms(): Promise<number> {
  const result = await prisma.chatRoom.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return result.count;
}
