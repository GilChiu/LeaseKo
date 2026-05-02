# LeaseKo

Property Management SaaS — multi-tenant platform for managing properties, units, leases, and payments.

## Prerequisites

| Tool           | Version   |
| -------------- | --------- |
| Node.js        | >= 20 LTS |
| pnpm           | >= 9      |
| Docker Desktop | latest    |

## Quickstart

```bash
# 1. Install all dependencies (once)
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start infrastructure (PostgreSQL + Redis)
pnpm db:up

# 4. Start all apps
pnpm dev
```

## Apps

| App           | URL                          | Description  |
| ------------- | ---------------------------- | ------------ |
| Web (Next.js) | http://localhost:3000        | Frontend     |
| API (NestJS)  | http://localhost:3001        | Backend      |
| Health check  | http://localhost:3001/health | API liveness |
| Adminer       | http://localhost:8080        | Database GUI |

## Workspace Commands

```bash
pnpm dev          # Start all apps
pnpm build        # Build all apps (with Turborepo cache)
pnpm lint         # Lint all apps and packages
pnpm format       # Format all files with Prettier
pnpm db:up        # Start Docker infrastructure
pnpm db:down      # Stop Docker infrastructure

# Run a single app
pnpm --filter @leaseKo/web dev
pnpm --filter @leaseKo/api dev
```

## Structure

```
apps/
  web/      Next.js 14 frontend
  api/      NestJS 10 backend
packages/
  config/   Shared TypeScript + ESLint configs
infra/
  docker-compose.yml   PostgreSQL 16 + Redis 7
```

For full setup documentation see [specs/001-monorepo-init/quickstart.md](specs/001-monorepo-init/quickstart.md).
