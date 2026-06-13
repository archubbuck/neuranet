import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config';
import { createSqliteDriver } from './drivers/sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqliteMigrationsDir = join(__dirname, '..', 'migrations', 'sqlite');

/**
 * Creates the database connection dynamically based on environment.
 * - POSTGRES_URL set → Neon serverless Postgres (async, serverless-safe)
 * - Otherwise → better-sqlite3 (synchronous, local dev + tests)
 *
 * Exports a unified `db` (Drizzle client) plus `sqlite` (raw better-sqlite3
 * instance, available only in SQLite mode for test seeding/truncation).
 */
function createDb() {
  const postgresUrl = process.env['POSTGRES_URL'];

  if (postgresUrl) {
    // Lazy-load Postgres driver — avoids importing neon in SQLite-only contexts.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPostgresDriver, applyPostgresMigrations } =
      require('./drivers/postgres') as typeof import('./drivers/postgres');
    const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');

    const { db } = createPostgresDriver(pgMigrationsDir);

    // Return a promise-like: the caller must await init before using.
    return {
      db: db as unknown as ReturnType<typeof createSqliteDriver>['db'],
      sqlite: undefined as never,
      dialect: 'postgres' as const,
      _init: () => applyPostgresMigrations(db, pgMigrationsDir),
    };
  }

  // SQLite (default).
  const { sqlite, db } = createSqliteDriver(sqliteMigrationsDir);
  return {
    db,
    sqlite,
    dialect: 'sqlite' as const,
    _init: undefined as never,
  };
}

const { sqlite, db, dialect } = createDb();

export { sqlite, db, dialect };
export * from './schema';
