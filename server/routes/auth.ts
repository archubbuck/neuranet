/**
 * Auth routes — proxies requests to the Neon Auth managed service.
 *
 * The Express server acts as a transparent proxy: it forwards incoming
 * /api/auth/* requests to the Neon-hosted Better Auth instance, passes
 * Set-Cookie headers back to the browser, and returns the response body
 * as-is. Session verification for protected routes goes through
 * `getSession()` which calls Neon Auth's `/get-session` endpoint.
 *
 * Sign-in/email and sign-up/email have dedicated handlers that unwrap
 * Neon Auth's `{ user: {...} }` response into the flat `AuthUser` shape
 * expected by the frontend.
 */
import { Router } from 'express';
import type { Response } from 'express';
import config from '../config.js';
import { getSession, proxyToNeonAuth, toHeadersInit } from '../auth.js';
import { asyncHandler } from '../lib/async-handler.js';
import { validateBody } from '../middleware/validate.js';
import * as schemas from '../schemas.js';

const router = Router();

/**
 * Extracts the auth-relative path from the incoming request, stripping
 * the /api/auth mount prefix so it can be appended to the Neon Auth
 * service URL.
 */
function authPath(req: import('express').Request): string {
  return req.originalUrl.replace(/^\/api\/auth/, '') || '/';
}

/**
 * Forward all Set-Cookie headers from a Neon Auth response to the
 * Express response. `res.setHeader` overwrites on each call, so we
 * collect all values and set them as an array — otherwise only the
 * last cookie survives and the session token is lost.
 */
function forwardSetCookies(responseHeaders: Headers, res: Response): void {
  const cookies: string[] = [];
  responseHeaders.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      cookies.push(value);
    }
  });
  if (cookies.length > 0) {
    res.setHeader('Set-Cookie', cookies);
  }
}

/**
 * Core proxy handler — forwards the request to Neon Auth and streams
 * the response back to the client.
 */
const proxyHandler = asyncHandler(async (req, res) => {
  const neonResponse = await proxyToNeonAuth(
    req.method,
    authPath(req),
    toHeadersInit(req.headers),
    ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  );

  res.status(neonResponse.status);

  // Forward response headers, preserving Set-Cookie for session management.
  const skipHeaders = new Set(['content-encoding', 'transfer-encoding']);
  neonResponse.headers.forEach((value, key) => {
    if (skipHeaders.has(key.toLowerCase())) return;
    if (key.toLowerCase() === 'set-cookie') return; // handled below
    res.setHeader(key, value);
  });
  forwardSetCookies(neonResponse.headers, res);

  const body = await neonResponse.text();
  if (body) res.send(body);
  else res.end();
});

// ── Local convenience endpoints ──────────────────────────────────────

/**
 * GET /auth/me — returns the current user profile if authenticated.
 * Used by the frontend to check session state on app bootstrap.
 */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const session = await getSession(req.headers);
    if (!session) {
      res.status(401).json({ message: 'not authenticated' });
      return;
    }
    res.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ?? undefined,
    });
  }),
);

/**
 * GET /auth/providers — returns the list of available OAuth providers.
 * The frontend uses this to show/hide provider buttons on the login screen.
 */
router.get('/providers', (_req, res) => {
  res.json(config.availableProviders);
});

// ── Proxied endpoints ────────────────────────────────────────────────

/**
 * GET /auth/sign-in/:provider — initiates OAuth sign-in.
 * Proxied to Neon Auth; the browser follows the OAuth redirect chain.
 */
router.get('/sign-in/:provider', proxyHandler);

/**
 * GET /auth/callback — OAuth callback.
 * Neon Auth exchanges the code, creates a session, and redirects to the app.
 */
router.get('/callback', proxyHandler);

/**
 * GET /auth/sign-out — clears the session.
 * Neon Auth removes the session cookie.
 */
router.get('/sign-out', proxyHandler);

/**
 * POST /auth/sign-in/email — email/password sign-in.
 * Body validated locally (zod), then proxied to Neon Auth.
 * Unwraps Neon Auth's `{ user: {...} }` into the flat `AuthUser` shape.
 */
router.post(
  '/sign-in/email',
  validateBody(schemas.signInEmail),
  asyncHandler(async (req, res) => {
    const neonResponse = await proxyToNeonAuth(
      req.method,
      authPath(req),
      toHeadersInit(req.headers),
      req.body,
    );

    res.status(neonResponse.status);
    forwardSetCookies(neonResponse.headers, res);

    const data = await neonResponse.json();
    if (!neonResponse.ok) {
      res.json(data);
      return;
    }

    res.json({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      image: data.user.image ?? undefined,
    });
  }),
);

/**
 * POST /auth/sign-up/email — email/password sign-up.
 * Body validated locally (zod), then proxied to Neon Auth.
 * Unwraps Neon Auth's `{ user: {...} }` into the flat `AuthUser` shape.
 */
router.post(
  '/sign-up/email',
  validateBody(schemas.signUpEmail),
  asyncHandler(async (req, res) => {
    const neonResponse = await proxyToNeonAuth(
      req.method,
      authPath(req),
      toHeadersInit(req.headers),
      req.body,
    );

    res.status(neonResponse.status);
    forwardSetCookies(neonResponse.headers, res);

    const data = await neonResponse.json();
    if (!neonResponse.ok) {
      res.json(data);
      return;
    }

    res.status(201).json({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      image: data.user.image ?? undefined,
    });
  }),
);

// Catch-all for any other Neon Auth endpoints (e.g. magic link, email
// verification, password reset) that Better Auth exposes.
// Express 5 / path-to-regexp v8 requires a named catch-all.
router.all('/{*path}', proxyHandler);

export default router;
