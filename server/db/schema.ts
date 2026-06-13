import { sqliteTable, text, integer, real, unique, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── docs ────────────────────────────────────────────────────────────────
export const docs = sqliteTable('docs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  text: text('text').notNull(),
  status: text('status').notNull().default('done'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── derived_clusters ────────────────────────────────────────────────────
export const derivedClusters = sqliteTable('derived_clusters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── derived_nodes ───────────────────────────────────────────────────────
export const derivedNodes = sqliteTable('derived_nodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  description: text('description').notNull(),
  clusterSlug: text('cluster_slug')
    .notNull()
    .references(() => derivedClusters.slug),
  radius: integer('radius').notNull(),
  importance: integer('importance').notNull(),
  depth: integer('depth').notNull().default(0),
  isCentral: integer('is_central', { mode: 'boolean' }).notNull().default(false),
  sentiment: real('sentiment'), // NULL-able, added via migration
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── node_links ──────────────────────────────────────────────────────────
export const nodeLinks = sqliteTable(
  'node_links',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceSlug: text('source_slug').notNull(),
    targetSlug: text('target_slug').notNull(),
    linkKind: text('link_kind').notNull().default('related'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [unique('node_links_source_target').on(table.sourceSlug, table.targetSlug)],
);

// ── doc_node_links ──────────────────────────────────────────────────────
export const docNodeLinks = sqliteTable(
  'doc_node_links',
  {
    docId: integer('doc_id')
      .notNull()
      .references(() => docs.id),
    nodeSlug: text('node_slug')
      .notNull()
      .references(() => derivedNodes.slug),
    score: real('score').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [primaryKey({ columns: [table.docId, table.nodeSlug] })],
);

// ── data_sources ────────────────────────────────────────────────────────
export const dataSources = sqliteTable('data_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceType: text('source_type').notNull(),
  configJson: text('config_json').notNull().default('{}'),
  status: text('status').notNull().default('pending'),
  statusMessage: text('status_message'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});
