/**
 * Express app assembly. Routes live in `routes/`, shared infrastructure in
 * `db.js` / `config.js` / `middleware/`, and pure derivation helpers in
 * `lib/derivation.js`.
 *
 * Exported (rather than always listening) so the test suite can drive the
 * app without binding the listener twice — the listener only runs when
 * this file is the process entry point.
 */
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const config = require('./config');
const db = require('./db');
const { errorHandler } = require('./middleware/error');

const app = express();

app.use(express.json({ limit: '1mb' }));

// Lenient global limiter (DoS backstop). The Reddit fetch route adds its
// own strict per-source limiter in `routes/sources.js`.
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: config.rateLimits.globalPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'too many requests' },
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', require('./routes/sources'));
app.use('/api', require('./routes/network'));
app.use('/api', require('./routes/search'));
app.use('/api', require('./routes/reports'));
app.use('/api', require('./routes/clusters'));
app.use('/api', require('./routes/nodes'));
app.use('/api', require('./routes/docs'));

// Central error handler — must be registered after all routes.
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`SQLite API listening on http://localhost:${config.port}`);
  });
}

module.exports = { app, db };
