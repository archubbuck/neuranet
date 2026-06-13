/**
 * Vercel serverless entry point. Bridges the Vercel Node.js runtime
 * (IncomingMessage / ServerResponse) into the Express application.
 *
 * This file lives at `api/index.ts` so Vercel discovers it as the
 * handler for `/api/*` requests (see vercel.json rewrites).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server/index';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
