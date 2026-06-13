/**
 * Standalone migration runner: applies all pending migrations to the
 * configured database. Detects dialect from POSTGRES_URL env var.
 * Called via `pnpm db:migrate`.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const postgresUrl = process.env['POSTGRES_URL'];

  if (postgresUrl) {
    // Postgres path
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { migrate } = await import('drizzle-orm/neon-http/migrator');
    const schema = await import('./schema.pg');

    const sql = neon(postgresUrl);
    const db = drizzle({ client: sql, schema });

    await migrate(db, {
      migrationsFolder: join(__dirname, '..', 'migrations', 'postgres'),
    });

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

    migrate(db, {
      migrationsFolder: join(__dirname, '..', 'migrations', 'sqlite'),
    });

    console.log('SQLite migrations applied successfully.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
