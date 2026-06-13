/**
 * Centralised runtime configuration. All env vars are read here so the
 * rest of the codebase never touches `process.env` directly.
 */

// Load .env.local if present (local dev). Silently skip on Vercel.
try { process.loadEnvFile('.env.local'); } catch { /* optional */ }

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

export default {
  port: Number(process.env['API_PORT'] || 3000),
  dataDir,
  // `NEURANET_DB_PATH` lets tests point at an in-memory or temp database
  // (`:memory:` or `/tmp/foo.db`) instead of clobbering the dev DB.
  dbPath: process.env['NEURANET_DB_PATH'] || path.join(dataDir, 'neuranet.db'),
  rateLimits: {
    globalPerMinute: Number(process.env['NEURANET_GLOBAL_RATE_MAX'] ?? 1_000),
    fetchPerSourcePerMinute: Number(process.env['NEURANET_FETCH_RATE_MAX'] ?? 5),
  },
  /** Upstash Redis (optional — falls back to in-memory rate limiting). */
  upstash: {
    enabled: Boolean(
      process.env['UPSTASH_REDIS_REST_URL'] && process.env['UPSTASH_REDIS_REST_TOKEN'],
    ),
  },
  /** Resend API key for transactional email. */
  resendApiKey: process.env['RESEND_API_KEY'] || '',
  /** "From" address for waitlist confirmation emails (must be verified in Resend). */
  resendFromAddress: process.env['RESEND_FROM_ADDRESS'] || 'noreply@neuranetai.app',
  /** CORS origin for cross-origin requests. */
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
  /** Node environment. */
  nodeEnv: process.env['NODE_ENV'] || 'development',
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
} as const;
