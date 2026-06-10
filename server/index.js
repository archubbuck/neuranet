const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');
const redditFetcher = require('./reddit-fetcher');

const app = express();
const port = Number(process.env.API_PORT || 3000);
const dataDir = path.join(__dirname, '..', 'data');
// `TOPIC_VIZ_DB_PATH` lets tests point at an in-memory or temp database
// (`:memory:` or `/tmp/foo.db`) instead of clobbering the dev DB.
const dbPath = process.env.TOPIC_VIZ_DB_PATH || path.join(dataDir, 'topic-visualizer.db');

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'almost', 'also', 'among', 'and', 'another', 'any',
  'are', 'around', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'can',
  'cannot', 'could', 'data', 'does', 'done', 'each', 'either', 'enough', 'from', 'have', 'into', 'its',
  'just', 'like', 'many', 'more', 'most', 'much', 'must', 'need', 'only', 'other', 'our', 'over',
  'same', 'should', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'under', 'using', 'very', 'was', 'were', 'what', 'when', 'which',
  'while', 'with', 'within', 'would', 'your',
]);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function titleCase(value) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function colorFromSlug(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 62%)`;
}

function topKeywords(text, maxCount) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([token]) => token);
}

function scoreTopicMatch(tokens, topicLabel) {
  const topicTokens = tokenize(topicLabel);
  let score = 0;
  for (const token of topicTokens) {
    if (tokens.has(token)) {
      score += 2;
    }
    for (const candidate of tokens) {
      if (candidate.startsWith(token) || token.startsWith(candidate)) {
        score += 1;
      }
    }
  }
  return score;
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'done',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS derived_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS derived_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    cluster_slug TEXT NOT NULL,
    radius INTEGER NOT NULL,
    importance INTEGER NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    is_central INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cluster_slug) REFERENCES derived_clusters(slug)
  );

  CREATE TABLE IF NOT EXISTS node_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_slug TEXT NOT NULL,
    target_slug TEXT NOT NULL,
    link_kind TEXT NOT NULL DEFAULT 'related',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_slug, target_slug)
  );

  CREATE TABLE IF NOT EXISTS doc_node_links (
    doc_id INTEGER NOT NULL,
    node_slug TEXT NOT NULL,
    score REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (doc_id, node_slug),
    FOREIGN KEY (doc_id) REFERENCES docs(id),
    FOREIGN KEY (node_slug) REFERENCES derived_nodes(slug)
  );

  CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    config_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    status_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add sentiment column to derived_nodes if it doesn't exist.
try {
  db.exec(`ALTER TABLE derived_nodes ADD COLUMN sentiment REAL DEFAULT NULL`);
} catch {
  // Column already exists — ignore.
}

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ═══════════════════════════════════════════
// Data Source CRUD
// ═══════════════════════════════════════════

app.post('/api/sources', (req, res) => {
  const sourceType = typeof req.body.sourceType === 'string' ? req.body.sourceType.trim() : '';
  const config = req.body.config && typeof req.body.config === 'object' ? req.body.config : {};
  if (!sourceType) { res.status(400).json({ message: 'sourceType is required' }); return; }
  if (sourceType === 'reddit' && !config.threadUrl) {
    res.status(400).json({ message: 'config.threadUrl is required for reddit sources' }); return;
  }

  const result = db.prepare('INSERT INTO data_sources (source_type, config_json) VALUES (?, ?)')
    .run(sourceType, JSON.stringify(config));
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(Number(result.lastInsertRowid));
  source.config = JSON.parse(source.config_json);
  res.status(201).json(source);
});

app.get('/api/sources', (_req, res) => {
  const sources = db.prepare('SELECT * FROM data_sources ORDER BY created_at DESC')
    .all()
    .map((row) => ({ ...row, config: JSON.parse(row.config_json) }));
  res.json(sources);
});

app.delete('/api/sources/:sourceId', (req, res) => {
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.sourceId);
  if (!source) { res.status(404).json({ message: 'data source not found' }); return; }
  db.prepare('DELETE FROM data_sources WHERE id = ?').run(req.params.sourceId);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════════
// Source Fetch (Reddit)
// ═══════════════════════════════════════════

app.post('/api/sources/:sourceId/fetch', async (req, res) => {
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(req.params.sourceId);
  if (!source) { res.status(404).json({ message: 'data source not found' }); return; }
  if (source.source_type !== 'reddit') {
    res.status(400).json({ message: `fetch not supported for source type: ${source.source_type}` }); return;
  }

  db.prepare('UPDATE data_sources SET status = ?, status_message = NULL WHERE id = ?').run('fetching', source.id);

  try {
    const config = JSON.parse(source.config_json);
    const threadData = await redditFetcher.fetchThread(config.threadUrl);

    // All derivation writes are atomic: a mid-write failure must not leave
    // partial clusters/nodes/edges behind.
    const { nodeCount, edgeCount } = db.transaction(() => {
      // Central node
      const centralSlug = `reddit-${threadData.threadId}`;
      const centralLabel = threadData.title.substring(0, 120);
      const centralDesc = `Reddit thread: ${threadData.title.substring(0, 200)}`;
      const centralClusterSlug = `reddit-${threadData.threadId}`;
      const centralClusterLabel = `${centralLabel.substring(0, 40)} Discussion`;

      db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING')
        .run(centralClusterSlug, centralClusterLabel, colorFromSlug(centralClusterSlug));
      db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central) VALUES (?, ?, ?, ?, ?, ?, 0, 1) ON CONFLICT(slug) DO UPDATE SET label=excluded.label')
        .run(centralSlug, centralLabel, centralDesc, centralClusterSlug, 36, 10);

      // Depth-1 topics from title + body
      const combinedText = `${threadData.title} ${threadData.body || ''}`;
      const depth1Keywords = topKeywords(combinedText, 8);

      let nodes = 1, edges = 0;
      const depth1Slugs = [];

      const insertNode = db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(slug) DO NOTHING');
      const insertEdge = db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING');

      for (let i = 0; i < depth1Keywords.length; i += 1) {
        const kw = depth1Keywords[i];
        const nodeSlug = `reddit-${threadData.threadId}-d1-${slugify(kw)}`;
        insertNode.run(nodeSlug, titleCase(kw), `Topic from Reddit thread: ${titleCase(kw)}`, centralClusterSlug, Math.max(14, 24 - i * 2), Math.max(5, 9 - i));
        depth1Slugs.push(nodeSlug);
        nodes += 1;
        insertEdge.run(centralSlug, nodeSlug, 'central-topic');
        edges += 1;
      }

      // Depth-2 from comments
      const topLevelComments = threadData.comments.filter((c) => c.depth === 0);
      const insertD2Node = db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (?, ?, ?, ?, ?, ?, 2) ON CONFLICT(slug) DO NOTHING');
      const getD1Label = db.prepare('SELECT label FROM derived_nodes WHERE slug = ?');

      for (const comment of topLevelComments.slice(0, 15)) {
        const commentKeywords = topKeywords(comment.body, 3);
        const commentTokenSet = new Set(tokenize(comment.body));
        for (const kw of commentKeywords) {
          let bestParent = depth1Slugs[0], bestScore = 0;
          for (const d1Slug of depth1Slugs) {
            const d1Node = getD1Label.get(d1Slug);
            if (!d1Node) continue;
            const s = scoreTopicMatch(commentTokenSet, d1Node.label);
            if (s > bestScore) { bestScore = s; bestParent = d1Slug; }
          }
          if (bestScore === 0) continue;

          const nodeSlug = `reddit-${threadData.threadId}-d2-${slugify(kw)}`;
          insertD2Node.run(nodeSlug, titleCase(kw), `Sub-topic from discussion: ${titleCase(kw)}`, centralClusterSlug, 12, 4);
          nodes += 1;
          insertEdge.run(bestParent, nodeSlug, 'topic-subtopic');
          edges += 1;
        }
      }

      // Cross-link depth-1
      for (let i = 1; i < depth1Slugs.length; i += 1) {
        insertEdge.run(depth1Slugs[i - 1], depth1Slugs[i], 'related-topic');
        edges += 1;
      }

      db.prepare('UPDATE data_sources SET status = ?, status_message = ? WHERE id = ?')
        .run('done', `Extracted ${nodes} nodes and ${edges} edges`, source.id);

      return { nodeCount: nodes, edgeCount: edges };
    })();

    const updated = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(source.id);
    updated.config = JSON.parse(updated.config_json);
    res.json({ source: updated, nodeCount, edgeCount });
  } catch (err) {
    db.prepare('UPDATE data_sources SET status = ?, status_message = ? WHERE id = ?')
      .run('error', err.message, source.id);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// Network
// ═══════════════════════════════════════════

app.get('/api/network', (_req, res) => {
  const derivedClusters = db.prepare('SELECT slug AS id, label, color FROM derived_clusters ORDER BY id ASC').all();
  const derivedNodes = db.prepare(
    `SELECT dn.slug AS id, dn.label, dn.description AS desc, dn.cluster_slug AS cluster,
            dn.radius AS r, dn.importance, dn.depth, dn.is_central AS isCentral, dn.sentiment,
            COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.source_slug = dn.slug OR nl.target_slug = dn.slug), 0) AS degree
     FROM derived_nodes dn ORDER BY dn.id ASC`
  ).all().map((row) => ({ ...row, isCentral: Boolean(row.isCentral), sentiment: row.sentiment ?? undefined }));
  const derivedEdges = db.prepare('SELECT source_slug AS source, target_slug AS target, link_kind AS kind FROM node_links ORDER BY id ASC').all();
  res.json({ derivedClusters, derivedNodes, derivedEdges });
});

// ═══════════════════════════════════════════
// Search (LIKE-based)
// ═══════════════════════════════════════════
//
// Returns ranked matches across nodes (label + description) and docs
// (title + text). Uses parameterised LIKE rather than FTS5 because the
// SQLite build shipped with `better-sqlite3` doesn't always include FTS5
// and our corpora are small (hundreds of rows, not millions).

const SNIPPET_PAD = 80;

function makeSnippet(text, needle) {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, 160);
  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(text.length, idx + needle.length + SNIPPET_PAD);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

app.get('/api/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) { res.json({ results: [] }); return; }

  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const nodeRows = db.prepare(
    `SELECT slug AS id, label, description AS desc, cluster_slug AS cluster
     FROM derived_nodes
     WHERE lower(label) LIKE lower(?) ESCAPE '\\' OR lower(description) LIKE lower(?) ESCAPE '\\'
     LIMIT 25`,
  ).all(like, like);

  const docRows = db.prepare(
    `SELECT id, title, text
     FROM docs
     WHERE lower(title) LIKE lower(?) ESCAPE '\\' OR lower(text) LIKE lower(?) ESCAPE '\\'
     LIMIT 25`,
  ).all(like, like);

  const results = [];
  for (const row of nodeRows) {
    const labelMatch = (row.label ?? '').toLowerCase().includes(q.toLowerCase());
    results.push({
      type: 'node',
      id: row.id,
      label: row.label,
      snippet: makeSnippet(row.desc ?? '', q),
      meta: `cluster: ${row.cluster}`,
      score: labelMatch ? 2 : 1,
    });
  }
  for (const row of docRows) {
    const titleMatch = (row.title ?? '').toLowerCase().includes(q.toLowerCase());
    results.push({
      type: 'doc',
      id: String(row.id),
      label: row.title,
      snippet: makeSnippet(row.text ?? '', q),
      meta: `doc #${row.id}`,
      score: titleMatch ? 2 : 1,
    });
  }
  results.sort((a, b) => b.score - a.score);
  res.json({ results: results.slice(0, 40) });
});

// ═══════════════════════════════════════════
// Reports
// ═══════════════════════════════════════════

app.get('/api/reports', (_req, res) => {
  const totals = {
    nodes: db.prepare('SELECT COUNT(*) AS n FROM derived_nodes').get().n,
    clusters: db.prepare('SELECT COUNT(*) AS n FROM derived_clusters').get().n,
    edges: db.prepare('SELECT COUNT(*) AS n FROM node_links').get().n,
    sources: db.prepare('SELECT COUNT(*) AS n FROM data_sources').get().n,
    docs: db.prepare('SELECT COUNT(*) AS n FROM docs').get().n,
  };

  const clusterDistribution = db.prepare(
    `SELECT dc.slug AS id, dc.label, dc.color,
            COALESCE((SELECT COUNT(*) FROM derived_nodes dn WHERE dn.cluster_slug = dc.slug), 0) AS count
     FROM derived_clusters dc
     ORDER BY count DESC, dc.label ASC`,
  ).all();

  res.json({ totals, clusterDistribution });
});

// ═══════════════════════════════════════════
// Cluster CRUD
// ═══════════════════════════════════════════

app.post('/api/clusters', (req, res) => {
  const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
  if (!label) { res.status(400).json({ message: 'label is required' }); return; }

  const slug = slugify(label);
  const exists = db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(slug);
  if (exists) { res.status(409).json({ message: 'a cluster with this name already exists' }); return; }

  const color = typeof req.body.color === 'string' && req.body.color.trim()
    ? req.body.color.trim()
    : colorFromSlug(slug);

  db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?)')
    .run(slug, label, color);
  res.status(201).json({ id: slug, label, color });
});

app.put('/api/clusters/:slug', (req, res) => {
  const slug = req.params.slug;
  const cluster = db.prepare('SELECT * FROM derived_clusters WHERE slug = ?').get(slug);
  if (!cluster) { res.status(404).json({ message: 'cluster not found' }); return; }

  const label = typeof req.body.label === 'string' ? req.body.label.trim() : cluster.label;
  const color = typeof req.body.color === 'string' ? req.body.color.trim() : cluster.color;
  if (!label) { res.status(400).json({ message: 'label cannot be empty' }); return; }

  db.prepare('UPDATE derived_clusters SET label = ?, color = ? WHERE slug = ?')
    .run(label, color, slug);
  res.json({ id: slug, label, color });
});

app.delete('/api/clusters/:slug', (req, res) => {
  const slug = req.params.slug;
  const cluster = db.prepare('SELECT * FROM derived_clusters WHERE slug = ?').get(slug);
  if (!cluster) { res.status(404).json({ message: 'cluster not found' }); return; }

  // Cascade: drop the cluster's nodes (and their links), then the cluster.
  const tx = db.transaction(() => {
    const nodeSlugs = db.prepare('SELECT slug FROM derived_nodes WHERE cluster_slug = ?')
      .all(slug).map((r) => r.slug);
    if (nodeSlugs.length > 0) {
      const placeholders = nodeSlugs.map(() => '?').join(',');
      db.prepare(`DELETE FROM node_links WHERE source_slug IN (${placeholders}) OR target_slug IN (${placeholders})`)
        .run(...nodeSlugs, ...nodeSlugs);
      db.prepare(`DELETE FROM doc_node_links WHERE node_slug IN (${placeholders})`)
        .run(...nodeSlugs);
      db.prepare(`DELETE FROM derived_nodes WHERE slug IN (${placeholders})`)
        .run(...nodeSlugs);
    }
    db.prepare('DELETE FROM derived_clusters WHERE slug = ?').run(slug);
  });
  tx();
  res.json({ deleted: true });
});

// ═══════════════════════════════════════════
// Node CRUD
// ═══════════════════════════════════════════

app.put('/api/nodes/:slug', (req, res) => {
  const slug = req.params.slug;
  const node = db.prepare('SELECT * FROM derived_nodes WHERE slug = ?').get(slug);
  if (!node) { res.status(404).json({ message: 'node not found' }); return; }

  const label = typeof req.body.label === 'string' ? req.body.label.trim() : node.label;
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : node.description;
  let clusterSlug = node.cluster_slug;
  if (typeof req.body.clusterSlug === 'string' && req.body.clusterSlug.trim()) {
    const target = req.body.clusterSlug.trim();
    if (!db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(target)) {
      res.status(400).json({ message: 'target cluster does not exist' }); return;
    }
    clusterSlug = target;
  }
  if (!label) { res.status(400).json({ message: 'label cannot be empty' }); return; }

  db.prepare('UPDATE derived_nodes SET label = ?, description = ?, cluster_slug = ? WHERE slug = ?')
    .run(label, description, clusterSlug, slug);
  res.json({ id: slug, label, desc: description, cluster: clusterSlug });
});

app.delete('/api/nodes/:slug', (req, res) => {
  const slug = req.params.slug;
  const node = db.prepare('SELECT * FROM derived_nodes WHERE slug = ?').get(slug);
  if (!node) { res.status(404).json({ message: 'node not found' }); return; }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM node_links WHERE source_slug = ? OR target_slug = ?').run(slug, slug);
    db.prepare('DELETE FROM doc_node_links WHERE node_slug = ?').run(slug);
    db.prepare('DELETE FROM derived_nodes WHERE slug = ?').run(slug);
  });
  tx();
  res.json({ deleted: true });
});

// ═══════════════════════════════════════════
// Create Node (manual topic creation)
// ═══════════════════════════════════════════

app.post('/api/nodes', (req, res) => {
  const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
  const clusterSlug = typeof req.body.clusterSlug === 'string' ? req.body.clusterSlug.trim() : '';
  const desc = typeof req.body.desc === 'string' ? req.body.desc.trim() : (label || 'Manually created topic');

  if (!label) { res.status(400).json({ message: 'label is required' }); return; }
  if (!clusterSlug) { res.status(400).json({ message: 'clusterSlug is required' }); return; }

  const cluster = db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(clusterSlug);
  if (!cluster) { res.status(400).json({ message: 'target cluster does not exist' }); return; }

  const slug = slugify(label);
  const existing = db.prepare('SELECT slug FROM derived_nodes WHERE slug = ?').get(slug);
  if (existing) { res.status(409).json({ message: 'a node with this name already exists' }); return; }

  db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth) VALUES (?, ?, ?, ?, ?, ?, 0)')
    .run(slug, label, desc, clusterSlug, 14, 5);

  res.status(201).json({ id: slug, label, desc, cluster: clusterSlug });
});

// ═══════════════════════════════════════════
// Merge Nodes
// ═══════════════════════════════════════════

app.post('/api/nodes/merge', (req, res) => {
  const targetSlug = typeof req.body.targetSlug === 'string' ? req.body.targetSlug.trim() : '';
  const sourceSlugs = Array.isArray(req.body.sourceSlugs) ? req.body.sourceSlugs.map((s) => String(s).trim()).filter(Boolean) : [];

  if (!targetSlug) { res.status(400).json({ message: 'targetSlug is required' }); return; }
  if (sourceSlugs.length === 0) { res.status(400).json({ message: 'sourceSlugs must be a non-empty array' }); return; }

  const target = db.prepare('SELECT * FROM derived_nodes WHERE slug = ?').get(targetSlug);
  if (!target) { res.status(404).json({ message: 'target node not found' }); return; }

  // Reject if any source node doesn't exist, or if target is in sources.
  for (const src of sourceSlugs) {
    if (src === targetSlug) { res.status(400).json({ message: 'target node cannot be in sourceSlugs' }); return; }
    if (!db.prepare('SELECT slug FROM derived_nodes WHERE slug = ?').get(src)) {
      res.status(404).json({ message: `source node not found: ${src}` }); return;
    }
  }

  const tx = db.transaction(() => {
    const placeholders = sourceSlugs.map(() => '?').join(',');

    // Drop edges directly between the target and a source, or between two
    // sources — reassigning them would create self-loops.
    db.prepare(`DELETE FROM node_links WHERE source_slug = ? AND target_slug IN (${placeholders})`)
      .run(targetSlug, ...sourceSlugs);
    db.prepare(`DELETE FROM node_links WHERE target_slug = ? AND source_slug IN (${placeholders})`)
      .run(targetSlug, ...sourceSlugs);
    db.prepare(`DELETE FROM node_links WHERE source_slug IN (${placeholders}) AND target_slug IN (${placeholders})`)
      .run(...sourceSlugs, ...sourceSlugs);

    // Reassign all edges pointing to/from source nodes to the target.
    // OR IGNORE skips rows that would duplicate an edge the target already
    // has (UNIQUE(source_slug, target_slug)); leftovers are swept below.
    db.prepare(`UPDATE OR IGNORE node_links SET source_slug = ? WHERE source_slug IN (${placeholders})`)
      .run(targetSlug, ...sourceSlugs);
    db.prepare(`UPDATE OR IGNORE node_links SET target_slug = ? WHERE target_slug IN (${placeholders})`)
      .run(targetSlug, ...sourceSlugs);

    // Reassign all doc-node links from sources to target.
    db.prepare(`UPDATE OR IGNORE doc_node_links SET node_slug = ? WHERE node_slug IN (${placeholders})`)
      .run(targetSlug, ...sourceSlugs);

    // Delete the now-empty source nodes (and any duplicate edges OR IGNORE left behind).
    for (const src of sourceSlugs) {
      db.prepare('DELETE FROM node_links WHERE source_slug = ? OR target_slug = ?').run(src, src);
      db.prepare('DELETE FROM doc_node_links WHERE node_slug = ?').run(src);
      db.prepare('DELETE FROM derived_nodes WHERE slug = ?').run(src);
    }
  });
  tx();

  // Return the updated target node.
  const updated = db.prepare(
    `SELECT slug AS id, label, description AS desc, cluster_slug AS cluster,
            radius AS r, importance, depth, is_central AS isCentral,
            COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.source_slug = dn.slug OR nl.target_slug = dn.slug), 0) AS degree
     FROM derived_nodes dn WHERE dn.slug = ?`
  ).get(targetSlug);
  res.json({ ...updated, isCentral: Boolean(updated.isCentral) });
});

// ═══════════════════════════════════════════
// Bulk Reassign Nodes
// ═══════════════════════════════════════════

app.post('/api/nodes/bulk-reassign', (req, res) => {
  const nodeSlugs = Array.isArray(req.body.nodeSlugs) ? req.body.nodeSlugs.map((s) => String(s).trim()).filter(Boolean) : [];
  const clusterSlug = typeof req.body.clusterSlug === 'string' ? req.body.clusterSlug.trim() : '';

  if (nodeSlugs.length === 0) { res.status(400).json({ message: 'nodeSlugs must be a non-empty array' }); return; }
  if (!clusterSlug) { res.status(400).json({ message: 'clusterSlug is required' }); return; }

  const cluster = db.prepare('SELECT slug FROM derived_clusters WHERE slug = ?').get(clusterSlug);
  if (!cluster) { res.status(400).json({ message: 'target cluster does not exist' }); return; }

  // Reject if any node doesn't exist.
  for (const slug of nodeSlugs) {
    if (!db.prepare('SELECT slug FROM derived_nodes WHERE slug = ?').get(slug)) {
      res.status(404).json({ message: `node not found: ${slug}` }); return;
    }
  }

  const placeholders = nodeSlugs.map(() => '?').join(',');
  db.prepare(`UPDATE derived_nodes SET cluster_slug = ? WHERE slug IN (${placeholders})`)
    .run(clusterSlug, ...nodeSlugs);

  res.json({ reassigned: nodeSlugs.length, clusterSlug });
});

// ═══════════════════════════════════════════
// Docs
// ═══════════════════════════════════════════

app.get('/api/docs', (_req, res) => {
  const docs = db.prepare(
    `SELECT d.id, d.title, d.text, d.status,
     COALESCE((SELECT json_group_array(node_slug) FROM doc_node_links dnl WHERE dnl.doc_id = d.id), '[]') AS derivedNodeSlugs
     FROM docs d ORDER BY d.id ASC`
  ).all().map((row) => ({ ...row, derivedNodeSlugs: JSON.parse(row.derivedNodeSlugs) }));
  res.json(docs);
});

app.post('/api/docs', (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const status = typeof req.body.status === 'string' && req.body.status.trim() ? req.body.status.trim() : 'done';
  if (!text) { res.status(400).json({ message: 'text is required' }); return; }

  const normalizedTitle = title || 'Untitled document';

  // Doc insert + derivation are atomic: a failure mid-derivation must not
  // leave an orphaned doc row or partial nodes behind.
  let created;
  try {
    created = db.transaction(() => {
      const result = db.prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)').run(normalizedTitle, text, status);
      const docId = Number(result.lastInsertRowid);

      const keywords = topKeywords(`${normalizedTitle} ${text}`, 4);
      const primaryKeyword = keywords[0] ?? 'general';
      const clusterSlug = `derived-${slugify(primaryKeyword)}`;
      db.prepare('INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING')
        .run(clusterSlug, `${titleCase(primaryKeyword)} Concepts`, colorFromSlug(clusterSlug));

      const createdNodeSlugs = [];
      const insertNode = db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING');
      const linkDocNode = db.prepare('INSERT INTO doc_node_links (doc_id, node_slug, score) VALUES (?, ?, ?) ON CONFLICT(doc_id, node_slug) DO NOTHING');
      const createEdge = db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING');

      for (let i = 0; i < keywords.length; i += 1) {
        const kw = keywords[i];
        const nodeSlug = `user-${docId}-${slugify(kw)}`;
        insertNode.run(nodeSlug, titleCase(kw), `Derived from document ${docId}: ${titleCase(kw)}`, clusterSlug, Math.max(12, 18 - i * 2), Math.max(4, 8 - i));
        linkDocNode.run(docId, nodeSlug, Math.max(0.2, 1 - i * 0.15));
        createdNodeSlugs.push(nodeSlug);
      }

      for (let i = 1; i < createdNodeSlugs.length; i += 1) {
        createEdge.run(createdNodeSlugs[i - 1], createdNodeSlugs[i], 'same-doc');
      }

      const doc = db.prepare('SELECT id, title, text, status FROM docs WHERE id = ?').get(docId);
      doc.derivedNodeSlugs = createdNodeSlugs;
      return doc;
    })();
  } catch (err) {
    res.status(500).json({ message: 'failed to create document' });
    return;
  }
  res.status(201).json(created);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`SQLite API listening on http://localhost:${port}`);
  });
}

// Exported so the test suite can drive the app without binding the
// listener twice. The listener above only runs when this file is the
// process entry point.
module.exports = { app, db };
