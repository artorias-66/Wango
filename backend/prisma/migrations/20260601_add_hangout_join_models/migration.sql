-- Migration: add_hangout_join_models
-- Adds enums, HangoutPost and HangoutJoin tables with spatial index
-- NOTE: PostGIS is already enabled from the initial migration.

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "Category" AS ENUM (
  'SPORTS',
  'GO_KARTING',
  'CRICKET',
  'FOOTBALL',
  'GAMING',
  'FOOD',
  'OUTDOOR',
  'MUSIC',
  'SOCIAL',
  'FITNESS',
  'TRAVEL'
);

CREATE TYPE "HangoutStatus" AS ENUM (
  'OPEN',
  'FULL',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE "JoinStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED'
);

-- ─── Add clerkId to User ───────────────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "clerkId"     TEXT,
  ADD COLUMN IF NOT EXISTS "bio"         TEXT,
  ADD COLUMN IF NOT EXISTS "avatarColor" TEXT NOT NULL DEFAULT '#00d4ff',
  ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Back-fill clerkId with a placeholder so we can add UNIQUE after
UPDATE "User" SET "clerkId" = 'legacy_' || id::text WHERE "clerkId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "clerkId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId");

-- ─── HangoutPost ──────────────────────────────────────────────────────────────

CREATE TABLE "HangoutPost" (
  "id"              SERIAL PRIMARY KEY,
  "title"           TEXT NOT NULL,
  "description"     TEXT,
  "category"        "Category" NOT NULL,
  "scheduledAt"     TIMESTAMP(3) NOT NULL,
  "radiusKm"        DOUBLE PRECISION NOT NULL DEFAULT 10,
  "location"        geography(Point, 4326),
  "status"          "HangoutStatus" NOT NULL DEFAULT 'OPEN',
  "maxParticipants" INTEGER NOT NULL DEFAULT 8,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "hangout_location_idx" ON "HangoutPost" USING GIST ("location");
CREATE INDEX "HangoutPost_status_idx"    ON "HangoutPost"("status");
CREATE INDEX "HangoutPost_category_idx"  ON "HangoutPost"("category");

-- ─── HangoutJoin ──────────────────────────────────────────────────────────────

CREATE TABLE "HangoutJoin" (
  "id"            SERIAL PRIMARY KEY,
  "status"        "JoinStatus" NOT NULL DEFAULT 'PENDING',
  "message"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hangoutPostId" INTEGER NOT NULL REFERENCES "HangoutPost"("id") ON DELETE CASCADE,
  "userId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("hangoutPostId", "userId")
);
