/**
 * Standalone migration runner: applies all pending migrations to the
 * configured database. Detects dialect from POSTGRES_URL env var.
 * - POSTGRES_URL with neon.tech → Neon HTTP driver
 * - POSTGRES_URL without neon.tech → pg (node-postgres) for CI
 * - No POSTGRES_URL → better-sqlite3
 * Called via `pnpm db:migrate`.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function isNeonUrl(url: string): boolean {
  return url.includes('neon.tech');
}

async function main() {
  const postgresUrl = process.env['POSTGRES_URL'];

  if (postgresUrl) {
    const pgMigrationsDir = join(__dirname, '..', 'migrations', 'postgres');

    if (isNeonUrl(postgresUrl)) {
      // Neon HTTP driver
      const { neon } = await import('@neondatabase/serverless');
      const { drizzle } = await import('drizzle-orm/neon-http');
      const { migrate } = await import('drizzle-orm/neon-http/migrator');
      const schema = await import('./schema.pg');

      const sql = neon(postgresUrl);
      const db = drizzle({ client: sql, schema });
      await migrate(db, { migrationsFolder: pgMigrationsDir });
    } else {
      // Standard pg driver (CI/local Postgres)
      const { Pool } = await import('pg');
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const { migrate } = await import('drizzle-orm/node-postgres/migrator');
      const schema = await import('./schema.pg');

      const pool = new Pool({ connectionString: postgresUrl });
      const db = drizzle({ client: pool, schema });
      await migrate(db, { migrationsFolder: pgMigrationsDir });
      await pool.end();
    }

    console.log('Postgres migrations applied successfully.');
  } else {
    // SQLite path
    const Database = (await import('better-sqlite3')).default;
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
    const schema = await import('./schema');
    const config = await import('../config');

    const sqlite = new Database(config.default.dbPath);
    if (!config.default.dbPath.startsWith(':memory:')) {
      sqlite.pragma('journal_mode = WAL');
    }
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: join(__dirname, '..', 'migrations', 'sqlite') });

    console.log('SQLite migrations applied successfully.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
