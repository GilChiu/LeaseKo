# Research: Prisma Migrations and Database Schema Verification

**Feature**: 014-prisma-migrations  
**Date**: 2026-05-03  
**Status**: Complete — no NEEDS CLARIFICATION items remain

---

## 1. Prisma 5.x Migration Workflow

### Decision
Use `prisma migrate dev` for local development migrations. This is the correct command for the development lifecycle in Prisma 5.x.

### Rationale
`prisma migrate dev` combines two operations: it generates the migration SQL from the schema diff and immediately applies it to the target database. In production or CI, `prisma migrate deploy` is used instead (applies existing migrations without generating new ones). This distinction is critical — `migrate dev` must never be run against production.

### Prisma 5.22.0 specifics confirmed
- `prisma migrate dev` is stable in 5.x
- `prisma migrate status` reports pending migrations or "Database schema is up to date"
- Migration files are tracked in `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql`
- Prisma maintains a `_prisma_migrations` table in PostgreSQL to track applied migrations
- Re-running `prisma migrate dev` when schema has no changes is a no-op (safe)
- `prisma migrate reset` drops all data and re-applies migrations from scratch — DESTRUCTIVE

### Alternatives considered
- `prisma db push` — pushes schema directly without creating migration files. Rejected: does not produce trackable migration history. Only appropriate for early prototyping.
- Manual SQL migrations — Rejected: incompatible with Prisma's migration tracking and `_prisma_migrations` table.

---

## 2. Migration Command Taxonomy (Prisma 5.x)

| Command | Purpose | Safe for prod? |
|---------|---------|----------------|
| `prisma migrate dev` | Generate + apply migration (dev only) | ❌ Never |
| `prisma migrate deploy` | Apply existing migrations (CI/prod) | ✅ Yes |
| `prisma migrate status` | Report sync state | ✅ Yes (read-only) |
| `prisma migrate reset` | Drop all data + re-apply | ❌ Never (local only) |
| `prisma generate` | Regenerate Prisma Client from schema | ✅ No DB required |
| `prisma validate` | Validate schema syntax | ✅ No DB required |
| `prisma format` | Auto-format schema file | ✅ No DB required |
| `prisma studio` | Visual DB browser | ✅ Read-mostly |

### Decision
`prisma:migrate:status` script running `prisma migrate status` is the correct status command. It does not exist yet in `apps/api/package.json` — must be added.

---

## 3. Docker PostgreSQL Service Configuration

### Confirmed from `infra/docker-compose.yml`
- Image: `postgres:16-alpine`
- Container: `leaseKo-postgres`
- User: `postgres` (default, `$DB_USER`)
- Password: `postgres` (default, `$DB_PASSWORD`)
- Database: `leaseKo` (default, `$DB_NAME`)
- Port: `5432` (default, `$DB_PORT`)
- Has healthcheck: `pg_isready -U postgres`
- Adminer available at port 8080

### DATABASE_URL confirmed
`postgresql://postgres:postgres@localhost:5432/leaseKo` — matches `.env.example`.

### Decision
No docker-compose changes needed. The existing service is fully configured for the migration.

---

## 4. Package Scripts Gap Analysis

### `apps/api/package.json` — current scripts
```json
"prisma:generate": "prisma generate",
"prisma:validate": "prisma validate",
"prisma:format": "prisma format",
"prisma:studio": "prisma studio",
"prisma:migrate": "prisma migrate dev"
```

### Missing scripts
- `"prisma:migrate:status": "prisma migrate status"` — **must be added**

### Root `package.json` — current db scripts
```json
"db:generate": "pnpm --filter @leaseKo/api prisma:generate",
"db:migrate": "pnpm --filter @leaseKo/api prisma:migrate",
"db:studio": "pnpm --filter @leaseKo/api prisma:studio",
"db:validate": "pnpm --filter @leaseKo/api prisma:validate",
"db:format": "pnpm --filter @leaseKo/api prisma:format"
```

### Missing root scripts
- `"db:status": "pnpm --filter @leaseKo/api prisma:migrate:status"` — **must be added**

---

## 5. Migration SQL — Expected Content

The initial migration for the three existing models will generate SQL containing:

```sql
CREATE TABLE "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clerk_user_id" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "tenants" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clerk_org_id" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "tenant_memberships" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "tenant_memberships_userId_tenantId_key" UNIQUE ("user_id", "tenant_id")
);

CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships"("tenant_id");
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");
```

This is confirmed by the Prisma schema in `apps/api/prisma/schema.prisma`.

---

## 6. Documentation Gap Analysis

### Existing docs
- `docs/data-model.md` — model descriptions, Clerk mapping, global exception register ✅
- `docs/tenant-isolation.md` — tenant-safe query architecture ✅

### Missing docs
- `docs/development.md` — migration workflow, naming conventions, reset instructions, Prisma Studio guide — **must be created**

### Decision
Create `docs/development.md` as the canonical developer reference for local data layer operations.

---

## 7. Environment Safety — `.env` gitignore status

```gitignore
# .gitignore check needed
```

### Decision
Verify `.gitignore` includes `apps/api/.env`. If not present, add it. `.env.example` is always committed — `.env` is never committed.

---

## 8. Adminer — Alternative to Prisma Studio

The docker-compose already includes Adminer at port 8080. This provides a browser-based database inspector as an alternative to Prisma Studio.

### Decision
Document both Prisma Studio (`pnpm db:studio`) and Adminer (`http://localhost:8080`) in `docs/development.md`. Adminer requires no extra setup since it's already in docker-compose.
