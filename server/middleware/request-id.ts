import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

/**
 * Attaches a unique request ID to every incoming request.
 * Uses Vercel's `x-vercel-id` header when available (for log correlation
 * across the Vercel platform), falling back to a generated UUID.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-vercel-id'] as string) || uuid();
  res.setHeader('x-request-id', id);
  (req as Request & { requestId: string }).requestId = id;
  next();
}
