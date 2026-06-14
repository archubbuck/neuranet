import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function isNeonUrl(url: string): boolean {
  return url.includes('neon.tech');
}

/**
 * Creates the database connection dynamically based on environment.
 * - POSTGRES_URL with neon.tech → Neon HTTP driver (serverless-safe)
 * - POSTGRES_URL without neon.tech → pg (node-postgres) for CI/local PG
 * - No POSTGRES_URL → throws with a helpful error message
 */
function createDb() {
  const postgresUrl = process.env['POSTGRES_URL'];

  if (!postgresUrl) {
    throw new Error(
      'POSTGRES_URL environment variable is required. ' +
        'Run `vercel env pull .env.local` for local dev, ' +
        'or set it to a local Postgres connection string (e.g. postgres://localhost:5432/neuranet_dev).',
    );
  }

  const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');

  if (isNeonUrl(postgresUrl)) {
    // Neon serverless Postgres — HTTP driver (safe for Vercel serverless).
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { createPostgresDriver, applyPostgresMigrations } = require('./drivers/postgres');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const { db } = createPostgresDriver(pgMigrationsDir);

    return {
      db,
      dialect: 'postgres' as const,
      _init: () => applyPostgresMigrations(db, pgMigrationsDir),
    };
  }

  // Standard Postgres (CI/local) — use pg (node-postgres) driver.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');
  const { migrate } = require('drizzle-orm/node-postgres/migrator');
  const schema = require('./schema');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const pool = new Pool({ connectionString: postgresUrl });
  const db = drizzle({ client: pool, schema });

  // Apply pending migrations at startup.
  migrate(db, { migrationsFolder: pgMigrationsDir });

  return {
    db,
    dialect: 'postgres' as const,
    _init: undefined as never,
  };
}

const { db, dialect } = createDb();

export { db, dialect };
export * from './schema';
