# Quickstart: Running the Initial Prisma Migration

**Feature**: 014-prisma-migrations  
**Date**: 2026-05-03  
**Prerequisite**: Feature 013 complete — `User`, `Tenant`, `TenantMembership` models exist in `apps/api/prisma/schema.prisma`

---

## Prerequisites

1. **Docker Desktop** must be running.
2. **PostgreSQL container** must be healthy.
3. **`apps/api/.env`** must exist with `DATABASE_URL` set.

---

## Step 1 — Start Docker PostgreSQL

```powershell
# From repo root
pnpm db:up
```

Wait for the container to be healthy:

```powershell
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker ps
```

Expected: `leaseKo-postgres` shows `healthy`.

---

## Step 2 — Validate the Prisma Schema

```powershell
pnpm db:validate
# or: pnpm --filter @leaseKo/api prisma:validate
```

Expected: `The schema at ... is valid 🚀`

---

## Step 3 — Run the Initial Migration

```powershell
pnpm db:migrate
# or: pnpm --filter @leaseKo/api prisma:migrate
```

When Prisma prompts for a migration name, enter:

```
init_base_identity_tenant_models
```

> **Note**: The `prisma:migrate` script runs `prisma migrate dev`. The `--name` flag can be passed directly to skip the prompt:
> ```powershell
> pnpm --filter @leaseKo/api exec prisma migrate dev --name init_base_identity_tenant_models
> ```

Expected output:
```
Applying migration `<timestamp>_init_base_identity_tenant_models`
Your database is now in sync with your schema.
Generated Prisma Client (v5.22.0)
```

---

## Step 4 — Check Migration Status

```powershell
pnpm db:status
# or: pnpm --filter @leaseKo/api prisma:migrate:status
```

Expected: `Database schema is up to date!`

---

## Step 5 — Regenerate Prisma Client

```powershell
pnpm db:generate
# or: pnpm --filter @leaseKo/api prisma:generate
```

Expected: `Generated Prisma Client (v5.22.0)`

---

## Step 6 — Build the NestJS API

```powershell
pnpm --filter @leaseKo/api build
```

Expected: exits 0 with no TypeScript errors.

---

## Step 7 — (Optional) Verify in Prisma Studio

```powershell
pnpm db:studio
# or: pnpm --filter @leaseKo/api prisma:studio
```

Opens at `http://localhost:5555`. Verify that `User`, `Tenant`, and `TenantMembership` models are visible with 0 records.

---

## Step 8 — (Optional) Verify in Adminer

Open `http://localhost:8080` in a browser.

Login with:
- System: `PostgreSQL`
- Server: `postgres` (Docker container name)
- Username: `postgres`
- Password: `postgres`
- Database: `leaseKo`

Verify tables: `users`, `tenants`, `tenant_memberships`, `_prisma_migrations`.

---

## Local Reset (DESTRUCTIVE — Local Only)

> ⚠️ **WARNING**: This deletes ALL data in the local database. Never run on production.

```powershell
# Option 1: Prisma reset (drops and re-applies all migrations)
pnpm --filter @leaseKo/api exec prisma migrate reset

# Option 2: Docker volume reset (drops entire PostgreSQL container + data)
pnpm db:reset           # removes volumes
pnpm db:up              # restart fresh
pnpm db:migrate         # re-apply migration
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Can't reach database server` | Docker not running or container unhealthy | `pnpm db:up`, wait for healthy |
| `database "leaseKo" does not exist` | Container started but DB not created | Check docker-compose env vars; `pnpm db:reset ; pnpm db:up` |
| `Environment variable not found: DATABASE_URL` | `.env` missing | Copy `.env.example` to `.env` in `apps/api/` |
| `There are no pending migrations` | Migration already applied | Run `pnpm db:status` — all good |
| `Schema drift detected` | Manual DB changes out of sync | `pnpm --filter @leaseKo/api exec prisma migrate reset` |
