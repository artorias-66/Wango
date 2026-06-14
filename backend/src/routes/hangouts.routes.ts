// backend/src/routes/hangouts.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import {
  postHangout,
  discover,
  getHangout,
  joinHangout,
  respondJoin,
  getHosted,
} from '../controllers/hangouts.controller';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'SPORTS', 'GO_KARTING', 'CRICKET', 'FOOTBALL',
  'GAMING', 'FOOD', 'OUTDOOR', 'MUSIC', 'SOCIAL', 'FITNESS', 'TRAVEL',
] as const;

const CreateHangoutSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  category: z.enum(VALID_CATEGORIES),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO-8601 datetime' }),
  radiusKm: z.number().min(1).max(50).optional(),
  maxParticipants: z.number().int().min(2).max(100).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const DiscoverQuerySchema = z.object({
  lat: z.string().regex(/^-?\d+(\.\d+)?$/, 'lat must be numeric'),
  lng: z.string().regex(/^-?\d+(\.\d+)?$/, 'lng must be numeric'),
  radius: z.string().regex(/^\d+$/).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
});

const JoinHangoutSchema = z.object({
  message: z.string().max(300).optional(),
});

const RespondJoinSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/hangouts — create a hangout post
router.post('/', requireAuth, validate(CreateHangoutSchema, 'body'), postHangout);

// GET /api/hangouts/discover — spatial discovery (public)
router.get('/discover', validate(DiscoverQuerySchema, 'query'), discover);

// GET /api/hangouts/hosted — get hangouts created by user
router.get('/hosted', requireAuth, getHosted);

// GET /api/hangouts/:id — get hangout detail + join requests
router.get('/:id', getHangout);

// POST /api/hangouts/:id/join — request to join
router.post('/:id/join', requireAuth, validate(JoinHangoutSchema, 'body'), joinHangout);

// PATCH /api/hangouts/joins/:joinId — host responds to join request
router.patch('/joins/:joinId', requireAuth, validate(RespondJoinSchema, 'body'), respondJoin);

export default router;
