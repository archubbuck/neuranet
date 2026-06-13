/**
 * Standalone migration runner: applies all pending migrations to the
 * configured database. Called via `pnpm db:migrate`.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';
import config from '../config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sqlite = new Database(config.dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

migrate(db, {
  migrationsFolder: join(__dirname, '..', 'migrations', 'sqlite'),
});

console.log('Migrations applied successfully.');
