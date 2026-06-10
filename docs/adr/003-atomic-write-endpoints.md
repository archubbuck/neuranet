# ADR 003 — Multi-step writes are atomic, server-side endpoints

Date: 2026-06-10 · Status: accepted

## Context

Several operations were orchestrated client-side as sequences of API calls
(`dissolveCluster` = N node updates + cluster delete; `bulkDeleteNodes` =
N deletes) or ran multi-statement writes server-side without a transaction
(doc derivation, Reddit fetch derivation). A failure mid-sequence left the
database — or the client's picture of it — corrupted.

## Decision

- Any operation that writes more than one row is a single endpoint whose
  writes are wrapped in `db.transaction()`:
  `POST /api/clusters/dissolve`, `POST /api/nodes/bulk-delete`,
  `POST /api/nodes/merge`, `POST /api/nodes/bulk-reassign`,
  `POST /api/docs`, `POST /api/sources/:id/fetch`.
- The client store issues exactly one request per logical operation and
  re-fetches (`loadAll`) afterwards when derived values (degree,
  doc-links) may have shifted.
- Edge reassignment during merge respects
  `UNIQUE(source_slug, target_slug)`: delete would-be self-loops first,
  `UPDATE OR IGNORE` the rest, sweep leftovers.

## Consequences

- Atomicity is testable: backend tests inject mid-write failures with
  `RAISE(ABORT)` triggers and assert zero partial rows.
- Client code must never loop API mutations; if a loop seems needed, the
  server is missing an endpoint.
