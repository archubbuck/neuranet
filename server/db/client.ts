import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqliteDriver } from './drivers/sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqliteMigrationsDir = join(__dirname, '..', 'migrations', 'sqlite');

function isNeonUrl(url: string): boolean {
  return url.includes('neon.tech');
}

/**
 * Creates the database connection dynamically based on environment.
 * - POSTGRES_URL with neon.tech → Neon HTTP driver (serverless-safe)
 * - POSTGRES_URL without neon.tech → pg (node-postgres) for CI/local PG
 * - Otherwise → better-sqlite3 (synchronous, local dev + tests)
 */
function createDb() {
  const postgresUrl = process.env['POSTGRES_URL'];

  if (postgresUrl) {
    const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');

    if (isNeonUrl(postgresUrl)) {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { createPostgresDriver, applyPostgresMigrations } =
        require('./drivers/postgres');
      /* eslint-enable @typescript-eslint/no-require-imports */
      const { db } = createPostgresDriver(pgMigrationsDir);

      return {
        db: db as unknown as ReturnType<typeof createSqliteDriver>['db'],
        sqlite: undefined as never,
        dialect: 'postgres' as const,
        _init: () => applyPostgresMigrations(db, pgMigrationsDir),
      };
    }

    // Standard Postgres (CI/local) — use pg driver.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { Pool } = require('pg');
    const { drizzle } = require('drizzle-orm/node-postgres');
    const { migrate } = require('drizzle-orm/node-postgres/migrator');
    const schema = require('./schema.pg');
    /* eslint-enable @typescript-eslint/no-require-imports */

    const pool = new Pool({ connectionString: postgresUrl });
    const db = drizzle({ client: pool, schema });

    // Apply migrations synchronously at startup for standard PG.
    migrate(db, { migrationsFolder: pgMigrationsDir });

    return {
      db: db as unknown as ReturnType<typeof createSqliteDriver>['db'],
      sqlite: undefined as never,
      dialect: 'postgres' as const,
      _init: undefined as never,
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
