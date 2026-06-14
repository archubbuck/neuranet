/**
 * Vercel serverless entry point. Bridges the Vercel Node.js runtime
 * (IncomingMessage / ServerResponse) into the Express application.
 *
 * This file lives at `api/index.ts` so Vercel discovers it as the
 * handler for `/api/*` requests (see vercel.json rewrites).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../server/index.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
