/**
 * Central error handler. Known client errors (4xx, e.g. body-parser
 * SyntaxError) keep their status; everything else becomes a generic 500.
 * Internal details are logged server-side via pino, never sent to the client.
 */
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function errorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = Number(err.status ?? err.statusCode);
  if (status >= 400 && status < 500) {
    res.status(status).json({ message: 'invalid request' });
    return;
  }
  logger.error({ err, method: req.method, url: req.originalUrl }, 'unhandled error');
  res.status(500).json({ message: 'internal server error' });
}
