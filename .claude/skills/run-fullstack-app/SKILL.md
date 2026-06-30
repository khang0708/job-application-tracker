---
name: run-fullstack-app
description: Run, start, build, test, screenshot, or verify the fullstack app (Next.js frontend + NestJS backend + PostgreSQL)
---

# run-fullstack-app

This is a pnpm monorepo: NestJS backend on port 4000, Next.js 14 frontend on port 3000, PostgreSQL 16 in Docker. The primary agent harness is `.claude/skills/run-fullstack-app/smoke.mjs`, a Node.js script that exercises the live API and checks that all frontend pages respond. For interactive UI work, drive the frontend with `chromium-cli` against `http://localhost:3000`.

## Prerequisites

- **Docker Desktop** must be running. On Windows, launch it from the Start menu or:
  ```
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  ```
  Wait until `docker ps` succeeds before continuing.

- **Backend `.env`** must exist:
  ```
  cp apps/backend/.env.example apps/backend/.env
  ```
  Defaults match the Docker Compose config and work out of the box.

## Start

Run from the repo root. Each command in its own terminal (or background process).

```
# 1. Database
docker-compose up -d postgres

# 2. Backend (port 4000) — wait for "Nest application successfully started"
pnpm --filter=backend dev

# 3. Frontend (port 3000) — wait for "Ready in Xs"
pnpm --filter=frontend dev
```

Backend startup takes ~5s and auto-creates the `users` table via TypeORM sync. Frontend takes ~3s.

## Run (agent path) — smoke harness

After both apps are up:

```
node .claude/skills/run-fullstack-app/smoke.mjs
```

This verifies: health endpoint, register, login, `/me` with JWT, 401 on bad password, and 200 responses for `/`, `/login`, `/register`. Exits non-zero on any failure.

Override URLs if ports differ:
```
API_URL=http://localhost:4000/api WEB_URL=http://localhost:3000 node .claude/skills/run-fullstack-app/smoke.mjs
```

## Run (agent path) — UI via chromium-cli

For visual or interaction testing of the frontend:

```
chromium-cli navigate http://localhost:3000
chromium-cli screenshot /tmp/home.png
chromium-cli navigate http://localhost:3000/login
chromium-cli screenshot /tmp/login.png
```

## Tests

```
pnpm --filter=backend test
```

Frontend has no test suite configured.

## Gotchas

- **`next.config.ts` is not supported** in Next.js 14 — the file must be `next.config.js` or `next.config.mjs`. The original `.ts` config was renamed to `next.config.mjs` to fix this. If you see `Configuring Next.js via 'next.config.ts' is not supported`, the `.ts` file snuck back in.

- **`docker-compose up`** prints a warning about the obsolete `version:` attribute in `docker-compose.yml` — this is harmless and can be ignored.

- **TypeORM auto-sync** (`synchronize: true`) is active in non-production. Schema changes applied to entities are reflected immediately on next backend start. Do not use this in production.

- **JWT default secret** in `.env.example` is `your-super-secret-jwt-key-change-in-production`. The default is intentionally weak for local dev — all tests use it.

- **Password in `$home` variable name** — PowerShell's `$HOME` is read-only. Don't assign the home-page response to `$home`; use `$homeResp` or similar.
