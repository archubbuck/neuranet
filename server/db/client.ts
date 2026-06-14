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
async function createDb() {
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
    const { createPostgresDriver, applyPostgresMigrations } = await import('./drivers/postgres');
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
  const schema = await import('./schema');

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
export * from './schema';
