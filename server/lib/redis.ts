import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { Duration } from '@upstash/ratelimit';

/**
 * Creates an Upstash Redis-backed rate limiter when UPSTASH_REDIS_REST_URL
 * and UPSTASH_REDIS_REST_TOKEN are configured. Falls back to `undefined`
 * when env vars are absent (local dev mode — use express-rate-limit
 * instead).
 */
export function createUpstashLimiter(opts: {
  requests: number;
  window: Duration;
  prefix: string;
}): { limiter: Ratelimit; kind: 'upstash' } | undefined {
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];

  if (!url || !token) return undefined;

  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.requests, opts.window),
    prefix: opts.prefix,
    ephemeralCache: new Map(),
  });

  return { limiter, kind: 'upstash' };
}
