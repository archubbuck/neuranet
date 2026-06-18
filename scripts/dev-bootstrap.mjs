/**
 * Dev bootstrap — creates a personal Neon database branch and writes
 * the connection string to .env.local so local dev is zero-setup.
 *
 * Prerequisites:
 *   Set NEON_API_KEY and NEON_PROJECT_ID env vars (once per machine).
 *   Get these from https://console.neon.tech → Project Settings.
 *
 * Usage:
 *   node scripts/dev-bootstrap.mjs
 *
 * What it does:
 *   1. Creates a Neon branch named after your git username (or NEON_BRANCH_NAME).
 *   2. Copies the connection string into .env.local.
 *   3. Runs migrations against the new branch.
 *   4. Optionally seeds demo data (--seed flag).
 *
 * If POSTGRES_URL is already set in .env.local, it asks before overwriting.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const envPath = join(repoRoot, '.env.local');

const NEON_API_KEY = process.env['NEON_API_KEY'];
const NEON_PROJECT_ID = process.env['NEON_PROJECT_ID'];

if (!NEON_API_KEY || !NEON_PROJECT_ID) {
  console.error(
    '❌ NEON_API_KEY and NEON_PROJECT_ID must be set.\n' +
      '   Get them from https://console.neon.tech → Project Settings → API Keys.\n' +
      '   Then run:\n' +
      '     $env:NEON_API_KEY="..."\n' +
      '     $env:NEON_PROJECT_ID="..."\n' +
      '     node scripts/dev-bootstrap.mjs',
  );
  process.exit(1);
}

// Derive branch name from git config or env override.
function getBranchName() {
  const envName = process.env['NEON_BRANCH_NAME'];
  if (envName) return envName;

  try {
    const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    if (name) return name.toLowerCase().replace(/\s+/g, '-');
  } catch {
    /* fall through */
  }

  try {
    const name = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    const user = name.split('@')[0];
    if (user) return user;
  } catch {
    /* fall through */
  }

  return 'local-dev';
}

const BRANCH_NAME = getBranchName();
const NEON_API_BASE = 'https://console.neon.tech/api/v2';

async function main() {
  // Check if .env.local already has POSTGRES_URL.
  if (existsSync(envPath)) {
    const existing = readFileSync(envPath, 'utf-8');
    if (existing.includes('POSTGRES_URL=')) {
      const shouldSeed = process.argv.includes('--seed');
      console.log('⚠️  .env.local already contains POSTGRES_URL. Skipping branch creation.');
      if (shouldSeed) {
        console.log('🌱 Seeding database...');
        execSync('pnpm db:seed', { cwd: repoRoot, stdio: 'inherit' });
      }
      console.log('✅ Ready. Run `pnpm start` to begin.');
      return;
    }
  }

  console.log(`🔧 Creating Neon branch "${BRANCH_NAME}"...`);

  // Create the branch via Neon API.
  const createRes = await fetch(`${NEON_API_BASE}/projects/${NEON_PROJECT_ID}/branches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NEON_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      branch: {
        name: BRANCH_NAME,
        parent_id: undefined, // root branch — will use main
      },
      endpoints: [{ type: 'read_write' }],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error(`❌ Failed to create Neon branch: ${createRes.status} ${err}`);
    // Fall back to local Postgres.
    console.log('💡 Falling back to local Postgres. Run `docker compose up -d` first.');
    const localUrl = 'postgres://postgres:postgres@localhost:5432/neuranet_dev';
    writeFileSync(envPath, `POSTGRES_URL=${localUrl}\n`, 'utf-8');
    console.log(`✅ Wrote .env.local with local Postgres URL.`);
    return;
  }

  const branchData = await createRes.json();
  const connectionUri = branchData.endpoints?.[0]?.host
    ? `postgresql://${branchData.endpoints[0].host}`
    : null;

  if (!connectionUri) {
    console.error('❌ Branch created but no connection URI returned. Check Neon console.');
    process.exit(1);
  }

  // Write .env.local.
  writeFileSync(envPath, `POSTGRES_URL=${connectionUri}\n`, 'utf-8');
  console.log(`✅ Branch "${BRANCH_NAME}" created. Wrote .env.local.`);

  // Apply migrations.
  console.log('📦 Applying migrations...');
  execSync('pnpm db:migrate', { cwd: repoRoot, stdio: 'inherit' });

  // Optionally seed.
  if (process.argv.includes('--seed')) {
    console.log('🌱 Seeding demo data...');
    execSync('pnpm db:seed', { cwd: repoRoot, stdio: 'inherit' });
  }

  console.log('✅ Bootstrap complete. Run `pnpm start` to begin.');
}

main().catch((err) => {
  console.error('❌ Bootstrap failed:', err.message);
  process.exit(1);
});
