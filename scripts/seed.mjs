/**
 * Seed script — populates the Postgres database with demo data so the
 * network graph, search, and reports pages have content to display.
 *
 * Requires a running Postgres instance (local or Neon branch).
 * Set POSTGRES_URL via .env.local or export it in the terminal.
 *
 * Usage: pnpm db:seed
 */

// Load .env.local if present.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* optional */
}

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const postgresUrl = process.env['POSTGRES_URL'];
if (!postgresUrl) {
  console.error(
    '❌ POSTGRES_URL is not set.\n' +
      '   Run `docker compose up -d` for local Postgres, or\n' +
      '   run `node scripts/dev-bootstrap.mjs` to create a Neon branch.',
  );
  process.exit(1);
}

const isNeon = postgresUrl.includes('neon.tech');

async function main() {
  if (isNeon) {
    // Neon HTTP driver.
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const schema = await import('../server/db/schema.js');

    const sql = neon(postgresUrl);
    const db = drizzle({ client: sql, schema });
    await seed(db, schema);
    return;
  }

  // Standard pg driver.
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const schema = await import('../server/db/schema.js');

  const pool = new Pool({ connectionString: postgresUrl });
  const db = drizzle({ client: pool, schema });
  await seed(db, schema);
  await pool.end();
}

async function seed(db, s) {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters — FK constraints).
  await db.delete(s.docNodeLinks);
  await db.delete(s.nodeLinks);
  await db.delete(s.derivedNodes);
  await db.delete(s.derivedClusters);
  await db.delete(s.docs);
  await db.delete(s.dataSources);
  await db.delete(s.waitlistEntries);

  // ── Clusters ──────────────────────────────────────────────────
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

  function colorFromSlug(slug) {
    let hash = 0;
    for (let i = 0; i < slug.length; i++) hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360} 72% 62%)`;
  }

  await db
    .insert(s.derivedClusters)
    .values(CLUSTERS.map((c) => ({ slug: c.slug, label: c.label, color: colorFromSlug(c.slug) })));
  console.log(`  ✅ ${CLUSTERS.length} clusters`);

  // ── Nodes ─────────────────────────────────────────────────────
  const NODES = [
    {
      slug: 'large-language-models',
      label: 'Large Language Models',
      cluster: 'tech-ai',
      radius: 34,
      importance: 10,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'gpt4-claude',
      label: 'GPT-4 / Claude',
      cluster: 'tech-ai',
      radius: 26,
      importance: 8,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'neural-architecture',
      label: 'Neural Architecture',
      cluster: 'tech-ai',
      radius: 24,
      importance: 7,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'ai-safety-research',
      label: 'AI Safety Research',
      cluster: 'tech-ai',
      radius: 28,
      importance: 9,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'research-papers',
      label: 'Research Papers',
      cluster: 'research',
      radius: 30,
      importance: 9,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'benchmarks-evals',
      label: 'Benchmarks & Evals',
      cluster: 'research',
      radius: 18,
      importance: 5,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'open-source-models',
      label: 'Open Source Models',
      cluster: 'research',
      radius: 26,
      importance: 8,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'policy-regulation',
      label: 'Policy & Regulation',
      cluster: 'policy',
      radius: 24,
      importance: 7,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'eu-ai-act',
      label: 'EU AI Act',
      cluster: 'policy',
      radius: 18,
      importance: 5,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'ethics-bias',
      label: 'Ethics & Bias',
      cluster: 'policy',
      radius: 22,
      importance: 6,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'r-machinelearning',
      label: 'r/MachineLearning',
      cluster: 'social',
      radius: 22,
      importance: 6,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'social-discourse',
      label: 'Social Discourse',
      cluster: 'social',
      radius: 18,
      importance: 5,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'investment-vc',
      label: 'Investment & VC',
      cluster: 'business',
      radius: 16,
      importance: 4,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'startup-ecosystem',
      label: 'Startup Ecosystem',
      cluster: 'business',
      radius: 14,
      importance: 3,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'healthcare-ai',
      label: 'Healthcare AI',
      cluster: 'health',
      radius: 20,
      importance: 6,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'climate-change',
      label: 'Climate Change',
      cluster: 'climate',
      radius: 22,
      importance: 6,
      depth: 0,
      isCentral: true,
    },
    {
      slug: 'renewable-energy',
      label: 'Renewable Energy',
      cluster: 'climate',
      radius: 18,
      importance: 5,
      depth: 1,
      isCentral: false,
    },
    {
      slug: 'media-coverage',
      label: 'Media Coverage',
      cluster: 'media',
      radius: 16,
      importance: 4,
      depth: 0,
      isCentral: false,
    },
  ];

  await db.insert(s.derivedNodes).values(
    NODES.map((n) => ({
      slug: n.slug,
      label: n.label,
      description: `Topic: ${n.label}. Auto-generated for demo.`,
      clusterSlug: n.cluster,
      radius: n.radius,
      importance: n.importance,
      depth: n.depth,
      isCentral: n.isCentral,
    })),
  );
  console.log(`  ✅ ${NODES.length} nodes`);

  // ── Edges ─────────────────────────────────────────────────────
  const EDGES = [
    { source: 'large-language-models', target: 'gpt4-claude' },
    { source: 'large-language-models', target: 'neural-architecture' },
    { source: 'large-language-models', target: 'ai-safety-research' },
    { source: 'ai-safety-research', target: 'policy-regulation' },
    { source: 'ai-safety-research', target: 'ethics-bias' },
    { source: 'research-papers', target: 'benchmarks-evals' },
    { source: 'research-papers', target: 'open-source-models' },
    { source: 'research-papers', target: 'large-language-models' },
    { source: 'policy-regulation', target: 'eu-ai-act' },
    { source: 'r-machinelearning', target: 'social-discourse' },
    { source: 'investment-vc', target: 'startup-ecosystem' },
    { source: 'climate-change', target: 'renewable-energy' },
    { source: 'climate-change', target: 'policy-regulation' },
  ];

  await db.insert(s.nodeLinks).values(
    EDGES.map((e) => ({
      sourceSlug: e.source,
      targetSlug: e.target,
      linkKind: 'same-doc',
    })),
  );
  console.log(`  ✅ ${EDGES.length} edges`);

  // ── Docs ──────────────────────────────────────────────────────
  await db.insert(s.docs).values([
    {
      title: 'AI Landscape 2025',
      text: 'Large language models like GPT-4 and Claude are advancing rapidly. Neural architecture innovations are driving efficiency gains. AI safety research remains critical as models scale. Policy regulation, especially the EU AI Act, is shaping the industry.',
      status: 'derived',
    },
    {
      title: 'Research Frontiers',
      text: 'Research papers continue to push boundaries in benchmarks and evaluation methods. Open source models are democratizing access. The gap between proprietary and open models is narrowing.',
      status: 'derived',
    },
    {
      title: 'Climate & Policy',
      text: 'Climate change demands urgent action. Renewable energy adoption is accelerating globally. Policy frameworks are being developed to support the transition to sustainable energy sources.',
      status: 'derived',
    },
  ]);
  console.log('  ✅ 3 docs');

  console.log('✅ Seed complete.');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
