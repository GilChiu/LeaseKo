# LeaseKo

Property Management SaaS — multi-tenant platform for managing properties, units, leases, and payments.

## Prerequisites

| Tool           | Version   |
| -------------- | --------- |
| Node.js        | >= 20 LTS |
| pnpm           | >= 9      |
| Docker Desktop | >= 4      |

## Quickstart

```bash
# 1. Install all dependencies (once)
pnpm install

# 2. Copy environment files
cp apps/api/.env.example  apps/api/.env
cp apps/web/.env.example  apps/web/.env.local

# 3. Start infrastructure (PostgreSQL + Redis)
pnpm db:up

# 4. Start all apps
pnpm dev
```

## Apps

| App           | URL                                 | Description  |
| ------------- | ----------------------------------- | ------------ |
| Web (Next.js) | http://localhost:3000               | Frontend     |
| API (NestJS)  | http://localhost:3001               | Backend      |
| Health check  | http://localhost:3001/api/v1/health | API liveness |
| Adminer       | http://localhost:8080               | Database GUI |

## Workspace Commands

```bash
pnpm dev          # Start all apps
pnpm build        # Build all apps (with Turborepo cache)
pnpm lint         # Lint all apps and packages
pnpm typecheck    # Type-check all apps and packages
pnpm format       # Format all files with Prettier

# Infrastructure
pnpm db:up        # Start Docker services (PostgreSQL + Redis + Adminer)
pnpm db:down      # Stop all services (volumes preserved)
pnpm db:logs      # Tail logs for all services
pnpm db:ps        # Show container status and health
pnpm db:reset     # Stop services and destroy volumes (destructive)

# Run a single app
pnpm --filter @leaseKo/web dev
pnpm --filter @leaseKo/api dev
```

## Local Infrastructure

All backend services run as Docker containers defined in `infra/docker-compose.yml`.

### Services

| Service    | Image                | Port | Purpose                 |
| ---------- | -------------------- | ---- | ----------------------- |
| `postgres` | `postgres:16-alpine` | 5432 | Primary database        |
| `redis`    | `redis:7-alpine`     | 6379 | Queue broker (BullMQ)   |
| `adminer`  | `adminer:4`          | 8080 | Database GUI (dev only) |

### Adminer Login

Navigate to http://localhost:8080 and use:

| Field    | Value      |
| -------- | ---------- |
| System   | PostgreSQL |
| Server   | `postgres` |
| Username | `postgres` |
| Password | `postgres` |
| Database | `leaseKo`  |

### Environment Variables

The backend reads these from `apps/api/.env` (copy from `apps/api/.env.example`):

| Variable       | Local Default                                           | Required |
| -------------- | ------------------------------------------------------- | -------- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/leaseKo` | Yes      |
| `REDIS_URL`    | `redis://localhost:6379`                                | Yes      |
| `FRONTEND_URL` | `http://localhost:3000`                                 | Yes      |
| `PORT`         | `3001`                                                  | No       |
| `NODE_ENV`     | `development`                                           | No       |

The backend fails fast at startup if `DATABASE_URL` or `REDIS_URL` is missing.

### Troubleshooting

**Port already in use (5432 / 6379 / 8080)**

Another process is using the port. Stop it, or change the port in `infra/.env.docker`:

```bash
# infra/.env.docker
DB_PORT=5433
REDIS_PORT=6380
```

Then update `apps/api/.env` to match:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/leaseKo
REDIS_URL=redis://localhost:6380
```

**Backend fails with `"DATABASE_URL" is required`**

The `apps/api/.env` file is missing. Copy the example:

```bash
cp apps/api/.env.example apps/api/.env
```

**PostgreSQL container exits immediately**

Check logs:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs postgres
```

Common cause: a leftover `postmaster.pid` lock file. Reset the volume:

```bash
pnpm db:reset
pnpm db:up
```

**View logs for a specific service**

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs -f postgres
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs -f redis
```

### Next Steps

| Feature     | Description                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Feature 007 | Prisma ORM — `DATABASE_URL` connects Prisma to PostgreSQL; run `prisma migrate dev` to apply schema               |
| Feature 008 | BullMQ Queues — `REDIS_URL` connects queue workers to Redis; every job payload must include `tenantId` + `userId` |
| Feature 009 | Clerk Auth — hosted service; requires `CLERK_SECRET_KEY` + `CLERK_JWKS_URL` in `apps/api/.env`                    |

## Structure

```
apps/
  web/      Next.js 14 frontend
  api/      NestJS 10 backend
packages/
  config/   Shared TypeScript + ESLint configs
infra/
  docker-compose.yml   PostgreSQL 16 + Redis 7 + Adminer 4
  .env.docker          Docker service variable defaults (committed)
```

For full setup documentation see [specs/006-docker-local-infra/quickstart.md](specs/006-docker-local-infra/quickstart.md).
