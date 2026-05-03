# Local Development Guide — Data Layer

This guide covers the local database workflow for LeaseKo backend developers: running migrations, checking status, generating the Prisma Client, and inspecting tables.

---

## Prerequisites

Before running any database commands:

1. **Docker Desktop** must be running.
2. **`apps/api/.env`** must exist with `DATABASE_URL` set.
   ```
   # Copy from apps/api/.env.example
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo
   ```
3. **pnpm** installed globally (`pnpm@9`).

---

## Starting the Local Database

```powershell
# Start PostgreSQL + Redis + Adminer (from repo root)
pnpm db:up

# Check container health
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker ps
```

PostgreSQL is ready when `leaseKo-postgres` shows `healthy`.

---

## Running Migrations

### First migration (initial setup)

```powershell
# From repo root — delegates to apps/api
pnpm db:migrate
```

When prompted for a migration name, enter:
```
init_base_identity_tenant_models
```

Or pass the name directly to skip the prompt:
```powershell
pnpm --filter @leaseKo/api exec prisma migrate dev --name init_base_identity_tenant_models
```

Expected output:
```
Applying migration `<timestamp>_init_base_identity_tenant_models`
Your database is now in sync with your schema.
Generated Prisma Client (v5.22.0)
```

### Adding future migrations

When you add a new model or change the schema:
```powershell
pnpm db:migrate
# Enter a descriptive migration name when prompted (see naming convention below)
```

### ⚠️ Never run `pnpm db:migrate` against a production database

`prisma migrate dev` is a development-only command. Use `prisma migrate deploy` in production/CI. Verify your `DATABASE_URL` points to `localhost` before running any migration.

---

## Checking Migration Status

```powershell
pnpm db:status
# or: pnpm --filter @leaseKo/api prisma:migrate:status
```

Expected (when in sync):
```
Database schema is up to date!
```

If pending migrations are shown, run `pnpm db:migrate` to apply them.

---

## Generating the Prisma Client

```powershell
pnpm db:generate
# or: pnpm --filter @leaseKo/api prisma:generate
```

Run this after any schema change or after a fresh `git clone`. Does **not** require Docker.

---

## Validating the Schema

```powershell
pnpm db:validate
# or: pnpm --filter @leaseKo/api prisma:validate
```

Checks `apps/api/prisma/schema.prisma` for syntax errors. Does **not** require Docker.

---

## Inspecting Tables — Prisma Studio

```powershell
pnpm db:studio
# or: pnpm --filter @leaseKo/api prisma:studio
```

Opens at **http://localhost:5555**. Shows all models with live data. Do not manually edit records unless debugging.

Expected models after initial migration: `User`, `Tenant`, `TenantMembership`.

---

## Inspecting Tables — Adminer

Adminer is included in the Docker Compose stack and requires no setup.

Open **http://localhost:8080** and log in with:

| Field | Value |
|-------|-------|
| System | PostgreSQL |
| Server | `postgres` |
| Username | `postgres` |
| Password | `postgres` |
| Database | `leaseKo` |

Expected tables: `users`, `tenants`, `tenant_memberships`, `_prisma_migrations`.

---

## Local Database Reset

> ⚠️ **DESTRUCTIVE — LOCAL DEVELOPMENT ONLY**
>
> These commands **permanently delete all data** in your local database.
> **Never run these against a production or staging database.**
> Verify `DATABASE_URL` contains `localhost` before proceeding.

### Option 1 — Prisma reset (drops data, re-applies all migrations)

```powershell
pnpm --filter @leaseKo/api exec prisma migrate reset
# Prisma will prompt: "Are you sure you want to reset your database? All data will be lost."
# Type 'y' to confirm.
```

### Option 2 — Docker volume reset (full wipe + restart)

```powershell
pnpm db:reset   # docker compose down -v — removes all volumes (ALL DATA DELETED)
pnpm db:up      # restart containers
pnpm db:migrate # re-apply migrations
```

---

## Migration Naming Convention

Migration names must be **descriptive snake_case** — they become part of the permanent migration history.

| ✅ Good name | ❌ Bad name |
|-------------|------------|
| `init_base_identity_tenant_models` | `init` |
| `add_property_unit_models` | `update` |
| `add_lease_payment_models` | `fix` |
| `add_maintenance_request_table` | `migration1` |
| `rename_users_email_to_contact_email` | `final` |
| `add_index_tenant_memberships_role` | `changes` |

**Rule**: The name must describe **what changes**, not that a change happened.

---

## Anti-Patterns

- ❌ Never run `prisma migrate dev` on a production database — use `prisma migrate deploy`
- ❌ Never commit `apps/api/.env` — it is gitignored for a reason
- ❌ Never hardcode `DATABASE_URL` in source code — always use `env("DATABASE_URL")`
- ❌ Never add Prisma queries directly to controllers — use repository interfaces
- ❌ Never use vague migration names (`fix`, `update`, `changes`)
- ❌ Never manually edit the `_prisma_migrations` table

---

## Command Reference

| Task | Command |
|------|---------|
| Start local database | `pnpm db:up` |
| Stop local database | `pnpm db:down` |
| Run migration | `pnpm db:migrate` |
| Check migration status | `pnpm db:status` |
| Generate Prisma Client | `pnpm db:generate` |
| Validate schema | `pnpm db:validate` |
| Format schema | `pnpm db:format` |
| Open Prisma Studio | `pnpm db:studio` |
| Open Adminer | http://localhost:8080 |
| Reset database (DESTRUCTIVE) | `pnpm --filter @leaseKo/api exec prisma migrate reset` |
| Full Docker reset (DESTRUCTIVE) | `pnpm db:reset && pnpm db:up && pnpm db:migrate` |

---

## Command Order for Fresh Local Setup

```powershell
# 1. Copy env file (first time only)
Copy-Item apps/api/.env.example apps/api/.env

# 2. Start database
pnpm db:up

# 3. Run migrations
pnpm db:migrate  # enter: init_base_identity_tenant_models

# 4. Check status
pnpm db:status

# 5. Generate Prisma Client
pnpm db:generate

# 6. Build and start API
pnpm --filter @leaseKo/api build
pnpm --filter @leaseKo/api start
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Can't reach database server at localhost:5432` | Docker not running or unhealthy | `pnpm db:up` and wait for `healthy` |
| `Environment variable not found: DATABASE_URL` | `.env` missing | `Copy-Item apps/api/.env.example apps/api/.env` |
| `There are no pending migrations to apply` | Already up to date | Run `pnpm db:status` — all good |
| `Schema drift detected` | DB was manually modified | `pnpm --filter @leaseKo/api exec prisma migrate reset` |
| `database "leaseKo" does not exist` | Container restarted without volume | `pnpm db:reset ; pnpm db:up` |
