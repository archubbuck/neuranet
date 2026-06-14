import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate as drizzleMigrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from '../schema.js';

/**
 * Creates a Neon serverless Postgres connection and Drizzle client.
 * Requires POSTGRES_URL env var. Applies migrations on first connect.
 */
export function createPostgresDriver(migrationsDir: string) {
  const postgresUrl = process.env['POSTGRES_URL'];
  if (!postgresUrl) {
    throw new Error('POSTGRES_URL environment variable is required for Postgres driver');
  }

  const sql = neon(postgresUrl);
  const db = drizzle({ client: sql, schema });

  // Migrations are applied lazily — call applyMigrations() after creation.
  return { sql, db, migrationsDir };
}

/**
 * Applies pending Drizzle migrations. Must be called after driver creation
 * before using the database.
 */
export async function applyPostgresMigrations(
  db: ReturnType<typeof drizzle>,
  migrationsDir: string,
) {
  await drizzleMigrate(db, { migrationsFolder: migrationsDir });
}
