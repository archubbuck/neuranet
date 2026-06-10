/**
 * Seed script — populates the SQLite database with rich demo data
 * so the Topics and Categories analytics pages have content to display.
 *
 * Usage: node scripts/seed.mjs
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, 'topic-visualizer.db');
console.log(`Seeding database at ${dbPath}…`);
const db = new Database(dbPath);

// ── Ensure schema is up to date ───────────────────────────────────────

// Migration: add sentiment column if it doesn't exist.
try {
  db.exec(`ALTER TABLE derived_nodes ADD COLUMN sentiment REAL DEFAULT NULL`);
} catch {
  /* column already exists */
}

// ── Clean existing data ──────────────────────────────────────────────

db.exec('DELETE FROM doc_node_links');
db.exec('DELETE FROM node_links');
db.exec('DELETE FROM derived_nodes');
db.exec('DELETE FROM derived_clusters');
db.exec('DELETE FROM docs');
db.exec('DELETE FROM data_sources');

// ── Helpers ──────────────────────────────────────────────────────────

const colorFromSlug = (slug) => {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360} 72% 62%)`;
};

// ── Clusters (8 categories matching the prototype palette) ────────────

const CLUSTERS = [
  { slug: 'tech-ai', label: 'Tech / AI' },
  { slug: 'social', label: 'Social' },
  { slug: 'policy', label: 'Policy' },
  { slug: 'research', label: 'Research' },
  { slug: 'business', label: 'Business' },
  { slug: 'health', label: 'Health' },
  { slug: 'media', label: 'Media' },
  { slug: 'climate', label: 'Climate' },
];

const insertCluster = db.prepare(
  'INSERT INTO derived_clusters (slug, label, color) VALUES (?, ?, ?)',
);

for (const c of CLUSTERS) {
  insertCluster.run(c.slug, c.label, colorFromSlug(c.slug));
}

// ── Nodes ─────────────────────────────────────────────────────────────

const NODES = [
  // Tech / AI (4 nodes)
  {
    slug: 'large-language-models',
    label: 'Large Language Models',
    cluster: 'tech-ai',
    r: 34,
    importance: 10,
    depth: 0,
    sentiment: 0.54,
  },
  {
    slug: 'gpt4-claude',
    label: 'GPT-4 / Claude',
    cluster: 'tech-ai',
    r: 26,
    importance: 8,
    depth: 1,
    sentiment: 0.42,
  },
  {
    slug: 'neural-architecture',
    label: 'Neural Architecture',
    cluster: 'tech-ai',
    r: 24,
    importance: 7,
    depth: 1,
    sentiment: 0.47,
  },
  {
    slug: 'ai-safety-research',
    label: 'AI Safety Research',
    cluster: 'tech-ai',
    r: 28,
    importance: 9,
    depth: 0,
    sentiment: 0.31,
  },

  // Research (3 nodes)
  {
    slug: 'research-papers',
    label: 'Research Papers',
    cluster: 'research',
    r: 30,
    importance: 9,
    depth: 0,
    sentiment: 0.49,
  },
  {
    slug: 'benchmarks-evals',
    label: 'Benchmarks & Evals',
    cluster: 'research',
    r: 18,
    importance: 5,
    depth: 1,
    sentiment: 0.22,
  },
  {
    slug: 'open-source-models',
    label: 'Open Source Models',
    cluster: 'research',
    r: 26,
    importance: 8,
    depth: 1,
    sentiment: 0.61,
  },

  // Policy (3 nodes)
  {
    slug: 'policy-regulation',
    label: 'Policy & Regulation',
    cluster: 'policy',
    r: 24,
    importance: 7,
    depth: 0,
    sentiment: -0.18,
  },
  {
    slug: 'eu-ai-act',
    label: 'EU AI Act',
    cluster: 'policy',
    r: 18,
    importance: 5,
    depth: 1,
    sentiment: -0.28,
  },
  {
    slug: 'ethics-bias',
    label: 'Ethics & Bias',
    cluster: 'policy',
    r: 22,
    importance: 6,
    depth: 1,
    sentiment: -0.32,
  },

  // Social (2 nodes)
  {
    slug: 'r-machinelearning',
    label: 'r/MachineLearning',
    cluster: 'social',
    r: 22,
    importance: 6,
    depth: 0,
    sentiment: 0.38,
  },
  {
    slug: 'social-discourse',
    label: 'Social Discourse',
    cluster: 'social',
    r: 18,
    importance: 5,
    depth: 1,
    sentiment: 0.08,
  },

  // Business (2 nodes)
  {
    slug: 'investment-vc',
    label: 'Investment & VC',
    cluster: 'business',
    r: 16,
    importance: 4,
    depth: 0,
    sentiment: 0.15,
  },
  {
    slug: 'startup-ecosystem',
    label: 'Startup Ecosystem',
    cluster: 'business',
    r: 14,
    importance: 3,
    depth: 1,
    sentiment: 0.24,
  },

  // Health (1 node)
  {
    slug: 'healthcare-ai',
    label: 'Healthcare AI',
    cluster: 'health',
    r: 20,
    importance: 6,
    depth: 0,
    sentiment: 0.38,
  },
];

const isCentral = [
  'large-language-models',
  'ai-safety-research',
  'research-papers',
  'policy-regulation',
  'r-machinelearning',
  'investment-vc',
  'healthcare-ai',
];

const insertNode = db.prepare(
  `INSERT INTO derived_nodes (slug, label, description, cluster_slug, radius, importance, depth, is_central, sentiment)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

for (const n of NODES) {
  const central = isCentral.includes(n.slug) ? 1 : 0;
  insertNode.run(
    n.slug,
    n.label,
    `Topic: ${n.label}. Auto-generated for analytics demo.`,
    n.cluster,
    n.r,
    n.importance,
    n.depth ?? 0,
    central,
    n.sentiment ?? null,
  );
}

// ── Edges ─────────────────────────────────────────────────────────────

const EDGES = [
  // Central → depth-1 links
  ['large-language-models', 'gpt4-claude'],
  ['large-language-models', 'neural-architecture'],
  ['large-language-models', 'ai-safety-research'],
  ['ai-safety-research', 'gpt4-claude'],
  ['ai-safety-research', 'neural-architecture'],

  ['research-papers', 'benchmarks-evals'],
  ['research-papers', 'open-source-models'],
  ['ai-safety-research', 'research-papers'],

  ['policy-regulation', 'eu-ai-act'],
  ['policy-regulation', 'ethics-bias'],
  ['ai-safety-research', 'ethics-bias'],
  ['ai-safety-research', 'policy-regulation'],

  ['r-machinelearning', 'social-discourse'],
  ['large-language-models', 'r-machinelearning'],

  ['investment-vc', 'startup-ecosystem'],
  ['open-source-models', 'investment-vc'],

  ['healthcare-ai', 'ai-safety-research'],
  ['healthcare-ai', 'ethics-bias'],

  // Cross-cluster links
  ['gpt4-claude', 'open-source-models'],
  ['neural-architecture', 'benchmarks-evals'],
  ['eu-ai-act', 'healthcare-ai'],
  ['social-discourse', 'policy-regulation'],
  ['open-source-models', 'r-machinelearning'],
];

const insertEdge = db.prepare(
  'INSERT OR IGNORE INTO node_links (source_slug, target_slug, link_kind) VALUES (?, ?, ?)',
);

for (const [src, tgt] of EDGES) {
  insertEdge.run(src, tgt, 'related');
}

// ── Docs ──────────────────────────────────────────────────────────────

const DOCS = [
  {
    title: 'State of AI Report 2025',
    text: 'Large Language Models continue to dominate AI research. GPT-4 and Claude represent the frontier. Neural architecture innovations push boundaries. AI safety remains a critical concern.',
    nodeSlugs: [
      'large-language-models',
      'gpt4-claude',
      'neural-architecture',
      'ai-safety-research',
    ],
  },
  {
    title: 'ML Research Roundup Q1 2026',
    text: 'Research papers on open source models show rapid progress. Benchmarks and evals need standardization.',
    nodeSlugs: ['research-papers', 'open-source-models', 'benchmarks-evals'],
  },
  {
    title: 'EU AI Act: Compliance Guide',
    text: 'Policy and regulation frameworks like the EU AI Act set new standards. Ethics and bias considerations are paramount.',
    nodeSlugs: ['policy-regulation', 'eu-ai-act', 'ethics-bias'],
  },
  {
    title: 'Reddit r/ML Discussion Highlights',
    text: 'The r/MachineLearning community drives social discourse. Investment and VC trends shift toward open source.',
    nodeSlugs: ['r-machinelearning', 'social-discourse', 'open-source-models'],
  },
  {
    title: 'Healthcare AI Applications 2026',
    text: 'Healthcare AI expands with AI safety research guiding deployment. Ethics and bias checks are essential for patient outcomes.',
    nodeSlugs: ['healthcare-ai', 'ai-safety-research', 'ethics-bias'],
  },
  {
    title: 'Startup Funding Report',
    text: 'Investment and VC in AI startups grows. Startup ecosystem matures. GPT-4 and Claude deployments scale.',
    nodeSlugs: ['investment-vc', 'startup-ecosystem', 'gpt4-claude'],
  },
  {
    title: 'Neural Networks: A Survey',
    text: 'Neural architecture innovations abound. Benchmarks and evals provide the measuring stick. Large language models benefit from research papers.',
    nodeSlugs: [
      'neural-architecture',
      'benchmarks-evals',
      'large-language-models',
      'research-papers',
    ],
  },
  {
    title: 'Open Source AI Models Comparison',
    text: 'Open source models rival proprietary solutions. Research papers show performance parity. Social discourse on r/MachineLearning discusses implications.',
    nodeSlugs: ['open-source-models', 'research-papers', 'r-machinelearning'],
  },
  {
    title: 'AI Policy Landscape',
    text: 'Policy and regulation evolves. EU AI Act leads global frameworks. Ethics and bias remain key challenges. Social discourse shapes public opinion.',
    nodeSlugs: ['policy-regulation', 'eu-ai-act', 'ethics-bias', 'social-discourse'],
  },
];

const insertDoc = db.prepare('INSERT INTO docs (title, text, status) VALUES (?, ?, ?)');
const insertDocLink = db.prepare(
  'INSERT OR IGNORE INTO doc_node_links (doc_id, node_slug, score) VALUES (?, ?, ?)',
);

for (const doc of DOCS) {
  const result = insertDoc.run(doc.title, doc.text, 'derived');
  const docId = Number(result.lastInsertRowid);
  for (const slug of doc.nodeSlugs) {
    insertDocLink.run(docId, slug, 1.0);
  }
}

// ── Data Sources ──────────────────────────────────────────────────────

const insertSource = db.prepare(
  "INSERT INTO data_sources (source_type, config_json, status) VALUES (?, ?, 'done')",
);

insertSource.run('web', JSON.stringify({ url: 'https://example.com/ai-report-2025' }));
insertSource.run(
  'reddit',
  JSON.stringify({ threadUrl: 'https://www.reddit.com/r/MachineLearning/comments/example1/' }),
);
insertSource.run('web', JSON.stringify({ url: 'https://example.com/policy-brief' }));

console.log('Seed complete!');
console.log(`  ${CLUSTERS.length} clusters`);
console.log(`  ${NODES.length} nodes`);
console.log(`  ${EDGES.length} edges`);
console.log(`  ${DOCS.length} docs`);
console.log(`  3 data sources`);

db.close();
