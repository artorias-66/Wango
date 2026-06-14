// backend/src/services/users.service.ts
import { prisma } from '../db';
import { SignupBody, UserRecord, NearbyUser } from '../types/hangout.types';

/**
 * Upsert a user record keyed by clerkId.
 * Called after Clerk auth on first sign-in.
 */
export async function upsertUser(data: SignupBody): Promise<UserRecord> {
  const { clerkId, name, email, bio, lat, lng } = data;

  const result = await prisma.$queryRaw<UserRecord[]>`
    INSERT INTO "User" ("clerkId", "name", "email", "bio", "location", "updatedAt")
    VALUES (
      ${clerkId},
      ${name},
      ${email},
      ${bio ?? null},
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      NOW()
    )
    ON CONFLICT ("clerkId") DO UPDATE SET
      "name"      = EXCLUDED."name",
      "email"     = EXCLUDED."email",
      "bio"       = EXCLUDED."bio",
      "location"  = EXCLUDED."location",
      "updatedAt" = NOW()
    RETURNING "id", "clerkId", "name", "email", "bio", "avatarColor", "createdAt"
  `;

  return result[0];
}

/**
 * Fetch users within a given radius (metres) sorted by proximity.
 */
export async function findNearbyUsers(
  lat: number,
  lng: number,
  radiusMetres: number
): Promise<NearbyUser[]> {
  const users = await prisma.$queryRaw<NearbyUser[]>`
    SELECT
      "id", "clerkId", "name", "email", "bio", "avatarColor", "createdAt",
      ST_Distance(
        "location",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) AS "distanceMeters"
    FROM "User"
    WHERE
      "location" IS NOT NULL
      AND ST_DWithin(
        "location",
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMetres}
      )
    ORDER BY "distanceMeters" ASC
  `;

  return users;
}

/**
 * Get a single user by their Clerk ID.
 */
export async function getUserByClerkId(clerkId: string): Promise<UserRecord | null> {
  const users = await prisma.$queryRaw<UserRecord[]>`
    SELECT "id", "clerkId", "name", "email", "bio", "avatarColor", "createdAt"
    FROM "User"
    WHERE "clerkId" = ${clerkId}
    LIMIT 1
  `;
  return users[0] ?? null;
}
