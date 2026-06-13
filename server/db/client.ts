import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqliteDriver } from './drivers/sqlite';
import { createPostgresDriver, applyPostgresMigrations } from './drivers/postgres';

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
    const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');
    const { db } = createPostgresDriver(pgMigrationsDir);

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
