/**
 * SQLite connection + schema. Importing this module opens the database
 * (creating the data directory and tables on first run) and returns the
 * shared `better-sqlite3` instance.
 */
const fs = require('node:fs');
const Database = require('better-sqlite3');
const config = require('./config');

if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

const db = new Database(config.dbPath);

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

module.exports = db;
