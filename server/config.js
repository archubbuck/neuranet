/**
 * Centralised runtime configuration. All env vars are read here so the
 * rest of the codebase never touches `process.env` directly.
 */
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');

module.exports = {
  port: Number(process.env.API_PORT || 3000),
  dataDir,
  // `TOPIC_VIZ_DB_PATH` lets tests point at an in-memory or temp database
  // (`:memory:` or `/tmp/foo.db`) instead of clobbering the dev DB.
  dbPath: process.env.TOPIC_VIZ_DB_PATH || path.join(dataDir, 'topic-visualizer.db'),
  rateLimits: {
    globalPerMinute: Number(process.env.TOPIC_VIZ_GLOBAL_RATE_MAX ?? 1_000),
    fetchPerSourcePerMinute: Number(process.env.TOPIC_VIZ_FETCH_RATE_MAX ?? 5),
  },
  derivation: {
    /** Keywords extracted per uploaded document. */
    docKeywordCount: 4,
    /** Depth-1 keywords extracted from a Reddit thread title + body. */
    threadKeywordCount: 8,
    /** Keywords extracted per top-level comment. */
    commentKeywordCount: 3,
    /** Top-level comments considered for depth-2 derivation. */
    maxTopLevelComments: 15,
  },
};
