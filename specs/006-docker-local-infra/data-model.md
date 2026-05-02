# Data Model: Local Infrastructure — Docker, PostgreSQL, Redis

**Feature**: 006-docker-local-infra  
**Date**: 2026-05-02

---

## Overview

This feature is infrastructure-only. There are no application entities, database tables, or domain models introduced. The "data model" for this feature describes the **configuration state** — the shape of environment variables, Docker service configuration, and file artifacts that the infrastructure introduces.

---

## Configuration Entities

### InfraDockerService

Represents a service declared in `infra/docker-compose.yml`.

| Field       | Type     | Constraints              | Notes                                    |
| ----------- | -------- | ------------------------ | ---------------------------------------- |
| name        | string   | Required, unique         | `postgres` or `redis`                    |
| image       | string   | Required, version-pinned | No `latest` tag                          |
| ports       | string[] | Required                 | `"HOST:CONTAINER"` format                |
| volumes     | string[] | Optional                 | Named volume references                  |
| healthcheck | object   | Recommended              | `test`, `interval`, `timeout`, `retries` |
| restart     | string   | Required                 | `unless-stopped` for local dev           |

### PostgresServiceConfig

| Variable    | Source              | Default    | Notes                                   |
| ----------- | ------------------- | ---------- | --------------------------------------- |
| DB_USER     | `infra/.env.docker` | `postgres` | Docker Compose env substitution         |
| DB_PASSWORD | `infra/.env.docker` | `postgres` | Local dev only — not a production value |
| DB_NAME     | `infra/.env.docker` | `leaseKo`  | Database name created on first start    |
| DB_PORT     | `infra/.env.docker` | `5432`     | Host-side port mapping                  |

### RedisServiceConfig

| Variable   | Source              | Default | Notes                  |
| ---------- | ------------------- | ------- | ---------------------- |
| REDIS_PORT | `infra/.env.docker` | `6379`  | Host-side port mapping |

### BackendEnvConfig

Environment variables read by the NestJS backend at startup. Validated by `validation.schema.ts`.

| Variable         | File            | Required | Format                                              | Notes                              |
| ---------------- | --------------- | -------- | --------------------------------------------------- | ---------------------------------- |
| DATABASE_URL     | `apps/api/.env` | Yes      | `postgresql://user:pass@host:port/db?schema=public` | Must match Docker Postgres service |
| REDIS_URL        | `apps/api/.env` | Yes      | `redis://host:port`                                 | Must match Docker Redis service    |
| NODE_ENV         | `apps/api/.env` | No       | `development` \| `production` \| `test`             | Defaults to `development`          |
| PORT             | `apps/api/.env` | No       | integer                                             | Defaults to `3001`                 |
| FRONTEND_URL     | `apps/api/.env` | Yes      | URI                                                 | CORS origin for Next.js dev server |
| CLERK_SECRET_KEY | `apps/api/.env` | No       | string                                              | Required when Epic 2 implemented   |
| CLERK_JWKS_URL   | `apps/api/.env` | No       | URI                                                 | Required when Epic 2 implemented   |

---

## Named Volumes

| Volume          | Service    | Persistence                    | Reset Behaviour                       |
| --------------- | ---------- | ------------------------------ | ------------------------------------- |
| `postgres_data` | PostgreSQL | Survives `docker compose down` | Destroyed by `docker compose down -v` |
| `redis_data`    | Redis      | Survives `docker compose down` | Destroyed by `docker compose down -v` |

**Note**: `redis_data` is retained to preserve BullMQ job state (pending, delayed, failed jobs) across container restarts during development.

---

## File Artifacts

| File                                              | Status             | Purpose                                         |
| ------------------------------------------------- | ------------------ | ----------------------------------------------- |
| `infra/docker-compose.yml`                        | Exists — update    | Core Docker services definition                 |
| `infra/.env.docker`                               | Exists — verify    | Docker Compose variable defaults (committed)    |
| `apps/api/.env.example`                           | Exists — verify    | Backend env template for developers             |
| `apps/web/.env.example`                           | Exists — no change | Frontend env template (no DB/Redis vars needed) |
| `.env.example`                                    | Exists — no change | Orientation doc pointing to per-app files       |
| `apps/api/src/common/config/validation.schema.ts` | Exists — no change | Joi validation for DATABASE_URL + REDIS_URL     |
| `README.md`                                       | Exists — update    | Add local infrastructure setup section          |

---

## State Transitions

### First Start (clean environment)

```
pnpm db:up
  → Docker creates postgres_data volume (empty)
  → Docker creates redis_data volume (empty)
  → PostgreSQL initialises database `leaseKo` with user `postgres`
  → Redis starts with no data
  → Adminer starts connected to postgres service
```

### Restart (volumes intact)

```
pnpm db:down → pnpm db:up
  → postgres_data volume retained
  → redis_data volume retained
  → PostgreSQL reconnects to existing data
  → Redis reconnects to existing data
```

### Full Reset

```
pnpm db:reset
  → docker compose down -v  (volumes destroyed)
  → Next pnpm db:up creates fresh volumes
  → Any applied Prisma migrations must be re-run
```
