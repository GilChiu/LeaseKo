# Quick Start: Local Infrastructure

**Feature**: 006-docker-local-infra  
**Date**: 2026-05-02

---

## Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) (Windows/macOS) or Docker Engine + Compose plugin (Linux)
- Node.js ≥ 20.0.0
- pnpm ≥ 9.0.0
- Ports 5432, 6379, and 8080 must be free on your machine

---

## 1. Copy Environment Files

```bash
# Backend
cp apps/api/.env.example  apps/api/.env

# Frontend
cp apps/web/.env.example  apps/web/.env.local
```

The `infra/.env.docker` file is already committed and contains the Docker service defaults — no action needed.

---

## 2. Start Local Infrastructure

```bash
pnpm db:up
```

This starts PostgreSQL, Redis, and Adminer in the background using `infra/docker-compose.yml`.

Expected output:

```
[+] Running 3/3
 ✔ Container leaseKo-postgres  Started
 ✔ Container leaseKo-redis     Started
 ✔ Container leaseKo-adminer   Started
```

---

## 3. Verify Services Are Healthy

```bash
pnpm db:ps
```

All three services should show `(healthy)` status within ~30 seconds.

Manual check:

```bash
# PostgreSQL — expect "leaseKo-postgres ... (healthy)"
docker ps --filter name=leaseKo-postgres

# Redis — expect PONG
docker exec leaseKo-redis redis-cli ping
```

---

## 4. Start the Backend

```bash
cd apps/api && pnpm dev
# OR from monorepo root:
pnpm dev
```

If `DATABASE_URL` or `REDIS_URL` is missing from `apps/api/.env`, the backend will exit immediately with:

```
[ConfigModule] Config validation error: "DATABASE_URL" is required
```

---

## 5. Verify the Health Endpoint

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-05-02T00:00:00.000Z"
}
```

---

## Adminer (Database GUI)

Navigate to [http://localhost:8080](http://localhost:8080) and log in with:

| Field    | Value      |
| -------- | ---------- |
| System   | PostgreSQL |
| Server   | `postgres` |
| Username | `postgres` |
| Password | `postgres` |
| Database | `leaseKo`  |

---

## Lifecycle Commands

| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `pnpm db:up`    | Start all local services (detached)             |
| `pnpm db:down`  | Stop all services (volumes preserved)           |
| `pnpm db:logs`  | Tail logs for all services                      |
| `pnpm db:ps`    | Show running containers and health status       |
| `pnpm db:reset` | Stop services and destroy volumes (destructive) |

Service-specific logs:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs -f postgres
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs -f redis
```

---

## Reset the Database

> **Warning**: This destroys all data. Any applied Prisma migrations must be re-run afterwards.

```bash
pnpm db:reset
```

Then restart:

```bash
pnpm db:up
```

---

## Troubleshooting

**Port already in use (5432 / 6379 / 8080)**

A local service is already using the port. Either stop it or change the port in `infra/.env.docker`:

```bash
DB_PORT=5433
REDIS_PORT=6380
```

Then update `apps/api/.env` to match:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/leaseKo
REDIS_URL=redis://localhost:6380
```

**Backend fails with `DATABASE_URL is required`**

Copy the env example:

```bash
cp apps/api/.env.example apps/api/.env
```

**PostgreSQL container exits immediately**

Check logs:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs postgres
```

Common cause: a previous container left a `postmaster.pid` lock file. Reset the volume:

```bash
pnpm db:reset && pnpm db:up
```

---

## What This Enables

| Future Feature              | Dependency                                                         |
| --------------------------- | ------------------------------------------------------------------ |
| Feature 007 — Prisma ORM    | `DATABASE_URL` → run `prisma migrate dev` against local PostgreSQL |
| Feature 008 — BullMQ Queues | `REDIS_URL` → connect queue workers to local Redis                 |
| Feature 009 — Clerk Auth    | No Docker dependency — uses Clerk hosted service                   |
