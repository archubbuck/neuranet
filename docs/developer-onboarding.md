# Developer Onboarding Guide

> **Audience:** New developers starting from a clean machine — no prior software, no existing accounts.
> **Estimated time:** 30–45 minutes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Accounts & access](#accounts--access)
3. [Clone & install](#clone--install)
4. [Start the database](#start-the-database)
5. [Populate demo data](#populate-demo-data)
6. [Run the application](#run-the-application)
7. [Verify everything works](#verify-everything-works)
8. [Development workflow](#development-workflow)
9. [Optional: Personal Neon branch](#optional-personal-neon-branch)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these in order. All are free.

### 1. Git

```powershell
winget install --id Git.Git -e --source winget
```

Verify:

```powershell
git --version   # should be 2.x
```

Configure your identity:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### 2. Node.js 22 or later

The project requires Node.js >= 22.12.0 (see `engines` in `package.json`). Download the LTS installer from [nodejs.org](https://nodejs.org/en/download) (choose **22.x LTS or later**, 64-bit Windows `.msi`).

Run the installer — accept all defaults. Make sure **"Automatically install the necessary tools"** is checked (it installs Chocolatey and native build tools).

Verify:

```powershell
node --version   # should be v22.x.x or later (>=22.12.0)
npm --version    # should be 10.x.x or later
```

### 3. pnpm (Corepack-managed)

The project pins pnpm 11 via the `packageManager` field in `package.json`. Corepack will install the correct version automatically — no manual pnpm install needed.

```powershell
corepack enable
corepack prepare pnpm@11 --activate
```

Verify:

```powershell
pnpm --version   # should be 11.x.x or later
```

> **Why Corepack?** The `packageManager` field in `package.json` pins `pnpm@11.5.1`. Corepack ensures everyone uses the exact same version. The `engines` floor is `>=10`, but in practice you get 11.

### 4. Docker Desktop

Download from [docker.com](https://www.docker.com/products/docker-desktop/) and install.

After installation:
1. Launch Docker Desktop from the Start menu.
2. Accept the license agreement.
3. Skip the optional survey/sign-in (not required).
4. Wait for the whale icon in the system tray to stop animating (Docker Engine is running).

Verify:

```powershell
docker --version       # should be 20.x or later
docker compose version  # should be v2.x or later
```

> **Why Docker?** The project uses a Postgres 16 container for local development — no manual Postgres install needed.

### 5. Visual Studio Code

```powershell
winget install --id Microsoft.VisualStudioCode -e --source winget
```

Launch VS Code, then install the recommended extensions. VS Code will prompt you to install them when you open the project, or you can install them via the terminal:

```powershell
code --install-extension angular.ng-template
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

> Alternatively, open the command palette in VS Code (`Ctrl+Shift+P`), type `ext install`, and paste the extension ID.

Verify:

```powershell
code --list-extensions | findstr "angular.ng-template dbaeumer.vscode-eslint esbenp.prettier-vscode"
```

> **Why these extensions?** Angular template intelligence (`ng-template`), inline lint errors (`vscode-eslint`), and format-on-save with the project's Prettier config (`prettier-vscode`).

---

## Accounts & access

Ask your team lead to set up the following. You'll need these for later, not right now:

| Account | Purpose | Who sets it up |
|---------|---------|---------------|
| GitHub | Code access + PRs | You (create at [github.com](https://github.com)) |
| Vercel | Deployment previews | Team lead adds you to the Vercel team |
| Neon | Remote database (optional) | Team lead shares the project |

Once you have a GitHub account, ask to be added to the repo as a collaborator.

---

## Clone & install

```powershell
# 1. Clone the repository
git clone https://github.com/<org>/topic-visualizer.git
cd topic-visualizer

# 2. Install all dependencies (frontend + backend)
pnpm install
```

> **Expected output:** pnpm downloads ~600 packages. A few native modules (`esbuild`, `@parcel/watcher`) compile during install — this is normal and may take 1–2 minutes the first time.

---

## Start the database

The project uses a Postgres 16 container managed by Docker Compose.

> **Pre-flight check:** If you have a native Postgres installation, it may already occupy port 5432. Verify before starting:
>
> ```powershell
> netstat -ano | findstr ":5432"
> ```
>
> If you see a `postgres` process (not `com.docker.backend`), stop it:
>
> ```powershell
> taskkill /PID <PID> /F
> ```

```powershell
# Start Postgres in the background
docker compose up -d
```

> **First run:** Docker pulls the `postgres:16` image (~150 MB). Subsequent starts are instant.

Verify the database is healthy:

```powershell
docker compose ps
```

You should see the `postgres` service with `Status: healthy`.

**To stop the database later:**

```powershell
docker compose down
```

Data persists in a Docker volume (`pgdata`) across restarts. To wipe everything and start fresh:

```powershell
docker compose down -v
docker compose up -d
```

---

## Populate demo data

```powershell
# Apply database migrations (creates all tables)
pnpm db:migrate

# Insert demo data: 8 clusters, 18 nodes, 13 edges, 3 documents
pnpm db:seed
```

Expected output:

```
🌱 Seeding database...
  ✅ 8 clusters
  ✅ 18 nodes
  ✅ 13 edges
  ✅ 3 docs
✅ Seed complete.
```

---

## Run the application

### Using VS Code (recommended)

1. Open the **Run and Debug** panel (`Ctrl+Shift+D`).
2. Select **"ng serve"** from the dropdown at the top.
3. Press **F5** (or click the green play button).

This launches Chrome with the Angular dev server and API server running together. The pre-configured launch task (`npm: start`) runs `pnpm start` in the background.

### Using the terminal

```powershell
pnpm start
```

### What's running

| Process | URL | Purpose |
|---------|-----|---------|
| API server (Express) | `http://localhost:3000` | Backend routes, database access |
| Angular dev server | `http://localhost:4200` | Frontend with hot module reload |

The Angular dev server proxies `/api/*` requests to the backend — you only need to open port 4200.

Open **http://localhost:4200** in your browser.

> **First launch:** Angular compiles from scratch (~15–30 seconds). Subsequent compiles use incremental rebuilds (~1–2 seconds).

---

## Verify everything works

Run through this checklist to confirm your setup is correct:

### ✅ Application starts

- [ ] `http://localhost:4200` loads without errors in the browser console (F12 → Console).
- [ ] The landing page renders.

### ✅ Backend responds

```powershell
# Health check (no database needed)
curl http://localhost:3000/api/health
# → {"status":"ok"}

# Readiness check (database must be connected)
curl http://localhost:3000/api/health/ready
# → {"status":"ready","database":"connected"}
```

> `curl` is built into Windows 10+. If you prefer PowerShell's native cmdlet, use `Invoke-WebRequest http://localhost:3000/api/health`.

### ✅ Frontend tests pass

```powershell
pnpm test
```

> Expected: ~70–100 tests, all passing. This runs in a few seconds — no database needed.

### ✅ Backend tests pass

```powershell
pnpm test:server
```

> Expected: ~30–50 tests, all passing. Requires Docker to be running (Postgres container).

### ✅ Linting passes

```powershell
pnpm lint
```

> Expected: no errors. Warnings are acceptable.

### ✅ Type checking passes

```powershell
pnpm typecheck:server
```

> Expected: no output = no errors.

---

## Development workflow

### Daily commands

| Task | Command |
|------|---------|
| Start everything | `pnpm start` |
| Start API only | `pnpm start:api` |
| Start frontend only | `pnpm start:ui` |
| Run all frontend tests | `pnpm test` |
| Run all backend tests | `pnpm test:server` |
| Run a specific test | `pnpm vitest run --config server/vitest.config.mjs server/index.test.ts -t "search"` |
| Lint all code | `pnpm lint` |
| Auto-format code | `pnpm format` |
| Check formatting | `pnpm format:check` |
| Type check server | `pnpm typecheck:server` |

### Database

| Task | Command |
|------|---------|
| Apply new migrations | `pnpm db:migrate` |
| Generate migration from schema changes | `pnpm db:generate` |
| Re-seed demo data (wipes existing) | `pnpm db:seed` |
| Stop database | `docker compose down` |
| Wipe database & start fresh | `docker compose down -v && docker compose up -d && pnpm db:migrate && pnpm db:seed` |

### Before committing

The project enforces quality gates via pre-commit hooks (Husky + lint-staged):

```powershell
# These run automatically on `git commit`:
# - prettier --write   (formats staged .ts/.html/.css files)
# - eslint --fix       (fixes auto-fixable lint issues in staged .ts files)
```

If a hook fails, fix the issue and commit again. To run all checks manually before committing:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck:server
pnpm test
pnpm test:server
```

### Project structure at a glance

```
topic-visualizer/
├── src/app/              # Angular frontend
│   ├── ui/               #   Dumb presentational components (primitives, overlays, charts)
│   ├── data/             #   Types, API service, state store (signals)
│   ├── screens/          #   One folder per routed feature
│   ├── shell/            #   App chrome (sidebar, mobile nav)
│   └── core/             #   App-wide services (toast, format, auth guard)
├── server/               # Express backend
│   ├── routes/           #   One file per domain (sources, network, search, etc.)
│   ├── db/               #   Drizzle schema, migrations, drivers
│   ├── middleware/        #   Auth, validation, error handling
│   ├── repositories/     #   Data access layer
│   └── lib/              #   Pure helpers (derivation, email, logger, redis)
├── scripts/              # Seed, bootstrap, and utility scripts
└── docs/                 # Architecture decisions, deployment, onboarding
```

Key architectural rules (enforced by ESLint):

- `src/app/ui/` must NOT import from `data/`, `screens/`, or `shell/`.
- `src/app/data/` must NOT import from `screens/`, `ui/`, or `shell/`.
- All components use standalone, OnPush, signals-only patterns.
- Backend uses Zod validation on every POST/PUT body.
- Multi-step writes are wrapped in Drizzle transactions.

Read `.github/copilot-instructions.md` for the full architectural law, and `docs/adr/` for the decision record behind each rule.

### Making your first change

1. Create a feature branch:

   ```powershell
   git checkout -b feat/my-first-change
   ```

2. Make your changes. Write a test first (TDD).

3. Run the relevant test suite:

   ```powershell
   pnpm test            # frontend changes
   pnpm test:server     # backend changes
   ```

4. Commit:

   ```powershell
   git add -A
   git commit -m "feat: describe your change"
   ```

5. Push and open a PR:

   ```powershell
   git push -u origin feat/my-first-change
   ```

   Then open the link printed in the terminal to create a pull request.

CI runs automatically on every push: lint → type-check → frontend tests → backend tests → migration gate → security audit. All must pass before merging.

---

## Optional: Personal Neon branch

The default setup uses a local Docker Postgres container. If you want a remote database that persists across machines, create a personal Neon branch:

### One-time setup

1. Get your Neon API key from [console.neon.tech](https://console.neon.tech) → Project Settings → API Keys → **Create API Key**.
2. Get your Project ID from Project Settings → General.

Set them as environment variables (PowerShell):

```powershell
[Environment]::SetEnvironmentVariable("NEON_API_KEY", "napi_...", "User")
[Environment]::SetEnvironmentVariable("NEON_PROJECT_ID", "your-project-id", "User")
```

Close and reopen your terminal for the variables to take effect.

### Create your branch

```powershell
pnpm dev:bootstrap --seed
```

This:
1. Creates a Neon branch named after your git username.
2. Writes the connection string to `.env.local`.
3. Applies all migrations.
4. Seeds demo data (because of `--seed`).

After this, `pnpm start` and `pnpm test:server` will use your Neon branch instead of Docker.

> **Note:** The Neon HTTP driver doesn't support `db.transaction()`. Transaction-dependent backend tests will be skipped locally but still verified in CI (which uses `pg`). This is a known trade-off — see `docs/database-isolation-strategy.md` for details.

---

## Troubleshooting

### `pnpm: command not found`

Corepack may not have activated properly. Re-run:

```powershell
corepack enable
corepack prepare pnpm@11 --activate
```

### `docker: command not found`

Docker Desktop isn't installed or isn't running. Check the system tray for the Docker whale icon. If it's missing, launch Docker Desktop from the Start menu.

### `docker compose up -d` fails with "port is already allocated"

Another Postgres instance (e.g., a native Windows install) is using port 5432.

**Identify the conflicting process:**

```powershell
netstat -ano | findstr ":5432"
```

If you see a `postgres` process (not `com.docker.backend`):

```powershell
# Find the process details
Get-Process -Id <PID> | Select-Object Id, ProcessName, Path

# Stop the native Postgres
taskkill /PID <PID> /F
```

Then re-run `docker compose up -d`.

> **Note:** This is a common issue for developers who installed Postgres natively before using Docker. The project's Docker Compose maps port 5432 to the container — if a native install already occupies it, the Docker container will fail to bind. Stopping the native instance resolves it; you can re-enable it later when not using this project.

### Backend tests fail with "database does not exist"

This usually means the `.env.local` file points to a stale or incorrect database. Run:

```powershell
type .env.local
```

If it contains a Neon URL (`neon.tech`) instead of a local Postgres URL, update it:

```powershell
@"
# Local development Postgres (Docker Compose).
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/neuranet_dev
"@ | Out-File -FilePath .env.local -Encoding utf8
```

Then restart tests: `pnpm test:server`.

If the container isn't healthy, restart it:

```powershell
docker compose down
docker compose up -d
```

### Frontend tests fail with "No tests found"

At least one `.spec.ts` file must exist. This is a known Angular/Vitest requirement. If you deleted all spec files, create at least one minimal spec.

### `pnpm install` fails with native module errors

Some native modules (`esbuild`, `@parcel/watcher`) require build tools:

```powershell
# Install Visual Studio Build Tools (one-time)
npm install -g windows-build-tools
```

Or install [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with the "Desktop development with C++" workload.

### Port 4200 or 3000 is already in use

```powershell
# Find what's using the port
netstat -ano | findstr :4200
netstat -ano | findstr :3000

# Kill the process (replace <PID> with the actual process ID)
taskkill /PID <PID> /F
```

### Changes aren't showing in the browser

Angular's dev server uses hot module reload. If styles or templates aren't updating:

1. Hard refresh the browser: `Ctrl+Shift+R`.
2. Check the terminal running `pnpm start` for compilation errors.
3. Restart the dev server: `Ctrl+C` then `pnpm start` again.

---

## Getting help

| Resource | Where |
|----------|-------|
| Architecture decisions | `docs/adr/` |
| Coding standards | `.github/copilot-instructions.md` |
| Layer rules (frontend) | `.github/instructions/frontend.instructions.md` |
| Layer rules (backend) | `.github/instructions/backend.instructions.md` |
| Database isolation | `docs/database-isolation-strategy.md` |
| Deployment guide | `docs/deployment.md` |
| UI component rules | `.github/instructions/ui-primitives.instructions.md` |

Still stuck? Ask in the team channel or open a GitHub issue.
