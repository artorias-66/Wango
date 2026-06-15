// backend/src/services/hangouts.service.ts
import { prisma } from '../db';
import { upsertChatRoom } from './chat.service';
import {
  CreateHangoutBody,
  HangoutRecord,
  NearbyHangout,
  JoinRecord,
} from '../types/hangout.types';

/**
 * Create a new hangout post anchored to the host's current location.
 */
export async function createHangout(
  userId: number,
  data: CreateHangoutBody
): Promise<HangoutRecord> {
  const {
    title,
    description,
    category,
    scheduledAt,
    radiusKm = 10,
    maxParticipants = 8,
    lat,
    lng,
  } = data;

  const result = await prisma.$queryRaw<any[]>`
    INSERT INTO "HangoutPost"
      ("title", "description", "category", "scheduledAt", "radiusKm", "maxParticipants", "location", "userId", "updatedAt")
    VALUES (
      ${title},
      ${description ?? null},
      ${category}::"Category",
      ${new Date(scheduledAt)},
      ${radiusKm},
      ${maxParticipants},
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${userId},
      NOW()
    )
    RETURNING "id", "title", "description", "category", "scheduledAt", "radiusKm", "status", "maxParticipants", "createdAt", "userId"
  `;

  const raw = result[0];
  const user = await prisma.$queryRaw<any[]>`
    SELECT "id", "name", "avatarColor" FROM "User" WHERE "id" = ${userId} LIMIT 1
  `;

  return {
    ...raw,
    user: user[0],
    joinCount: 0,
    lat,
    lng,
  };
}

/**
 * Discover open hangouts within radius (metres), optionally filtered by category.
 * Results sorted by proximity.
 */
export async function discoverHangouts(
  lat: number,
  lng: number,
  radiusMetres: number,
  category?: string
): Promise<NearbyHangout[]> {
  const now = new Date();

  let rows: any[];

  if (category) {
    rows = await prisma.$queryRaw<any[]>`
      SELECT
        h."id", h."title", h."description", h."category", h."scheduledAt",
        h."radiusKm", h."status", h."maxParticipants", h."createdAt", h."userId",
        ST_Y(h."location"::geometry) AS "lat", ST_X(h."location"::geometry) AS "lng",
        u."name" as "userName", u."avatarColor",
        COUNT(j."id")::int AS "joinCount",
        ST_Distance(
          h."location",
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS "distanceMeters"
      FROM "HangoutPost" h
      JOIN "User" u ON u."id" = h."userId"
      LEFT JOIN "HangoutJoin" j ON j."hangoutPostId" = h."id" AND j."status" = 'ACCEPTED'
      WHERE
        h."location" IS NOT NULL
        AND h."status" = 'OPEN'
        AND h."scheduledAt" > ${now}
        AND h."category" = ${category}::"Category"
        AND ST_DWithin(
          h."location",
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMetres}
        )
      GROUP BY h."id", u."name", u."avatarColor"
      ORDER BY "distanceMeters" ASC
    `;
  } else {
    rows = await prisma.$queryRaw<any[]>`
      SELECT
        h."id", h."title", h."description", h."category", h."scheduledAt",
        h."radiusKm", h."status", h."maxParticipants", h."createdAt", h."userId",
        ST_Y(h."location"::geometry) AS "lat", ST_X(h."location"::geometry) AS "lng",
        u."name" as "userName", u."avatarColor",
        COUNT(j."id")::int AS "joinCount",
        ST_Distance(
          h."location",
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS "distanceMeters"
      FROM "HangoutPost" h
      JOIN "User" u ON u."id" = h."userId"
      LEFT JOIN "HangoutJoin" j ON j."hangoutPostId" = h."id" AND j."status" = 'ACCEPTED'
      WHERE
        h."location" IS NOT NULL
        AND h."status" = 'OPEN'
        AND h."scheduledAt" > ${now}
        AND ST_DWithin(
          h."location",
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMetres}
        )
      GROUP BY h."id", u."name", u."avatarColor"
      ORDER BY "distanceMeters" ASC
    `;
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    scheduledAt: r.scheduledAt,
    radiusKm: r.radiusKm,
    status: r.status,
    maxParticipants: r.maxParticipants,
    createdAt: r.createdAt,
    lat: r.lat,
    lng: r.lng,
    distanceMeters: Number(r.distanceMeters),
    joinCount: r.joinCount ?? 0,
    user: { id: r.userId, name: r.userName, avatarColor: r.avatarColor },
  }));
}

/**
 * Get a single hangout with all its join requests.
 */
export async function getHangoutById(id: number): Promise<(HangoutRecord & { joins: JoinRecord[] }) | null> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      h."id", h."title", h."description", h."category", h."scheduledAt",
      h."radiusKm", h."status", h."maxParticipants", h."createdAt", h."userId",
      ST_Y(h."location"::geometry) AS "lat", ST_X(h."location"::geometry) AS "lng",
      u."name" as "userName", u."avatarColor",
      COUNT(j2."id") FILTER (WHERE j2."status" = 'ACCEPTED')::int AS "joinCount"
    FROM "HangoutPost" h
    JOIN "User" u ON u."id" = h."userId"
    LEFT JOIN "HangoutJoin" j2 ON j2."hangoutPostId" = h."id"
    WHERE h."id" = ${id}
    GROUP BY h."id", u."name", u."avatarColor"
    LIMIT 1
  `;

  if (!rows.length) return null;
  const r = rows[0];

  const joins = await prisma.$queryRaw<JoinRecord[]>`
    SELECT
      j."id", j."status", j."message", j."createdAt",
      u."id" as "userId", u."name", u."avatarColor"
    FROM "HangoutJoin" j
    JOIN "User" u ON u."id" = j."userId"
    WHERE j."hangoutPostId" = ${id}
    ORDER BY j."createdAt" ASC
  `;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    scheduledAt: r.scheduledAt,
    radiusKm: r.radiusKm,
    status: r.status,
    maxParticipants: r.maxParticipants,
    createdAt: r.createdAt,
    lat: r.lat,
    lng: r.lng,
    joinCount: r.joinCount ?? 0,
    user: { id: r.userId, name: r.userName, avatarColor: r.avatarColor },
    joins: (joins as any[]).map((j) => ({
      id: j.id,
      status: j.status,
      message: j.message,
      createdAt: j.createdAt,
      user: { id: j.userId, name: j.name, avatarColor: j.avatarColor },
    })),
  };
}

/**
 * Request to join a hangout (creates PENDING record).
 */
export async function requestToJoin(
  hangoutPostId: number,
  userId: number,
  message?: string
): Promise<{ id: number; status: string }> {
  const result = await prisma.$queryRaw<any[]>`
    INSERT INTO "HangoutJoin" ("hangoutPostId", "userId", "message", "updatedAt")
    VALUES (${hangoutPostId}, ${userId}, ${message ?? null}, NOW())
    ON CONFLICT ("hangoutPostId", "userId") DO NOTHING
    RETURNING "id", "status"
  `;
  return result[0];
}

/**
 * Host responds to a join request (ACCEPTED or DECLINED).
 * When ACCEPTED, a ChatRoom is automatically created for the hangout.
 */
export async function respondToJoin(
  joinId: number,
  hostUserId: number,
  status: 'ACCEPTED' | 'DECLINED'
): Promise<{ id: number; status: string; chatRoomId?: number } | null> {
  // Fetch full join + hangout context first
  const join = await prisma.$queryRaw<any[]>`
    SELECT
      j."id", j."userId" as "joinUserId",
      h."id" as "hangoutPostId", h."userId" as "hostUserId", h."scheduledAt"
    FROM "HangoutJoin" j
    JOIN "HangoutPost" h ON h."id" = j."hangoutPostId"
    WHERE j."id" = ${joinId}
      AND h."userId" = ${hostUserId}
  `;

  if (!join.length) return null;

  const { joinUserId, hangoutPostId, scheduledAt } = join[0];

  // Update join status
  const result = await prisma.$queryRaw<any[]>`
    UPDATE "HangoutJoin"
    SET "status" = ${status}::"JoinStatus", "updatedAt" = NOW()
    WHERE "id" = ${joinId}
    RETURNING "id", "status"
  `;

  if (!result.length) return null;

  // If accepted, auto-create the group chat room (idempotent)
  let chatRoomId: number | undefined;
  if (status === 'ACCEPTED') {
    chatRoomId = await upsertChatRoom(
      hangoutPostId,
      [hostUserId, joinUserId],
      new Date(scheduledAt),
    );
  }

  return { ...result[0], chatRoomId };
}

/**
 * Get all hangouts created by the user, including all join requests.
 */
export async function getHostedHangouts(userId: number): Promise<(HangoutRecord & { joins: JoinRecord[] })[]> {
  const hangouts = await prisma.$queryRaw<any[]>`
    SELECT
      h."id", h."title", h."description", h."category", h."scheduledAt",
      h."radiusKm", h."status", h."maxParticipants", h."createdAt", h."userId",
      ST_Y(h."location"::geometry) AS "lat", ST_X(h."location"::geometry) AS "lng",
      u."name" as "userName", u."avatarColor",
      COUNT(j2."id") FILTER (WHERE j2."status" = 'ACCEPTED')::int AS "joinCount"
    FROM "HangoutPost" h
    JOIN "User" u ON u."id" = h."userId"
    LEFT JOIN "HangoutJoin" j2 ON j2."hangoutPostId" = h."id"
    WHERE h."userId" = ${userId}
    GROUP BY h."id", u."name", u."avatarColor"
    ORDER BY h."createdAt" DESC
  `;

  if (!hangouts.length) return [];

  const hangoutIds = hangouts.map((h) => h.id);

  const joins = await prisma.$queryRaw<JoinRecord[]>`
    SELECT
      j."id", j."status", j."message", j."createdAt", j."hangoutPostId",
      u."id" as "userId", u."name", u."avatarColor"
    FROM "HangoutJoin" j
    JOIN "User" u ON u."id" = j."userId"
    WHERE j."hangoutPostId" = ANY(${hangoutIds}::int[])
    ORDER BY j."createdAt" ASC
  `;

  return hangouts.map((h) => {
    const hangoutJoins = (joins as any[]).filter(j => j.hangoutPostId === h.id).map(j => ({
      id: j.id,
      status: j.status,
      message: j.message,
      createdAt: j.createdAt,
      user: { id: j.userId, name: j.name, avatarColor: j.avatarColor },
    }));

    return {
      id: h.id,
      title: h.title,
      description: h.description,
      category: h.category,
      scheduledAt: h.scheduledAt,
      radiusKm: h.radiusKm,
      status: h.status,
      maxParticipants: h.maxParticipants,
      createdAt: h.createdAt,
      lat: h.lat,
      lng: h.lng,
      joinCount: h.joinCount ?? 0,
      user: { id: h.userId, name: h.userName, avatarColor: h.avatarColor },
      joins: hangoutJoins,
    };
  });
}
