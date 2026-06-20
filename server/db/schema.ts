import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  vector,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ── docs ────────────────────────────────────────────────────────────────
export const docs = pgTable('docs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  text: text('text').notNull(),
  status: text('status').notNull().default('done'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── derived_clusters ────────────────────────────────────────────────────
export const derivedClusters = pgTable('derived_clusters', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── derived_nodes ───────────────────────────────────────────────────────
export const derivedNodes = pgTable('derived_nodes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  description: text('description').notNull(),
  clusterSlug: text('cluster_slug')
    .notNull()
    .references(() => derivedClusters.slug),
  radius: integer('radius').notNull(),
  importance: integer('importance').notNull(),
  depth: integer('depth').notNull().default(0),
  isCentral: boolean('is_central').notNull().default(false),
  sentiment: real('sentiment'),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── node_links ──────────────────────────────────────────────────────────
export const nodeLinks = pgTable(
  'node_links',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    sourceSlug: text('source_slug').notNull(),
    targetSlug: text('target_slug').notNull(),
    linkKind: text('link_kind').notNull().default('related'),
    weight: real('weight').notNull().default(1.0),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [unique('node_links_source_target').on(table.sourceSlug, table.targetSlug)],
);

// ── doc_node_links ──────────────────────────────────────────────────────
export const docNodeLinks = pgTable(
  'doc_node_links',
  {
    docId: integer('doc_id')
      .notNull()
      .references(() => docs.id),
    nodeSlug: text('node_slug')
      .notNull()
      .references(() => derivedNodes.slug),
    score: real('score').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.docId, table.nodeSlug] })],
);

// ── data_sources ────────────────────────────────────────────────────────
export const dataSources = pgTable('data_sources', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  sourceType: text('source_type').notNull(),
  configJson: text('config_json').notNull().default('{}'),
  status: text('status').notNull().default('pending'),
  statusMessage: text('status_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── waitlist_entries ──────────────────────────────────────────────────
export const waitlistEntries = pgTable('waitlist_entries', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  email: text('email').notNull().unique(),
  confirmationSent: boolean('confirmation_sent').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
