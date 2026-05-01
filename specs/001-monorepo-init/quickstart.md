# Quickstart: Monorepo Initialization

**Feature**: `001-monorepo-init`
**Branch**: `001-monorepo-init`
**Last Updated**: 2026-05-02

---

## Prerequisites

Before you begin, ensure the following are installed:

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Node.js | 20 LTS | https://nodejs.org |
| pnpm | 9.x | `npm install -g pnpm` |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| Git | any | https://git-scm.com |

Verify:
```bash
node --version   # v20.x.x
pnpm --version   # 9.x.x
docker --version # Docker version 26.x.x
```

---

## Setup (First Time)

### 1. Clone and install dependencies

```bash
git clone <repo-url> LeaseKo
cd LeaseKo
pnpm install
```

A single `pnpm install` at the root installs all dependencies for every app and package in the workspace.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in any values marked `REQUIRED`. The defaults work for local development with Docker.

### 3. Start infrastructure services

```bash
pnpm db:up
```

This starts PostgreSQL (port 5432) and Redis (port 6379) via Docker Compose. Wait for both containers to reach a healthy state:

```bash
docker ps   # both containers should show "healthy"
```

To stop infrastructure:
```bash
pnpm db:down
```

### 4. Start all apps

```bash
pnpm dev
```

Turborepo starts all apps in parallel. Once ready:

| App | URL |
|-----|-----|
| Next.js frontend | http://localhost:3000 |
| NestJS API | http://localhost:3001 |
| API health check | http://localhost:3001/health |
| Adminer (DB GUI) | http://localhost:8080 |

---

## Running Apps Independently

```bash
# Frontend only
pnpm --filter @leaseKo/web dev

# Backend only
pnpm --filter @leaseKo/api dev
```

---

## Build

```bash
# Build all apps (uses Turborepo cache)
pnpm build

# Build a specific app
pnpm --filter @leaseKo/web build
pnpm --filter @leaseKo/api build
```

Subsequent builds of unchanged apps are served from cache and complete in seconds.

---

## Lint & Format

```bash
# Lint all apps and packages
pnpm lint

# Format all files
pnpm format
```

---

## Project Structure

```
LeaseKo/
├── apps/
│   ├── web/          # Next.js 14 frontend  → localhost:3000
│   └── api/          # NestJS 10 backend    → localhost:3001
├── packages/
│   └── config/       # Shared tsconfig + eslint configs
├── infra/
│   └── docker-compose.yml
├── .env.example      # All required environment variables documented here
├── turbo.json        # Turborepo pipeline
└── pnpm-workspace.yaml
```

---

## Environment Variables Reference

### Root `.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/leaseKo` | PostgreSQL connection URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |

### apps/api

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | NestJS HTTP server port |
| `NODE_ENV` | `development` | Runtime environment |
| `DATABASE_URL` | (from root) | PostgreSQL connection URL |
| `REDIS_URL` | (from root) | Redis connection URL |

### apps/web

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Base URL for the NestJS API |
| `NODE_ENV` | `development` | Runtime environment |

---

## Troubleshooting

### `pnpm install` fails
- Ensure Node.js v20+ is installed: `node --version`
- Clear pnpm cache: `pnpm store prune`

### Docker containers won't start
- Ensure Docker Desktop is running
- Check if ports 5432 or 6379 are already in use: `netstat -ano | findstr :5432`
- Stop conflicting services or change the port in `infra/docker-compose.yml` and `.env`

### NestJS starts on wrong port
- Ensure `PORT=3001` is set in `.env` or `apps/api/.env`
- Next.js defaults to 3000 and will try 3001 if 3000 is taken — always start NestJS explicitly on 3001

### Turborepo cache not working
- Verify `turbo.json` `outputs` paths match the actual build output directories
- Run `pnpm build --force` to bypass cache on a clean build

### `pnpm dev` shows no output for an app
- Check if the app's `package.json` has a `dev` script
- Run the app directly: `pnpm --filter @leaseKo/api dev`

---

## Next Steps

Once this setup is complete and all services are running, the next features are:

1. **Epic 4: Data Layer** — Install Prisma, define `User` and `Tenant` models, run migrations
2. **Epic 2: Authentication** — Integrate Clerk in Next.js and NestJS
3. **Epic 3: Multi-Tenancy** — Map Clerk `orgId` to `tenantId`, enforce tenant context globally
