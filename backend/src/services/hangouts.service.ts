// backend/src/services/hangouts.service.ts
import { prisma } from '../db';
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
 */
export async function respondToJoin(
  joinId: number,
  hostUserId: number,
  status: 'ACCEPTED' | 'DECLINED'
): Promise<{ id: number; status: string } | null> {
  // Verify requester is the host
  const result = await prisma.$queryRaw<any[]>`
    UPDATE "HangoutJoin" j
    SET "status" = ${status}::"JoinStatus", "updatedAt" = NOW()
    FROM "HangoutPost" h
    WHERE j."id" = ${joinId}
      AND j."hangoutPostId" = h."id"
      AND h."userId" = ${hostUserId}
    RETURNING j."id", j."status"
  `;
  return result[0] ?? null;
}
