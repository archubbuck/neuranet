/**
 * Database connection + schema. Importing this module opens the database
 * (creating the data directory and tables on first run via Drizzle
 * migrations) and returns the shared connection for both legacy
 * synchronous routes and the new repository-based code.
 */
import fs from 'node:fs';
import { sqlite, db, dialect } from './db/client';
import config from './config';
import { ClustersRepo } from './repositories/clusters.repo';
import { NodesRepo } from './repositories/nodes.repo';
import { DocsRepo } from './repositories/docs.repo';
import { SourcesRepo } from './repositories/sources.repo';
import { NetworkRepo } from './repositories/network.repo';
import { SearchRepo } from './repositories/search.repo';
import { ReportsRepo } from './repositories/reports.repo';

// Ensure the data directory exists (needed for file-based SQLite).
if (!config.dbPath.startsWith(':memory:') && !fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// Re-export the raw sqlite instance for legacy synchronous route handlers
// that use `db.prepare(...).run/get/all()` directly.
// In Postgres mode, sqlite is undefined — tests must use the Drizzle client.
export { sqlite as db };
// Also export the Drizzle client for new code.
export { db as drizzle };
export { dialect };

// Repository instances — created once, shared across all routes.
export const clustersRepo = new ClustersRepo(db, dialect);
export const nodesRepo = new NodesRepo(db, dialect);
export const docsRepo = new DocsRepo(db, dialect);
export const sourcesRepo = new SourcesRepo(db, dialect);
export const networkRepo = new NetworkRepo(db, dialect);
export const searchRepo = new SearchRepo(db, dialect);
export const reportsRepo = new ReportsRepo(db, dialect);
