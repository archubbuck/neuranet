/**
 * Centralised runtime configuration. All env vars are read here so the
 * rest of the codebase never touches `process.env` directly.
 *
 * Imports `server/env.ts` for POSTGRES_URL / DB_DRIVER resolution —
 * do NOT call `process.loadEnvFile` or read `process.env.POSTGRES_URL`
 * directly elsewhere.
 */

import { getPostgresUrl, getDbDriver } from './env.js';

export default {
  /** Resolved Postgres connection string — never reads process.env directly. */
  get postgresUrl(): string {
    return getPostgresUrl();
  },
  /** Explicit DB driver selection. */
  get dbDriver(): 'neon-http' | 'pg' {
    return getDbDriver();
  },
  port: Number(process.env['API_PORT'] || 3000),
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
  /** Neon Auth managed service URL — the Neon-hosted Better Auth instance.
   *  Set by `vercel env add NEON_AUTH_SERVICE_URL`. When set, the backend
   *  proxies all /api/auth/* requests to this URL instead of running a
   *  local Better Auth instance.
   *  Example: https://ep-xxx.neonauth.c-9.us-east-1.aws.neon.tech/neondb/auth */
  neonAuthServiceUrl: process.env['NEON_AUTH_SERVICE_URL'] || '',
  /** Available OAuth providers shown on the login screen.
   *  When using the Neon Auth managed service (NEON_AUTH_SERVICE_URL set),
   *  providers are configured in the Neon Console and the frontend reads
   *  a static list here. In self-hosted mode, each provider requires both
   *  clientId and clientSecret env vars. */
  get availableProviders(): { id: string; label: string }[] {
    // Managed mode: providers configured in Neon Console.
    if (process.env['NEON_AUTH_SERVICE_URL']) {
      return [{ id: 'google', label: 'Google' }];
    }
    // Self-hosted mode: providers enabled via env vars.
    const providers: { id: string; label: string }[] = [];
    if (process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']) {
      providers.push({ id: 'google', label: 'Google' });
    }
    if (process.env['GITHUB_CLIENT_ID'] && process.env['GITHUB_CLIENT_SECRET']) {
      providers.push({ id: 'github', label: 'GitHub' });
    }
    if (process.env['MICROSOFT_CLIENT_ID'] && process.env['MICROSOFT_CLIENT_SECRET']) {
      providers.push({ id: 'microsoft', label: 'Microsoft' });
    }
    if (process.env['LINKEDIN_CLIENT_ID'] && process.env['LINKEDIN_CLIENT_SECRET']) {
      providers.push({ id: 'linkedin', label: 'LinkedIn' });
    }
    return providers;
  },
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
    /** Keywords extracted from a web page title + body. */
    webKeywordCount: 12,
  },
} as const;
