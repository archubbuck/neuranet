const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');
const redditFetcher = require('./reddit-fetcher');

const app = express();
const port = Number(process.env.API_PORT || 3000);
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'topic-visualizer.db');

const BASE_TOPICS = [
  { id: 'ml', label: 'Machine Learning' },
  { id: 'dl', label: 'Deep Learning' },
  { id: 'nn', label: 'Neural Networks' },
  { id: 'rl', label: 'Reinforcement Learning' },
  { id: 'sl', label: 'Supervised Learning' },
  { id: 'ul', label: 'Unsupervised Learning' },
  { id: 'tl', label: 'Transfer Learning' },
  { id: 'ds', label: 'Data Science' },
  { id: 'fe', label: 'Feature Engineering' },
  { id: 'stat', label: 'Statistics' },
  { id: 'bi', label: 'Business Intelligence' },
  { id: 'etl', label: 'Data Pipelines' },
  { id: 'nlp', label: 'NLP' },
  { id: 'llm', label: 'Large Language Models' },
  { id: 'trans', label: 'Transformers' },
  { id: 'embed', label: 'Word Embeddings' },
  { id: 'sent', label: 'Sentiment Analysis' },
  { id: 'cv', label: 'Computer Vision' },
  { id: 'obj', label: 'Object Detection' },
  { id: 'seg', label: 'Segmentation' },
  { id: 'gan', label: 'GANs' },
  { id: 'la', label: 'Linear Algebra' },
  { id: 'prob', label: 'Probability Theory' },
  { id: 'opt', label: 'Optimization' },
  { id: 'auto', label: 'Automation' },
  { id: 'rob', label: 'Robotics' },
  { id: 'hci', label: 'Human-AI Interaction' },
  { id: 'bc', label: 'Blockchain' },
  { id: 'crypto', label: 'Cryptography' },
  { id: 'dist', label: 'Distributed Systems' },
  { id: 'p2p', label: 'P2P Networks' },
  { id: 'bio', label: 'Bioinformatics' },
  { id: 'genomics', label: 'Genomics' },
  { id: 'protein', label: 'Protein Folding' },
];

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

  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    config_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    status_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );
`);

// ── Migrate existing tables: add workspace-scoping columns ──
const migrateCol = (table, column, type) => {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`); } catch { /* already exists */ }
};

migrateCol('docs', 'workspace_id', 'INTEGER REFERENCES workspaces(id) ON DELETE CASCADE');
migrateCol('derived_clusters', 'workspace_id', 'INTEGER REFERENCES workspaces(id) ON DELETE CASCADE');
migrateCol('derived_nodes', 'workspace_id', 'INTEGER REFERENCES workspaces(id) ON DELETE CASCADE');
migrateCol('derived_nodes', 'depth', 'INTEGER NOT NULL DEFAULT 0');
migrateCol('derived_nodes', 'is_central', 'INTEGER NOT NULL DEFAULT 0');
migrateCol('node_links', 'workspace_id', 'INTEGER REFERENCES workspaces(id) ON DELETE CASCADE');
migrateCol('doc_node_links', 'workspace_id', 'INTEGER REFERENCES workspaces(id) ON DELETE CASCADE');

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ═══════════════════════════════════════════
// Workspace CRUD
// ═══════════════════════════════════════════

app.post('/api/workspaces', (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (!name) { res.status(400).json({ message: 'name is required' }); return; }

  const result = db.prepare('INSERT INTO workspaces (name, description) VALUES (?, ?)').run(name, description);
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(workspace);
});

app.get('/api/workspaces', (_req, res) => {
  const workspaces = db.prepare(
    `SELECT w.*, COUNT(ds.id) AS sourceCount
     FROM workspaces w LEFT JOIN data_sources ds ON ds.workspace_id = w.id
     GROUP BY w.id ORDER BY w.created_at DESC`
  ).all();
  res.json(workspaces);
});

app.get('/api/workspaces/:id', (req, res) => {
  const workspace = db.prepare(
    `SELECT w.*, COUNT(ds.id) AS sourceCount
     FROM workspaces w LEFT JOIN data_sources ds ON ds.workspace_id = w.id
     WHERE w.id = ? GROUP BY w.id`
  ).get(req.params.id);
  if (!workspace) { res.status(404).json({ message: 'workspace not found' }); return; }
  res.json(workspace);
});

app.put('/api/workspaces/:id', (req, res) => {
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
  if (!workspace) { res.status(404).json({ message: 'workspace not found' }); return; }
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : workspace.name;
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : workspace.description;
  db.prepare("UPDATE workspaces SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name, description, req.params.id);
  res.json(db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id));
});

app.delete('/api/workspaces/:id', (req, res) => {
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
  if (!workspace) { res.status(404).json({ message: 'workspace not found' }); return; }
  db.prepare('DELETE FROM doc_node_links WHERE workspace_id = ?').run(req.params.id);
  db.prepare('DELETE FROM node_links WHERE workspace_id = ?').run(req.params.id);
  db.prepare('DELETE FROM derived_nodes WHERE workspace_id = ?').run(req.params.id);
  db.prepare('DELETE FROM derived_clusters WHERE workspace_id = ?').run(req.params.id);
  db.prepare('DELETE FROM docs WHERE workspace_id = ?').run(req.params.id);
  db.prepare('DELETE FROM data_sources WHERE workspace_id = ?').run(req.params.id);
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════════
// Data Source CRUD
// ═══════════════════════════════════════════

app.post('/api/workspaces/:id/sources', (req, res) => {
  const workspaceId = Number(req.params.id);
  if (!db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId)) {
    res.status(404).json({ message: 'workspace not found' }); return;
  }
  const sourceType = typeof req.body.sourceType === 'string' ? req.body.sourceType.trim() : '';
  const config = req.body.config && typeof req.body.config === 'object' ? req.body.config : {};
  if (!sourceType) { res.status(400).json({ message: 'sourceType is required' }); return; }
  if (sourceType === 'reddit' && !config.threadUrl) {
    res.status(400).json({ message: 'config.threadUrl is required for reddit sources' }); return;
  }

  const result = db.prepare('INSERT INTO data_sources (workspace_id, source_type, config_json) VALUES (?, ?, ?)')
    .run(workspaceId, sourceType, JSON.stringify(config));
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(Number(result.lastInsertRowid));
  source.config = JSON.parse(source.config_json);
  res.status(201).json(source);
});

app.get('/api/workspaces/:id/sources', (req, res) => {
  const sources = db.prepare('SELECT * FROM data_sources WHERE workspace_id = ? ORDER BY created_at DESC')
    .all(req.params.id)
    .map((row) => ({ ...row, config: JSON.parse(row.config_json) }));
  res.json(sources);
});

app.delete('/api/workspaces/:id/sources/:sourceId', (req, res) => {
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ? AND workspace_id = ?')
    .get(req.params.sourceId, req.params.id);
  if (!source) { res.status(404).json({ message: 'data source not found' }); return; }
  db.prepare('DELETE FROM data_sources WHERE id = ?').run(req.params.sourceId);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════════
// Source Fetch (Reddit)
// ═══════════════════════════════════════════

app.post('/api/workspaces/:id/sources/:sourceId/fetch', async (req, res) => {
  const workspaceId = Number(req.params.id);
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ? AND workspace_id = ?')
    .get(req.params.sourceId, workspaceId);
  if (!source) { res.status(404).json({ message: 'data source not found' }); return; }
  if (source.source_type !== 'reddit') {
    res.status(400).json({ message: `fetch not supported for source type: ${source.source_type}` }); return;
  }

  db.prepare('UPDATE data_sources SET status = ?, status_message = NULL WHERE id = ?').run('fetching', source.id);

  try {
    const config = JSON.parse(source.config_json);
    const threadData = await redditFetcher.fetchThread(config.threadUrl);

    // Central node
    const centralSlug = `reddit-${threadData.threadId}`;
    const centralLabel = threadData.title.substring(0, 120);
    const centralDesc = `Reddit thread: ${threadData.title.substring(0, 200)}`;
    const centralClusterSlug = `ws${workspaceId}-reddit-${threadData.threadId}`;
    const centralClusterLabel = `${centralLabel.substring(0, 40)} Discussion`;

    db.prepare('INSERT INTO derived_clusters (slug, label, color, workspace_id) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING')
      .run(centralClusterSlug, centralClusterLabel, colorFromSlug(centralClusterSlug), workspaceId);
    db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central, workspace_id) VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?) ON CONFLICT(slug) DO UPDATE SET label=excluded.label')
      .run(centralSlug, centralLabel, centralDesc, centralClusterSlug, 36, 10, workspaceId);

    // Depth-1 topics from title + body
    const combinedText = `${threadData.title} ${threadData.body || ''}`;
    const depth1Keywords = topKeywords(combinedText, 8);

    let nodeCount = 1, edgeCount = 0;
    const depth1Slugs = [];

    const insertNode = db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, workspace_id) VALUES (?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(slug) DO NOTHING');
    const insertEdge = db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind, workspace_id) VALUES (?, ?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING');

    for (let i = 0; i < depth1Keywords.length; i += 1) {
      const kw = depth1Keywords[i];
      const nodeSlug = `ws${workspaceId}-reddit-${threadData.threadId}-d1-${slugify(kw)}`;
      insertNode.run(nodeSlug, titleCase(kw), `Topic from Reddit thread: ${titleCase(kw)}`, centralClusterSlug, Math.max(14, 24 - i * 2), Math.max(5, 9 - i), workspaceId);
      depth1Slugs.push(nodeSlug);
      nodeCount += 1;
      insertEdge.run(centralSlug, nodeSlug, 'central-topic', workspaceId);
      edgeCount += 1;
    }

    // Depth-2 from comments
    const topLevelComments = threadData.comments.filter((c) => c.depth === 0);
    const insertD2Node = db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, workspace_id) VALUES (?, ?, ?, ?, ?, ?, 2, ?) ON CONFLICT(slug) DO NOTHING');

    for (const comment of topLevelComments.slice(0, 15)) {
      const commentKeywords = topKeywords(comment.body, 3);
      const commentTokenSet = new Set(tokenize(comment.body));
      for (const kw of commentKeywords) {
        let bestParent = depth1Slugs[0], bestScore = 0;
        for (const d1Slug of depth1Slugs) {
          const d1Node = db.prepare('SELECT label FROM derived_nodes WHERE slug = ?').get(d1Slug);
          if (!d1Node) continue;
          const s = scoreTopicMatch(commentTokenSet, d1Node.label);
          if (s > bestScore) { bestScore = s; bestParent = d1Slug; }
        }
        if (bestScore === 0) continue;

        const nodeSlug = `ws${workspaceId}-reddit-${threadData.threadId}-d2-${slugify(kw)}`;
        insertD2Node.run(nodeSlug, titleCase(kw), `Sub-topic from discussion: ${titleCase(kw)}`, centralClusterSlug, 12, 4, workspaceId);
        nodeCount += 1;
        insertEdge.run(bestParent, nodeSlug, 'topic-subtopic', workspaceId);
        edgeCount += 1;
      }
    }

    // Cross-link depth-1
    for (let i = 1; i < depth1Slugs.length; i += 1) {
      insertEdge.run(depth1Slugs[i - 1], depth1Slugs[i], 'related-topic', workspaceId);
      edgeCount += 1;
    }

    db.prepare('UPDATE data_sources SET status = ?, status_message = ? WHERE id = ?')
      .run('done', `Extracted ${nodeCount} nodes and ${edgeCount} edges`, source.id);

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
// Workspace-scoped network
// ═══════════════════════════════════════════

app.get('/api/workspaces/:id/network', (req, res) => {
  const workspaceId = Number(req.params.id);
  const derivedClusters = db.prepare('SELECT slug AS id, label, color FROM derived_clusters WHERE workspace_id = ? ORDER BY id ASC').all(workspaceId);
  const derivedNodes = db.prepare(
    `SELECT dn.slug AS id, dn.label, dn.description AS desc, dn.cluster_slug AS cluster,
            dn.radius AS r, dn.importance, dn.depth, dn.is_central AS isCentral,
            COALESCE((SELECT COUNT(*) FROM node_links nl WHERE nl.workspace_id = dn.workspace_id AND (nl.source_slug = dn.slug OR nl.target_slug = dn.slug)), 0) AS degree
     FROM derived_nodes dn WHERE dn.workspace_id = ? ORDER BY dn.id ASC`
  ).all(workspaceId).map((row) => ({ ...row, isCentral: Boolean(row.isCentral) }));
  const derivedEdges = db.prepare('SELECT source_slug AS source, target_slug AS target, link_kind AS kind FROM node_links WHERE workspace_id = ? ORDER BY id ASC').all(workspaceId);
  res.json({ derivedClusters, derivedNodes, derivedEdges });
});

// ═══════════════════════════════════════════
// Workspace-scoped docs
// ═══════════════════════════════════════════

app.get('/api/workspaces/:id/docs', (req, res) => {
  const docs = db.prepare(
    `SELECT d.id, d.title, d.text, d.status,
     COALESCE((SELECT json_group_array(node_slug) FROM doc_node_links dnl WHERE dnl.doc_id = d.id), '[]') AS derivedNodeSlugs
     FROM docs d WHERE d.workspace_id = ? ORDER BY d.id ASC`
  ).all(req.params.id).map((row) => ({ ...row, derivedNodeSlugs: JSON.parse(row.derivedNodeSlugs) }));
  res.json(docs);
});

app.post('/api/workspaces/:id/docs', (req, res) => {
  const workspaceId = Number(req.params.id);
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const status = typeof req.body.status === 'string' && req.body.status.trim() ? req.body.status.trim() : 'done';
  if (!text) { res.status(400).json({ message: 'text is required' }); return; }

  const normalizedTitle = title || 'Untitled document';
  const result = db.prepare('INSERT INTO docs (title, text, status, workspace_id) VALUES (?, ?, ?, ?)').run(normalizedTitle, text, status, workspaceId);
  const docId = Number(result.lastInsertRowid);

  const keywords = topKeywords(`${normalizedTitle} ${text}`, 4);
  const primaryKeyword = keywords[0] ?? 'general';
  const clusterSlug = `ws${workspaceId}-derived-${slugify(primaryKeyword)}`;
  db.prepare('INSERT INTO derived_clusters (slug, label, color, workspace_id) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING')
    .run(clusterSlug, `${titleCase(primaryKeyword)} Concepts`, colorFromSlug(clusterSlug), workspaceId);

  const createdNodeSlugs = [];
  const insertNode = db.prepare('INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING');
  const linkDocNode = db.prepare('INSERT INTO doc_node_links (doc_id, node_slug, score, workspace_id) VALUES (?, ?, ?, ?) ON CONFLICT(doc_id, node_slug) DO NOTHING');
  const createEdge = db.prepare('INSERT INTO node_links (source_slug, target_slug, link_kind, workspace_id) VALUES (?, ?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING');

  for (let i = 0; i < keywords.length; i += 1) {
    const kw = keywords[i];
    const nodeSlug = `ws${workspaceId}-user-${docId}-${slugify(kw)}`;
    insertNode.run(nodeSlug, titleCase(kw), `Derived from document ${docId}: ${titleCase(kw)}`, clusterSlug, Math.max(12, 18 - i * 2), Math.max(4, 8 - i), workspaceId);
    linkDocNode.run(docId, nodeSlug, Math.max(0.2, 1 - i * 0.15), workspaceId);
    createdNodeSlugs.push(nodeSlug);
  }

  for (let i = 1; i < createdNodeSlugs.length; i += 1) {
    createEdge.run(createdNodeSlugs[i - 1], createdNodeSlugs[i], 'same-doc', workspaceId);
  }

  const created = db.prepare('SELECT id, title, text, status FROM docs WHERE id = ?').get(docId);
  created.derivedNodeSlugs = createdNodeSlugs;
  res.status(201).json(created);
});

// ═══════════════════════════════════════════
// Legacy endpoints (backward compat)
// ═══════════════════════════════════════════

app.get('/api/docs', (_req, res) => {
  const docs = db
    .prepare(`
      SELECT d.id, d.title, d.text, d.status,
      COALESCE((
        SELECT json_group_array(node_slug)
        FROM doc_node_links dnl
        WHERE dnl.doc_id = d.id
      ), '[]') AS derivedNodeSlugs
      FROM docs d
      ORDER BY d.id ASC
    `)
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      text: row.text,
      status: row.status,
      derivedNodeSlugs: JSON.parse(row.derivedNodeSlugs),
    }));
  res.json(docs);
});

app.get('/api/network', (_req, res) => {
  const derivedClusters = db
    .prepare('SELECT slug AS id, label, color FROM derived_clusters ORDER BY id ASC')
    .all();
  const derivedNodes = db
    .prepare(`
      SELECT dn.slug AS id, dn.label, dn.description AS desc, dn.cluster_slug AS cluster,
             dn.radius AS r, dn.importance,
             COALESCE((
               SELECT COUNT(*) FROM node_links nl
               WHERE nl.source_slug = dn.slug OR nl.target_slug = dn.slug
             ), 0) AS degree
      FROM derived_nodes dn
      ORDER BY dn.id ASC
    `)
    .all();
  const derivedEdges = db
    .prepare('SELECT source_slug AS source, target_slug AS target, link_kind AS kind FROM node_links ORDER BY id ASC')
    .all();

  res.json({ derivedClusters, derivedNodes, derivedEdges });
});

app.post('/api/docs', (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const status = typeof req.body.status === 'string' && req.body.status.trim() ? req.body.status.trim() : 'done';

  if (!text) {
    res.status(400).json({ message: 'text is required' });
    return;
  }

  const normalizedTitle = title || 'Untitled document';
  const insert = db.prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)');
  const result = insert.run(normalizedTitle, text, status);
  const docId = Number(result.lastInsertRowid);

  const keywords = topKeywords(`${normalizedTitle} ${text}`, 4);
  const primaryKeyword = keywords[0] ?? 'general';
  const clusterSlug = `derived-${slugify(primaryKeyword)}`;
  const clusterLabel = `${titleCase(primaryKeyword)} Concepts`;
  const clusterColor = colorFromSlug(clusterSlug);

  db.prepare(
    'INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING',
  ).run(clusterSlug, clusterLabel, clusterColor);

  const createNode = db.prepare(
    `
      INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO NOTHING
    `,
  );
  const linkDocNode = db.prepare(
    'INSERT INTO doc_node_links (doc_id, node_slug, score) VALUES (?, ?, ?) ON CONFLICT(doc_id, node_slug) DO NOTHING',
  );
  const createEdge = db.prepare(
    'INSERT INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?) ON CONFLICT(source_slug, target_slug) DO NOTHING',
  );

  const createdNodeSlugs = [];
  const tokenSet = new Set(tokenize(`${normalizedTitle} ${text}`));

  keywords.forEach((keyword, index) => {
    const nodeSlug = `user-${docId}-${slugify(keyword)}`;
    const nodeLabel = titleCase(keyword);
    const nodeDesc = `Derived from document ${docId}: ${nodeLabel}`;
    const radius = Math.max(12, 18 - index * 2);
    const importance = Math.max(4, 8 - index);

    createNode.run(nodeSlug, nodeLabel, nodeDesc, clusterSlug, radius, importance);
    linkDocNode.run(docId, nodeSlug, Math.max(0.2, 1 - index * 0.15));
    createdNodeSlugs.push(nodeSlug);

    const relatedBaseNodes = BASE_TOPICS
      .map((topic) => ({ topicId: topic.id, score: scoreTopicMatch(tokenSet, topic.label) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    for (const related of relatedBaseNodes) {
      createEdge.run(nodeSlug, related.topicId, 'related-base');
    }
  });

  for (let i = 1; i < createdNodeSlugs.length; i += 1) {
    createEdge.run(createdNodeSlugs[i - 1], createdNodeSlugs[i], 'same-doc');
  }

  const created = db
    .prepare('SELECT id, title, text, status FROM docs WHERE id = ?')
    .get(docId);

  created.derivedNodeSlugs = createdNodeSlugs;

  res.status(201).json(created);
});

app.listen(port, () => {
  console.log(`SQLite API listening on http://localhost:${port}`);
});
