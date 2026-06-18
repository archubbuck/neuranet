/**
 * Centralised environment loading and driver resolution.
 * Every module that needs env vars imports this — never reads
 * `process.env` directly or calls `process.loadEnvFile` ad-hoc.
 */

// Load .env.local once, at module scope. Silently skip if absent.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* optional */
}

export function getPostgresUrl(): string {
  const url = process.env['POSTGRES_URL'];
  if (!url) {
    throw new Error(
      'POSTGRES_URL environment variable is required. ' +
        'Run `docker compose up -d` for a local Postgres container, ' +
        'or set POSTGRES_URL to your Neon branch connection string.',
    );
  }
  return url;
}

/** Explicit driver selection: 'neon-http' | 'pg'. Defaults to 'pg'. */
export function getDbDriver(): 'neon-http' | 'pg' {
  const explicit = process.env['DB_DRIVER'];
  if (explicit === 'neon-http' || explicit === 'pg') return explicit;

  // Fallback: auto-detect from POSTGRES_URL for backward compatibility.
  const url = process.env['POSTGRES_URL'] || '';
  if (url.includes('neon.tech')) return 'neon-http';

  return 'pg';
}
