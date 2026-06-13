/**
 * Express app assembly. Routes live in `routes/`, shared infrastructure in
 * `db.ts` / `config.ts` / `middleware/`, and pure derivation helpers in
 * `lib/derivation.ts`.
 *
 * Exported (rather than always listening) so the test suite can drive the
 * app without binding the listener twice — the listener only runs when
 * this file is the process entry point.
 */
import express, { type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import config from './config';
import db from './db';
import { errorHandler } from './middleware/error';
import sourcesRoutes from './routes/sources';
import networkRoutes from './routes/network';
import searchRoutes from './routes/search';
import reportsRoutes from './routes/reports';
import clustersRoutes from './routes/clusters';
import nodesRoutes from './routes/nodes';
import docsRoutes from './routes/docs';

const app = express();

app.use(express.json({ limit: '1mb' }));

// Lenient global limiter (DoS backstop). The Reddit fetch route adds its
// own strict per-source limiter in `routes/sources.ts`.
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: config.rateLimits.globalPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'too many requests' },
  }),
);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api', sourcesRoutes);
app.use('/api', networkRoutes);
app.use('/api', searchRoutes);
app.use('/api', reportsRoutes);
app.use('/api', clustersRoutes);
app.use('/api', nodesRoutes);
app.use('/api', docsRoutes);

// Central error handler — must be registered after all routes.
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`SQLite API listening on http://localhost:${config.port}`);
  });
}

export { app, db };
export default app;
