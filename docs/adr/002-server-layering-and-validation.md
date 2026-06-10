# ADR 002 — Server layering: routes / lib / db / config / middleware

Date: 2026-06-10 · Status: accepted

## Context

`server/index.js` was a ~770-line monolith mixing env reads, schema DDL,
keyword-derivation logic, validation, and every route handler. Input
validation was ad-hoc `typeof` checks, and error responses leaked
`err.message` internals.

## Decision

- `index.js` is assembly only: json body parser → global rate limiter →
  one router per domain (`routes/{sources,network,search,reports,clusters,nodes,docs}.js`)
  → central error handler. It keeps `module.exports = { app, db }` and a
  `require.main === module` listen guard so tests can import the app.
- `db.js` owns the connection, schema, and migrations. `config.js` owns
  ALL `process.env` reads plus derivation constants. Pure helpers
  (slugify, tokenize, topKeywords, colorFromSlug) live in `lib/derivation.js`.
- Every POST/PUT body is validated by a zod schema in `schemas.js` via the
  `validateBody` middleware; parsed values replace `req.body`.
- The central handler in `middleware/error.js` maps 4xx through and turns
  everything else into a generic 500; details are logged server-side only.

## Consequences

- The full backend suite passed unchanged across the split — the layering
  is behavior-preserving and tests remain the safety net for future moves.
- New endpoints follow: schema → route file → transaction (if multi-write)
  → tests → `ApiService` method → store action.
