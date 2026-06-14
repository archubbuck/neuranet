/**
 * Express app assembly. Routes live in `routes/`, shared infrastructure in
 * `db.ts` / `config.ts` / `middleware/`, and pure derivation helpers in
 * `lib/derivation.ts`.
 *
 * Exported (rather than always listening) so the test suite can drive the
 * app without binding the listener twice — the listener only runs when
 * this file is the process entry point.
 */
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import { errorHandler } from './middleware/error.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { logger } from './lib/logger.js';
import { createUpstashLimiter } from './lib/redis.js';
import { sql } from 'drizzle-orm';

// Route imports
import sourcesRouter from './routes/sources.js';
import networkRouter from './routes/network.js';
import searchRouter from './routes/search.js';
import reportsRouter from './routes/reports.js';
import clustersRouter from './routes/clusters.js';
import nodesRouter from './routes/nodes.js';
import docsRouter from './routes/docs.js';
import waitlistRouter from './routes/waitlist.js';

export const app = express();

// ── Security headers ──────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);

// ── Request ID ─────────────────────────────────────────────────────
app.use(requestIdMiddleware);

// ── Body parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Rate limiting ──────────────────────────────────────────────────
// Use Upstash Redis when configured (serverless-safe), fall back to
// in-memory express-rate-limit for local dev.
const upstash = createUpstashLimiter({
  requests: config.rateLimits.globalPerMinute,
  window: '60 s',
  prefix: 'neuranet-global',
});

if (upstash) {
  app.use(async (req, res, next) => {
    try {
      const key = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await upstash.limiter.limit(key);
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      if (!result.success) {
        res.status(429).json({ message: 'too many requests' });
        return;
      }
      next();
    } catch {
      // If Upstash is unreachable, allow the request through rather
      // than blocking all traffic.
      next();
    }
  });
} else {
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimits.globalPerMinute,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'too many requests' },
    }),
  );
}

// ── Health endpoints ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health/ready', async (_req, res) => {
  try {
    const { drizzle } = await import('./db.js');
    await drizzle.execute(sql`SELECT 1`);
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
});

app.use('/api', sourcesRouter);
app.use('/api', networkRouter);
app.use('/api', searchRouter);
app.use('/api', reportsRouter);
app.use('/api', clustersRouter);
app.use('/api', nodesRouter);
app.use('/api', docsRouter);
app.use('/api', waitlistRouter);

// Central error handler — must be registered after all routes.
app.use(errorHandler);

// Start the server only when this file is the entry point (not when
// imported by tests or the Vercel serverless handler).
const isEntryPoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API listening');
  });
}
