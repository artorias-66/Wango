// backend/src/controllers/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { upsertUser, findNearbyUsers, getUserByClerkId } from '../services/users.service';

/**
 * POST /api/users/sync
 * Called by the frontend after Clerk sign-in to sync user into our DB.
 */
export async function syncUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const clerkId = auth.userId!;
    const { name, email, bio, lat, lng } = req.body;

    const user = await upsertUser({ clerkId, name, email, bio, lat, lng });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile from our DB.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const user = await getUserByClerkId(auth.userId!);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found. Please sync first.' });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/nearby
 * Returns users within the specified radius sorted by distance.
 */
export async function getNearbyUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lng, radius } = req.query as { lat: string; lng: string; radius?: string };
    const users = await findNearbyUsers(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius ?? '10000')
    );
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
}
