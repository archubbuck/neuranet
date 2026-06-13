/**
 * Drizzle schema — single source of truth for the database. Mirrors the
 * tables previously created inline via `db.exec(CREATE TABLE ...)` in
 * `server/db.js`, including the `sentiment` column that used to be added
 * via a try/catch `ALTER TABLE`.
 *
 * The dialect imports come from `drizzle-orm/sqlite-core` for PR 1; a
 * second Postgres schema (or a dialect-agnostic factory) will be added in
 * PR 3 when Neon is wired in.
 */
import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const docs = sqliteTable('docs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  text: text('text').notNull(),
  status: text('status').notNull().default('done'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const derivedClusters = sqliteTable('derived_clusters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

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
  isCentral: integer('is_central').notNull().default(0),
  // Added historically via inline ALTER TABLE; defined here so future
  // migrations stay in sync with the live schema.
  sentiment: real('sentiment'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

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
  (table) => [
    uniqueIndex('node_links_source_target_unique').on(table.sourceSlug, table.targetSlug),
  ],
);

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
