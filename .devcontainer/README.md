# Codespaces / Dev Containers

Open this repo in a GitHub Codespace (or locally via **Dev Containers: Reopen in Container**). The first build runs `pnpm install` automatically (~2–3 min); afterward, run `pnpm start` in the terminal to launch the Express API (port 3000) and Angular UI (port 4200). Click the auto-forwarded **4200** port to open the UI — the Angular dev server proxies `/api` to the API per `proxy.conf.json`. The SQLite database is created on first API run at `data/neuranet.db` (gitignored); no `.env` file is required.
