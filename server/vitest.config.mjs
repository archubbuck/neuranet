import { defineConfig } from 'vitest/config';

// Separate Vitest project for backend tests so it doesn't collide with
// the Angular jsdom setup that @angular/build configures for `ng test`.
// Run via: `pnpm test:server`.
//
// POSTGRES_URL: set in CI workflow or .env.local; falls back to the
// docker-compose default for local dev (`docker compose up -d`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.{ts,mjs}'],
    // Each test file runs in its own worker with its own connection.
    isolate: true,
    pool: 'forks',
    env: {
      POSTGRES_URL:
        process.env['POSTGRES_URL'] || 'postgres://postgres:postgres@localhost:5432/neuranet_dev',
    },
  },
});
