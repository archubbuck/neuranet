/**
 * Standalone migration runner: applies all pending migrations to the
 * configured database. Detects dialect from POSTGRES_URL env var.
 * - POSTGRES_URL with neon.tech → Neon HTTP driver
 * - POSTGRES_URL without neon.tech → pg (node-postgres) for CI/local
 * Called via `pnpm db:migrate`.
 */

// Load .env.local if present (local dev). Silently skip on Vercel.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* optional */
}

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function isNeonUrl(url: string): boolean {
  return url.includes('neon.tech');
}

async function main() {
  const postgresUrl = process.env['POSTGRES_URL'];

  if (!postgresUrl) {
    throw new Error(
      'POSTGRES_URL environment variable is required. ' +
        'Run `vercel env pull .env.local` for local dev, ' +
        'or set it to a local Postgres connection string.',
    );
  }

  const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');

  if (isNeonUrl(postgresUrl)) {
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
