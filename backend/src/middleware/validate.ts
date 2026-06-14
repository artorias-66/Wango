// backend/src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

/**
 * Generic Zod validation middleware factory.
 * NOTE: Express v5 makes req.query read-only, so we ONLY write back to req.body.
 * For query/params, we attach the parsed result to req (via a custom property)
 * but the route handlers must read from the raw req.query (already type-coerced by Zod).
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.issues.map((e: import('zod').ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ success: false, errors });
      return;
    }

    // Express v5: req.query is read-only — only write back for body/params
    if (target === 'body') {
      req.body = result.data;
    }
    // For query/params, Zod has already validated — handlers read from req.query directly

    next();
  };
}
