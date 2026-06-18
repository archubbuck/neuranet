/**
 * Neon Auth managed service integration.
 *
 * Proxies auth requests to the Neon-hosted Better Auth instance instead
 * of running a local Better Auth server. The Neon Auth managed service
 * handles OAuth flows, session management, and identity storage in the
 * `neon_auth` database schema.
 *
 * Session verification calls the Neon Auth `/get-session` endpoint with
 * the incoming request cookies, so the middleware layer doesn't need its
 * own Better Auth instance.
 */
import type { IncomingHttpHeaders } from 'node:http';
import config from './config.js';

const NEON_AUTH_URL = config.neonAuthServiceUrl;

/**
 * Converts Express `IncomingHttpHeaders` to a plain `Record<string, string>`
 * suitable for fetch headers or cookie forwarding.
 */
export function toHeadersInit(headers: IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      out[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return out;
}

/**
 * Retrieves the current session from Neon Auth by forwarding the request
 * cookies to the managed service. Returns `null` when no valid session
 * cookie is present or the service is unreachable.
 */
export async function getSession(headers: IncomingHttpHeaders) {
  if (!NEON_AUTH_URL) return null;
  try {
    const h = toHeadersInit(headers);
    const response = await fetch(`${NEON_AUTH_URL}/get-session`, {
      headers: {
        cookie: h['cookie'] || '',
        accept: 'application/json',
      },
      redirect: 'manual',
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Proxies an auth request to the Neon Auth managed service.
 *
 * Forwards the request method, path (relative to the auth base), cookies,
 * and body (for mutating requests) to Neon Auth. Redirects are NOT
 * followed — they're passed back to the client so the browser handles
 * OAuth callback redirects natively.
 */
export async function proxyToNeonAuth(
  method: string,
  path: string,
  reqHeaders: Record<string, string>,
  body?: unknown,
): Promise<Response> {
  const fetchHeaders: Record<string, string> = {
    accept: 'application/json',
  };

  if (reqHeaders['content-type']) {
    fetchHeaders['content-type'] = reqHeaders['content-type'];
  }
  if (reqHeaders['cookie']) {
    fetchHeaders['cookie'] = reqHeaders['cookie'];
  }
  if (reqHeaders['authorization']) {
    fetchHeaders['authorization'] = reqHeaders['authorization'];
  }
  // Better Auth requires Origin for CORS and callbackURL resolution
  // (especially for OAuth sign-in and sign-up flows).
  if (reqHeaders['origin']) {
    fetchHeaders['origin'] = reqHeaders['origin'];
  }
  if (reqHeaders['referer']) {
    fetchHeaders['referer'] = reqHeaders['referer'];
  }

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
    redirect: 'manual',
    // 10-second timeout so the browser doesn't hang if Neon Auth is unreachable.
    signal: AbortSignal.timeout(10_000),
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = JSON.stringify(body);
  }

  return fetch(`${NEON_AUTH_URL}${path}`, fetchOptions);
}
