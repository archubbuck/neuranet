# ADR 009 — GraphRAG: vector search, WebGL graph, and AI inspector

Date: 2026-06-19 · Status: accepted

## Context

The topic visualizer currently uses keyword-based derivation (`server/lib/derivation.ts`),
ILIKE text search (`server/repositories/search.repo.ts`), and an SVG radial-layout graph
(`src/app/screens/network/network-graph.component.ts`). These approaches have limitations:

- **Search** is lexical only — "machine learning" won't match "neural networks" despite
  semantic proximity.
- **SVG rendering** degrades above ~200 nodes; DOM node count per circle/line/text element
  causes frame drops during pan/zoom.
- **No AI-assisted exploration** — users must manually interpret clusters without
  LLM-generated summaries or context-aware Q&A.

The plan is to adopt a **GraphRAG** architecture: vector-based semantic search, WebGL
graph rendering, AI-powered inspector panel, and community detection via Leiden algorithm.

## Decision

### 1. pgvector extension for semantic search

Add `VECTOR(1536)` columns to `docs` and `derived_nodes` with HNSW indexing.

- **Embedding model**: `text-embedding-3-small` (1536 dimensions) via Vercel AI SDK.
- **Generation**: server-side during ingestion (`POST /api/docs`, `POST /api/sources/:id/fetch`).
- **Search**: cosine similarity (`<=>`) with `ORDER BY embedding <=> $1 LIMIT N`.
- **Existing ILIKE search** retained as fallback.

### 2. sigma.js + graphology for WebGL rendering

Replace the SVG-based `NetworkGraphComponent` with sigma.js v3 (WebGL renderer) +
graphology (graph data structure).

- **WebGL** handles tens of thousands of nodes at 60fps.
- **LOD**: labels hidden below `labelRenderedSizeThreshold`, edges hidden below
  `edgeRenderedSizeThreshold`.
- **NgZone isolation**: sigma.js initialized inside `ngZone.runOutsideAngular()`.
- **Click → Angular**: sigma events re-enter zone via `ngZone.run()` for store updates.

### 3. Vercel AI SDK for LLM integration

Use `ai` + `@ai-sdk/openai` for multi-provider LLM abstraction, consistent with the
existing Vercel deployment (ADR-007).

- **Chat**: streaming `streamText()` with subgraph context bounded to selected node.
- **Actions**: non-streaming structured completions (summarize, explain, best practices).
- **Embeddings**: `embed()` for `text-embedding-3-small`.

### 4. Python Leiden microservice for community detection

Leiden algorithm (community detection) has no production-grade TypeScript implementation.
A small Python FastAPI service using `networkx` + `leidenalg` will:

- Accept a cluster slug, fetch its subgraph from Postgres.
- Run Leiden partitioning.
- Generate community summaries via LLM.
- Write results to `derived_nodes.metadata`.

Runs as a Docker Compose service, called via HTTP from Express.

### 5. ForceAtlas2 layout in a Web Worker

The `graphology-layout-forceatlas2` algorithm runs in a dedicated Web Worker to keep
the main thread unblocked during layout convergence. Serialized node positions are
batched back to the sigma.js graph outside Angular's zone.

### 6. Extend existing tables (not create new ones)

The original proposal suggested new `documents`, `nodes`, `edges` tables. The project
already has `docs`, `derived_nodes`, `node_links` with Drizzle ORM. We extend these:

| Existing table | New columns |
|---|---|
| `docs` | `embedding vector(1536)` |
| `derived_nodes` | `embedding vector(1536)`, `metadata jsonb` |
| `node_links` | `weight real`, `metadata jsonb` |
| `doc_node_links` | `metadata jsonb` |

## Consequences

### Positive

- **Semantic search** finds related concepts across different phrasings.
- **WebGL graph** stays performant at scale (10K+ nodes).
- **AI inspector** enables non-expert users to explore complex topic graphs.
- **Community detection** surfaces emergent themes automatically.

### Negative

- **Cold start**: `text-embedding-3-small` adds ~200ms per embedding call during ingestion.
- **Vercel timeout risk**: large documents may exceed 30s function timeout; chunking required.
- **Dependency footprint**: `sigma` (~200KB), `graphology` (~100KB), `ai` (~50KB) increase
  bundle and cold start.
- **Operational complexity**: Leiden microservice is a new deployment unit; if unavailable,
  community reports are missing but the rest of the system functions.
- **pgvector on Neon**: vector indexes consume additional storage; verify free tier limits.

### Files affected

- `server/db/schema.ts` — extended with vector + jsonb columns
- `server/lib/sql-helpers.ts` — recursive CTE helper
- `server/lib/embeddings.ts` — new: embedding generation
- `server/repositories/search.repo.ts` — vector search method
- `server/repositories/network.repo.ts` — subgraph retrieval
- `server/repositories/nodes.repo.ts` — metadata-aware get
- `server/routes/ai.ts` — new: chat + action endpoints
- `server/schemas.ts` — new validation schemas
- `server/config.ts` — AI provider configuration
- `src/app/screens/network/network-graph.component.ts` — rewritten for sigma.js
- `src/app/screens/network/inspector-panel.component.ts` — new: AI inspector
- `src/app/screens/network/layout.worker.ts` — new: ForceAtlas2 worker
- `src/app/ui/primitives/chat-message.component.ts` — new UI primitive
- `src/app/data/types.ts` — extended types
- `src/app/data/api.service.ts` — new AI methods
- `src/app/data/app.store.ts` — AI state signals
- `services/community-detection/` — new: Python microservice
- `docker-compose.yml` — add community-detection service
