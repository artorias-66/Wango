// backend/src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from 'express';
import { clerkClient, getAuth } from '@clerk/express';

/**
 * Clerk authentication middleware.
 * Verifies the Bearer JWT from the Authorization header.
 * Attaches `req.auth` (userId, sessionId) on success.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = getAuth(req);

  if (!auth?.userId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized — valid Clerk session required.',
    });
    return;
  }

  next();
}
