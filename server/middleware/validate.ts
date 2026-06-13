/**
 * Request-body validation middleware. On success the parsed (trimmed,
 * defaulted) value replaces `req.body`; on failure the client receives a
 * 400 with field-level errors and the handler never runs.
 */
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export function validateBody(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'invalid request body',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
