/**
 * SQLite connection + schema. Importing this module opens the database
 * (creating the data directory on first run) and runs the Drizzle-managed
 * migrations against it. Returns the shared `better-sqlite3` instance.
 *
 * PR 1 keeps a compatibility shim: the raw `better-sqlite3` instance is
 * the default export so all existing routes that use `db.prepare(...)` /
 * `db.transaction(...)` continue to work without modification. PR 2 will
 * layer Drizzle repositories on top.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import config from './config';
import * as schema from './db/schema';

if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

const db = new Database(config.dbPath);

// Run all generated SQL migrations. The migrations folder ships with the
// repo (`server/migrations/sqlite/`) and Drizzle tracks applied versions
// in its own `__drizzle_migrations` table inside the database.
const migrationsFolder = path.join(__dirname, 'migrations', 'sqlite');
migrate(drizzle(db, { schema }), { migrationsFolder });

export default db;
export { schema };
export type Db = typeof db;
