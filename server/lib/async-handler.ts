import type { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler so that rejected promises are
 * forwarded to the Express error-handling middleware via `next(err)`
 * instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
