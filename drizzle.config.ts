/**
 * drizzle-kit configuration. PR 1 ships the SQLite dialect only; PR 3
 * adds a Postgres config (or env-gated dialect switch) alongside this
 * one for Neon-bound migrations.
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/db/schema.ts',
  out: './server/migrations/sqlite',
  dbCredentials: {
    url: process.env.NEURANET_DB_PATH || './data/neuranet.db',
  },
});
