import { defineConfig } from 'drizzle-kit';

// Load .env.local if present (local dev). Silently skip on Vercel.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* optional */
}

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/migrations/postgres',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['POSTGRES_URL'] || 'postgres://localhost:5432/neuranet_dev',
  },
});
