// backend/src/controllers/hangouts.controller.ts
import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { getUserByClerkId } from '../services/users.service';
import {
  createHangout,
  discoverHangouts,
  getHangoutById,
  requestToJoin,
  respondToJoin,
} from '../services/hangouts.service';

/**
 * POST /api/hangouts
 * Create a new hangout post. Requires auth.
 */
export async function postHangout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const dbUser = await getUserByClerkId(auth.userId!);

    if (!dbUser) {
      res.status(404).json({ success: false, message: 'User not found. Sync your profile first.' });
      return;
    }

    const hangout = await createHangout(dbUser.id, req.body);
    res.status(201).json({ success: true, data: hangout });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/hangouts/discover
 * Discover open hangouts near a location. Public endpoint.
 */
export async function discover(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lng, radius, category } = req.query as {
      lat: string;
      lng: string;
      radius?: string;
      category?: string;
    };

    const hangouts = await discoverHangouts(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius ?? '10000'),
      category
    );

    res.status(200).json({ success: true, count: hangouts.length, data: hangouts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/hangouts/:id
 * Get a single hangout with all join requests.
 */
export async function getHangout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params['id']), 10);
    const hangout = await getHangoutById(id);

    if (!hangout) {
      res.status(404).json({ success: false, message: 'Hangout not found.' });
      return;
    }

    res.status(200).json({ success: true, data: hangout });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/hangouts/:id/join
 * Request to join a hangout. Requires auth.
 */
export async function joinHangout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const dbUser = await getUserByClerkId(auth.userId!);

    if (!dbUser) {
      res.status(404).json({ success: false, message: 'User not found. Sync your profile first.' });
      return;
    }

    const hangoutId = parseInt(String(req.params['id']), 10);
    const { message } = req.body;

    const join = await requestToJoin(hangoutId, dbUser.id, message);

    if (!join) {
      res.status(409).json({ success: false, message: 'Already requested to join this hangout.' });
      return;
    }

    res.status(201).json({ success: true, data: join });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/hangouts/joins/:joinId
 * Host accepts or declines a join request. Requires auth.
 */
export async function respondJoin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const dbUser = await getUserByClerkId(auth.userId!);

    if (!dbUser) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const joinId = parseInt(String(req.params['joinId']), 10);
    const { status } = req.body as { status: 'ACCEPTED' | 'DECLINED' };

    const result = await respondToJoin(joinId, dbUser.id, status);

    if (!result) {
      res.status(403).json({
        success: false,
        message: 'Not authorised or join request not found.',
      });
      return;
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
