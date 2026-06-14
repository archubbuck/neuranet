/**
 * Database connection + schema. Importing this module opens the database
 * connection and returns the shared Drizzle client for all repository-
 * based code.
 */
import { db, dialect } from './db/client.js';
import { ClustersRepo } from './repositories/clusters.repo.js';
import { NodesRepo } from './repositories/nodes.repo.js';
import { DocsRepo } from './repositories/docs.repo.js';
import { SourcesRepo } from './repositories/sources.repo.js';
import { NetworkRepo } from './repositories/network.repo.js';
import { SearchRepo } from './repositories/search.repo.js';
import { ReportsRepo } from './repositories/reports.repo.js';

// Re-export the Drizzle client for routes and repositories.
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
