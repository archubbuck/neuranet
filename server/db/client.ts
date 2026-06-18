import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPostgresUrl, getDbDriver } from '../env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Creates the database connection dynamically based on environment.
 * - DB_DRIVER=neon-http (or POSTGRES_URL contains neon.tech) → Neon HTTP driver
 * - DB_DRIVER=pg (default) → pg (node-postgres) for CI/local PG
 * - No POSTGRES_URL → throws with a helpful error message
 */
async function createDb() {
  const postgresUrl = getPostgresUrl();
  const driver = getDbDriver();
  const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');

  if (driver === 'neon-http') {
    // Neon serverless Postgres — HTTP driver (safe for Vercel serverless).
    const { createPostgresDriver, applyPostgresMigrations } = await import('./drivers/postgres.js');
    const { db } = createPostgresDriver(pgMigrationsDir);

    return {
      db,
      dialect: 'postgres' as const,
      _init: () => applyPostgresMigrations(db, pgMigrationsDir),
    };
  }

  // Standard Postgres (CI/local) — use pg (node-postgres) driver.
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const schema = await import('./schema.js');

  const pool = new Pool({ connectionString: postgresUrl });
  const db = drizzle({ client: pool, schema });

  // Apply pending migrations at startup.
  await migrate(db, { migrationsFolder: pgMigrationsDir });

  return {
    db,
    dialect: 'postgres' as const,
    _init: undefined as never,
  };
}

const { db, dialect } = await createDb();

export { db, dialect };
export * from './schema.js';
