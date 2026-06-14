// backend/src/routes/users.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { syncUser, getMe, getNearbyUsers } from '../controllers/users.controller';

const router = Router();

const SyncUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  bio: z.string().max(300).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const NearbyQuerySchema = z.object({
  lat: z.string().regex(/^-?\d+(\.\d+)?$/, 'lat must be numeric'),
  lng: z.string().regex(/^-?\d+(\.\d+)?$/, 'lng must be numeric'),
  radius: z.string().regex(/^\d+$/).optional(),
});

// POST /api/users/sync — sync Clerk user into our DB
router.post('/sync', requireAuth, validate(SyncUserSchema, 'body'), syncUser);

// GET /api/users/me — get current user's DB profile
router.get('/me', requireAuth, getMe);

// GET /api/users/nearby — find users within radius
router.get('/nearby', requireAuth, validate(NearbyQuerySchema, 'query'), getNearbyUsers);

export default router;
