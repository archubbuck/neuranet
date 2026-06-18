/**
 * Standalone migration runner: applies all pending migrations to the
 * configured database. Uses the centralised env module for driver
 * resolution. Called via `pnpm db:migrate`.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPostgresUrl, getDbDriver } from '../env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const postgresUrl = getPostgresUrl();
  const driver = getDbDriver();
  const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');

  if (driver === 'neon-http') {
    // Neon HTTP driver (serverless-safe).
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { migrate } = await import('drizzle-orm/neon-http/migrator');
    const schema = await import('./schema.js');

    const sql = neon(postgresUrl);
    const db = drizzle({ client: sql, schema });
    await migrate(db, { migrationsFolder: pgMigrationsDir });
  } else {
    // Standard pg driver (CI/local Postgres).
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const schema = await import('./schema.js');

    const pool = new Pool({ connectionString: postgresUrl });
    const db = drizzle({ client: pool, schema });
    await migrate(db, { migrationsFolder: pgMigrationsDir });
    await pool.end();
  }

  console.log('Postgres migrations applied successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
