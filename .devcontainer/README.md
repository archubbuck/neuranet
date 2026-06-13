# Codespaces / Dev Containers

Open this repo in a GitHub Codespace (or locally via **Dev Containers: Reopen in Container**). On first create, corepack activates `pnpm@11.5.1`, then `pnpm install --frozen-lockfile` runs (~2–3 min); afterward, run `pnpm start` in the terminal to launch the Express API (port 3000) and Angular UI (port 4200). Click the auto-forwarded **4200** port to open the UI — the Angular dev server proxies `/api` to the API per `proxy.conf.json`. The SQLite database is created on first API run at `data/neuranet.db` (gitignored); no `.env` file is required.

## What's configured

- **Image:** `mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm` (matches the Node ≥22.12 engine requirement).
- **Machine size:** declares `hostRequirements` of 4 CPUs / 8 GB RAM / 32 GB storage so Codespaces provisions a machine large enough for Angular builds.
- **Lifecycle:** `onCreateCommand` activates pnpm (cached in prebuilds), `updateContentCommand` runs `pnpm install --frozen-lockfile` (re-runs when the lockfile changes, including in prebuilds), and `postCreateCommand` ensures the `data/` directory exists.
- **Pnpm store:** mounted to a named volume (`neuranet-pnpm-store`) so the content-addressable store persists across rebuilds and speeds up subsequent installs.
- **Ports:** `4200` (Angular UI, auto-preview) and `3000` (Express API, silent).
- **VS Code:** Angular Language Service, ESLint (flat-config), Prettier, Vitest Explorer, EditorConfig; format-on-save, workspace TypeScript SDK, LF line endings.

## Codespaces prebuilds

Because installation runs in `onCreateCommand` / `updateContentCommand` (not `postCreateCommand`), the work is captured by [Codespaces prebuilds](https://docs.github.com/en/codespaces/prebuilding-your-codespaces). Enable a prebuild for this repo in **Settings → Codespaces → Prebuild configurations** to get near-instant Codespace startup.
