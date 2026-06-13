import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/db/schema.pg.ts',
  out: './server/migrations/postgres',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['POSTGRES_URL'] || 'postgres://localhost:5432/neuranet',
  },
});
