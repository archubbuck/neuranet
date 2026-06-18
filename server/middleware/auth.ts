/**
 * Authentication middleware.
 *
 * Verifies the incoming session cookie via Better Auth (backed by Neon Auth)
 * and attaches the user and session to the request object. Two variants:
 *
 *   - `requireAuth` — returns 401 when no valid session is found.
 *   - `optionalAuth` — attaches the user if available, continues silently
 *     when no session is present (useful for endpoints that work for both
 *     authenticated and anonymous callers).
 */
import type { Request, Response, NextFunction } from 'express';
import { getSession } from '../auth.js';

// Augment Express.Request — the module augmentation syntax avoids the
// no-namespace lint rule while still extending the type.
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string;
      image?: string;
    } | null;
    session?: unknown;
  }
}

/**
 * Middleware that rejects the request with 401 if no valid session exists.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  getSession(req.headers)
    .then((session) => {
      if (!session) {
        res.status(401).json({ message: 'authentication required' });
        return;
      }
      req.user = session.user as Request['user'];
      req.session = session.session;
      next();
    })
    .catch(() => {
      res.status(401).json({ message: 'authentication required' });
    });
}

/**
 * Middleware that attaches the user if a valid session exists, but does not
 * reject unauthenticated requests. Useful for endpoints that need the user
 * context when available (e.g., personalised responses).
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  getSession(req.headers)
    .then((session) => {
      if (session) {
        req.user = session.user as Request['user'];
        req.session = session.session;
      }
      next();
    })
    .catch(() => {
      next();
    });
}
