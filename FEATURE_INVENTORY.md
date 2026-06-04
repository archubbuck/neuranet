# Topic Visualizer — Complete Feature Inventory

## Overview

Topic Visualizer is an Angular 21 + Node.js/Express application that lets users create **workspaces** — isolated areas where they link **data sources** (Reddit threads, uploaded documents) to automatically extract **topics**, build a **D3 force-directed network graph**, and explore connections between concepts.

**Stack**: Angular 21.2, D3 v7, Express 5, better-sqlite3, TypeScript 5.9, pnpm, Vitest

---

## Architecture

```
Frontend (Angular 21, port 4200)
    │
    │  proxy: /api → localhost:3000
    ▼
Backend (Express 5, port 3000)
    │
    ▼
SQLite (better-sqlite3, data/topic-visualizer.db)
```

The Angular dev server proxies `/api/*` requests to the Express backend using `proxy.conf.json`.

---

## File Inventory

### Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Scripts (`start`, `start:api`, `test`, `build`), dependencies (Angular 21, D3 v7, Express 5, better-sqlite3, rxjs), devDeps (Vitest, Prettier, TypeScript 5.9, jsdom) |
| `angular.json` | Angular CLI config: uses `@angular/build:application` builder, browser entry `src/main.ts`, styles `src/styles.css`, assets from `public/`, `app` prefix |
| `tsconfig.json` | Root TS config: strict mode, ES2022 target, module preserve, experimental decorators. References `tsconfig.app.json` and `tsconfig.spec.json` |
| `proxy.conf.json` | `{ "/api": { "target": "http://localhost:3000", "secure": false, "changeOrigin": true } }` |
| `pnpm-lock.yaml` | Lockfile for pnpm 9.15.9 |

### Frontend — Source Files

| File | Purpose | Imports | Exports |
|------|---------|---------|---------|
| `src/main.ts` | Bootstraps the Angular app | `bootstrapApplication`, `App`, `appConfig` | — |
| `src/index.html` | HTML shell: `<app-root>`, Space Grotesk font from Google Fonts, dark background | — | — |
| `src/styles.css` | Global reset: `box-sizing`, zero margin/padding, `#0b0b18` background, Space Grotesk font, hidden overflow on html/body | — | — |
| `src/app/app.ts` | Root component — just `<router-outlet>` | `RouterOutlet` | `App` (component) |
| `src/app/app.spec.ts` | 2 tests: app created, router-outlet rendered | `TestBed`, `App` | — |
| `src/app/app.config.ts` | App config: provides `HttpClient`, `Router(routes)`, global error listeners | `provideHttpClient`, `provideRouter`, `routes` | `appConfig` |
| `src/app/app.routes.ts` | Route table | `Routes`, all page components | `routes` (the Route array) |
| `src/app/topicnet-data.ts` | **Central data model**: all TypeScript interfaces, constants, helpers | — | See below |

#### Data Model (`topicnet-data.ts`)

**Interfaces:**
- `ClusterDef { id, label, color, count }` — A cluster of related topics
- `TopicNode { id, label, cluster, r, importance, degree, desc }` — A node in the network graph
- `Workspace { id, name, description, createdAt, updatedAt, sourceCount? }` — An isolated project area
- `DataSource { id, workspaceId, sourceType, config, status, statusMessage?, createdAt }` — A linked data source
- `RedditSourceConfig { threadUrl }` — Config shape for Reddit sources
- `DataSourceConfig` — Union type for all source configs (currently just RedditSourceConfig)
- `DataSourceType` — `'reddit'` (extensible)
- `DataSourceStatus` — `'pending' | 'fetching' | 'done' | 'error'`
- `DepthNode extends TopicNode { isCentral, depth }` — Node with depth/layout metadata
- `TopicDoc { id, title, text, status, derivedNodeSlugs? }` — An uploaded document
- `TopicEdge { source, target, kind? }` — An edge between two nodes
- `NetworkOverlay { derivedClusters, derivedNodes, derivedEdges }` — API response shape

**Constants:**
- `CLUSTER_DEFS` — 6 hardcoded clusters (deprecated, kept for legacy)
- `TOPICS` — 34 hardcoded seed topics (deprecated, kept for legacy)
- `EDGES_RAW` — Hardcoded edge pairs (deprecated, kept for legacy)
- `TN` — Theme object: `{ bg, panel, panel2, border, border2, amber, amberBg, text, mid, dim, navH:54, sbW:280, detW:340 }` — all dark-mode colors and layout dimensions

**Helper functions:**
- `clusterColor(clusterId): string` — Look up color from CLUSTER_DEFS
- `getNeighbours(nodeId): TopicNode[]` — Find neighbors from EDGES_RAW (deprecated)

#### Services

| File | Purpose | Methods |
|------|---------|---------|
| `src/app/services/docs-api.service.ts` | HTTP client for all API calls | `listWorkspaces()`, `getWorkspace(id)`, `createWorkspace(input)`, `updateWorkspace(id,input)`, `deleteWorkspace(id)`, `listSources(workspaceId)`, `createSource(workspaceId,input)`, `deleteSource(workspaceId,sourceId)`, `fetchSource(workspaceId,sourceId)`, `getNetworkOverlay(workspaceId)`, `listDocs(workspaceId)`, `createDoc(workspaceId,input)`, `legacyListDocs()`, `legacyGetNetworkOverlay()`, `legacyCreateDoc(input)` |
| `src/app/services/docs-api.service.spec.ts` | 4 tests: loads docs, creates doc, loads network overlay, handles network API failure | — |

#### Pages (Route-level Components)

| File | Route | Purpose | Inputs/Outputs |
|------|-------|---------|----------------|
| `src/app/pages/workspace-list-page.component.ts` | `/` | Grid of workspace cards with create form. Fetches from `GET /api/workspaces`. | No inputs. Uses `DocsApiService`, `Router`. |
| `src/app/pages/workspace-page.component.ts` | `/workspace/:id` | Workspace detail view: network canvas + source panel. Fetches from `GET /api/workspaces/:id/network` and `GET /api/workspaces/:id/sources`. | Uses route params (`:id`). Composes `NavbarComponent`, `SidebarComponent`, `NetworkCanvasComponent`, `DetailPanelComponent`, `SourcePanelComponent`. |
| `src/app/pages/network-page.component.ts` | `/network` (legacy) | Original network view with static seed topics. Uses deprecated `TOPICS`/`EDGES_RAW`/`CLUSTER_DEFS`. | No inputs. Uses `DocsApiService`, `Router`. |
| `src/app/pages/upload-page.component.ts` | `/workspace/:id/upload` or `/upload` (legacy) | Document upload form. Gets `workspaceId` from route params; uses workspace-scoped or legacy API. | Uses route params. Composes `NavbarComponent`, `UploadViewComponent`. |
| `src/app/pages/upload-page.component.spec.ts` | — | 2 tests: appends saved docs, sets saveError on failure | — |

#### Components

| File | Selector | Purpose | Inputs | Outputs |
|------|----------|---------|--------|---------|
| `src/app/components/navbar.component.ts` | `app-navbar` | Top navigation bar. Shows workspace name + breadcrumb when `workspaceId` is set; shows legacy tabs otherwise. Logo links to `/`. | `activeTab`, `sidebarOpen`, `showSidebarToggle`, `workspaceName`, `workspaceId` | `tab`, `toggleSidebar` |
| `src/app/components/sidebar.component.ts` | `app-sidebar` | Left sidebar listing clusters with counts, bar charts, and click-to-filter. | `open`, `activeCluster`, `clusters` | `clusterClick` |
| `src/app/components/network-canvas.component.ts` | `app-network-canvas` | **D3 force-directed graph**. Renders nodes as colored circles with labels, edges as lines, dot-grid background, zoom/pan, drag. Node click emits selection; background click deselects. Cluster filter dims unrelated nodes/edges. Stats bar at bottom-left. | `nodes`, `edges`, `clusters`, `selectedNode`, `activeCluster`, `docsCount` | `nodeClick` |
| `src/app/components/detail-panel.component.ts` | `app-detail-panel` | Slide-out panel from right. Shows selected node: cluster badge, label, description, degree stat, importance stat, related topics as color-coded chips. | `node`, `open`, `nodes`, `edges`, `clusters` | `close` |
| `src/app/components/upload-view.component.ts` | `app-upload-view` | Document upload form. Drag-and-drop zone for .txt/.md files, textarea for paste, title input. Shows processed docs queue. | `docs`, `saveError` | `add`, `viewNetwork` |
| `src/app/components/upload-view.component.spec.ts` | — | 3 tests: emits add event, clears form after save, shows saveError | — | — |
| `src/app/components/source-panel.component.ts` | `app-source-panel` | Slide-in panel listing workspace data sources. "Add Source" toggles Reddit URL form. Shows source type badge, URL preview, status (color-coded: pending/fetching/done/error), delete button. | `sources` | `addSource`, `deleteSource` |

#### D3 Network Canvas — Detailed Behavior

The `NetworkCanvasComponent` uses D3 v7 force simulation:

1. **Init**: Reads `svgRoot` element, creates SVG with dot-grid pattern background
2. **Force layout**: `forceSimulation` with `forceLink` (distance based on node radii, strength 0.6), `forceManyBody` (charge based on node radius × 18), `forceCenter`, `forceCollide` (radius + 8px padding), `alphaDecay` 0.02
3. **Node rendering**: Each node is a `<g>` with:
   - Selection ring (`circle.sel-ring`, radius + 6, amber stroke, hidden by default)
   - Halo (`circle.halo`, radius = node.r, cluster color, 0.15 opacity)
   - Body (`circle.body`, radius = node.r, cluster color fill + stroke)
   - Label (`text`, only if node.r ≥ 16, font size proportional to radius)
4. **Edge rendering**: Lines with subtle white color, endpoints pushed to node perimeters using trig math on tick
5. **Drag**: Nodes can be dragged — on drag, position is pinned; on release, they float free again
6. **Zoom/Pan**: `d3.zoom()` with scale extents [0.3, 3]
7. **Selection**: Clicking a node emits `nodeClick`; clicking background emits `nodeClick(null)`. Selection ring and halo opacity animate on selection change.
8. **Cluster filter**: When `activeCluster` is set, unrelated nodes dim to 0.15 opacity, unrelated edges to 0.03 opacity
9. **Stats bar**: Absolute-positioned at bottom-left showing node count, edge count, document count

### Backend — Server Files

| File | Purpose |
|------|---------|
| `server/index.js` | Express API server with SQLite database |
| `server/reddit-fetcher.js` | Reddit thread fetcher using Reddit's public JSON API |

#### `server/index.js` — API Endpoints

**Database tables:** `docs`, `derived_clusters`, `derived_nodes`, `node_links`, `doc_node_links`, `workspaces`, `data_sources`

All pre-existing tables have `workspace_id` FK columns added via migration. `derived_nodes` also has `depth` (INTEGER) and `is_central` (INTEGER) columns.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health check: `{ status: 'ok' }` |
| **Workspace CRUD** | | |
| `POST` | `/api/workspaces` | Create workspace. Body: `{ name, description? }`. Returns created workspace. |
| `GET` | `/api/workspaces` | List all workspaces with `sourceCount` from LEFT JOIN. |
| `GET` | `/api/workspaces/:id` | Get workspace by ID with `sourceCount`. 404 if not found. |
| `PUT` | `/api/workspaces/:id` | Update workspace name/description. |
| `DELETE` | `/api/workspaces/:id` | Cascade-delete workspace and all associated data sources, docs, nodes, edges, clusters, links. |
| **Data Source CRUD** | | |
| `POST` | `/api/workspaces/:id/sources` | Create data source. Body: `{ sourceType, config }`. Validates: `sourceType` required, `config.threadUrl` required for Reddit. |
| `GET` | `/api/workspaces/:id/sources` | List data sources for workspace (parses `config_json`). |
| `DELETE` | `/api/workspaces/:id/sources/:sourceId` | Delete a data source. |
| **Source Fetch** | | |
| `POST` | `/api/workspaces/:id/sources/:sourceId/fetch` | Triggers data ingestion. Only supports `sourceType: 'reddit'`. Calls `redditFetcher.fetchThread()`, creates central node (depth 0), extracts depth-1 topics from title+body, extracts depth-2 sub-topics from comments (matched to depth-1 parents via `scoreTopicMatch`), cross-links depth-1 nodes. Updates source status to `done` or `error`. Returns `{ source, nodeCount, edgeCount }`. |
| **Workspace-scoped network** | | |
| `GET` | `/api/workspaces/:id/network` | Returns `{ derivedClusters, derivedNodes, derivedEdges }` for workspace. Nodes include `depth` and `isCentral` fields. |
| **Workspace-scoped docs** | | |
| `GET` | `/api/workspaces/:id/docs` | List docs for workspace with `derivedNodeSlugs`. |
| `POST` | `/api/workspaces/:id/docs` | Create doc scoped to workspace, extract keywords, create derived nodes/clusters/edges. |
| **Legacy (deprecated)** | | |
| `GET` | `/api/docs` | Returns empty array. |
| `GET` | `/api/network` | Returns `{ derivedClusters:[], derivedNodes:[], derivedEdges:[] }`. |
| `POST` | `/api/docs` | Legacy doc creation without workspace scope. |

**Helpers in `server/index.js`:**
- `STOPWORDS` — Set of ~50 English stopwords
- `slugify(value)` — Lowercase, strip non-alphanumeric, replace spaces with hyphens
- `tokenize(value)` — Lowercase, strip non-alphanumeric, split on whitespace, filter tokens > 2 chars and not in STOPWORDS
- `titleCase(value)` — Capitalize each word
- `colorFromSlug(slug)` — Hash-based HSL color generator: `hsl(${hash%360} 72% 62%)`
- `topKeywords(text, maxCount)` — Tokenize, count frequencies, return top N tokens
- `scoreTopicMatch(tokens, topicLabel)` — Match tokens against a topic label: +2 for exact token match, +1 for substring/starts-with

#### `server/reddit-fetcher.js` — Exports

- `fetchThread(rawUrl)` — Normalizes URL → appends `.json` → fetches with User-Agent header → parses JSON response → returns `{ threadId, title, body, comments: [{body, depth}] }`. Handles 404, 429 (rate limit), and unexpected responses.
- `normalizeUrl(rawUrl)` — Strips trailing slashes/`.json`, ensures `https://`, validates `reddit.com` domain, normalizes hostname to `www.reddit.com`, appends `.json`.
- `extractThreadId(url)` — Extracts thread ID from `/comments/<id>/` pattern.
- `flattenComments(commentData, depth, maxDepth)` — Recursively flattens Reddit comment tree into `[{body, depth}]` array, up to `maxDepth` (default 3), skipping "more" links and deleted comments.

---

## Feature Walkthrough

### 1. Workspace Management
- Landing page (`/`) shows a card grid of all workspaces
- Each card shows name, description, source count, "Open →" link
- "New Workspace" button reveals inline form (name + optional description)
- Empty state with CTA when no workspaces exist
- Clicking a card navigates to `/workspace/:id`
- Workspace deletion cascades: removes all sources, nodes, edges, docs

### 2. Workspace Network View
- Route: `/workspace/:id`
- Navbar shows breadcrumb: `TopicNet / Workspace Name` with `Network` and `Upload` tab links
- Left sidebar lists clusters with item counts and bar charts for the workspace
- Center: D3 force-directed network graph
  - Nodes colored by cluster, sized by importance/radius
  - Edges show connections
  - Drag nodes to reposition
  - Zoom/pan with scroll/pinch
  - Click node → detail panel slides in from right
  - Click background → deselect
  - Click cluster in sidebar → filter (dims unrelated nodes/edges)
  - Stats bar at bottom-left: N nodes, N edges, N documents
- Detail panel shows: cluster badge, node label, description, degree stat, importance stat, related topic chips
- "Data Sources" button (bottom-right) toggles source panel

### 3. Data Sources & Reddit Integration
- Source panel lists all data sources with type badge, URL, status, delete button
- Status colors: yellow=pending, blue=fetching, green=done, red=error
- "Add Source" → shows Reddit URL input form
- Paste any public Reddit thread URL → "Fetch Thread"
- Backend fetches thread via Reddit JSON API (no auth), extracts topics, builds network:
  - **Central node** (depth 0): the Reddit thread itself
  - **Depth-1 nodes**: keywords from thread title + body, linked to central node as `central-topic` edges
  - **Depth-2 nodes**: sub-topics from comments, matched to best depth-1 parent via token overlap, linked as `topic-subtopic` edges
  - Depth-1 nodes cross-linked as `related-topic` edges

### 4. Document Upload (Workspace-scoped)
- Route: `/workspace/:id/upload`
- Drag-and-drop .txt/.md files or paste text
- Enter optional title
- Click "Add Document" → backend extracts top 4 keywords → creates derived nodes in a new cluster → links them with `same-doc` edges
- Processed docs appear in queue below form
- "View Network" button returns to workspace network

### 5. Theme & Visual Design
- Dark mode throughout: `#0b0b18` background, matching panel colors
- Amber (`#f59e0b`) accent color for active states, buttons
- Space Grotesk font from Google Fonts
- All sizing from centralized `TN` constants object
- Smooth transitions on sidebar collapse, detail panel slide, node selection

---

## Route Table

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `WorkspaceListPageComponent` | Workspace list with create form |
| `/workspace/:id` | `WorkspacePageComponent` | Workspace network view |
| `/workspace/:id/upload` | `UploadPageComponent` | Upload docs to workspace |
| `/network` | `NetworkPageComponent` | Legacy network view (deprecated) |
| `/upload` | `UploadPageComponent` | Legacy upload (deprecated) |
| `**` | redirect to `/` | Catch-all |

---

## Scripts (package.json)

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `ng serve --proxy-config proxy.conf.json` | Angular dev server with API proxy |
| `start:api` | `node server/index.js` | Express API server |
| `build` | `ng build` | Production build |
| `test` | `ng test --no-watch --no-progress` | Run tests once (Vitest) |
| `test:watch` | `ng test` | Run tests in watch mode |

---

## Database Schema

```sql
-- Core tables (pre-existing, migrated with workspace_id)
docs (id PK, title, text, status, created_at, workspace_id FK)
derived_clusters (id PK, slug UNIQUE, label, color, created_at, workspace_id FK)
derived_nodes (id PK, slug UNIQUE, label, description, cluster_slug FK, radius, importance, depth DEFAULT 0, is_central DEFAULT 0, created_at, workspace_id FK)
node_links (id PK, source_slug, target_slug, link_kind, created_at, UNIQUE(source,target), workspace_id FK)
doc_node_links (doc_id FK, node_slug FK, score, created_at, PK(doc_id,node_slug), workspace_id FK)

-- New tables
workspaces (id PK, name, description, created_at, updated_at)
data_sources (id PK, workspace_id FK CASCADE, source_type, config_json, status, status_message, created_at)
```

---

## Test Summary

**11 tests, all passing** (Vitest v4):

| File | Tests |
|------|-------|
| `app.spec.ts` | 2: app created, router-outlet rendered |
| `docs-api.service.spec.ts` | 4: loads docs, creates doc, loads network overlay, handles network API failure |
| `upload-view.component.spec.ts` | 3: emits add event, clears form after save, shows saveError |
| `upload-page.component.spec.ts` | 2: appends saved docs, sets saveError on create failure |

---

## Key Design Decisions

1. **Fully isolated workspaces** — each has its own network; no cross-workspace sharing
2. **No seed topics** — workspaces start empty; all nodes come from data sources
3. **Extensible data source model** — `source_type` + `config_json` allows adding new types without schema changes
4. **Central node pattern** — Reddit-specific: thread is depth-0 center, topics radiate outward by specificity
5. **Depth metadata** — `derived_nodes.depth` and `derived_nodes.is_central` columns support radial layouts
6. **Reddit JSON API** — no auth needed for public threads; append `.json` to any URL
7. **All standalone components** — no NgModules, using Angular 21 standalone APIs
8. **OnPush change detection** — used on all data-display components
9. **Inline templates and styles** — all components use `template` and `styles` in decorator (except App which uses templateUrl/styleUrl)
10. **Workspace-scoped API** — all data endpoints are prefixed with `/api/workspaces/:id/`; legacy endpoints kept for backward compat
