# Implementation Plan: Prisma ORM Installation and Database Connection

**Branch**: `012-prisma-orm-setup` | **Date**: 2026-05-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-prisma-orm-setup/spec.md`

## Summary

Install Prisma ORM into the NestJS backend (`apps/api`), create `apps/api/prisma/schema.prisma` with a PostgreSQL datasource and client generator, replace the existing `PrismaService` placeholder with the real `PrismaClient`-extending implementation, add Prisma lifecycle scripts to both `apps/api/package.json` and the root `package.json`, and verify the integration by running `prisma generate`, `prisma validate`, `typecheck`, and `build`. No business models are added — this feature establishes the Prisma foundation only.

## Technical Context

**Language/Version**: TypeScript 5.9.3 / Node.js 20
**Primary Dependencies**: Prisma 5.x (`prisma` devDep + `@prisma/client` dep) — NEW; NestJS 10 (existing)
**Storage**: PostgreSQL (Docker, existing) — `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo`
**Testing**: Jest (existing); no new test files in this feature — validation is by command exit codes
**Target Platform**: Linux server (Docker containerized NestJS)
**Project Type**: Web service — NestJS modular monolith backend
**Performance Goals**: N/A — infrastructure setup only
**Constraints**: No business models. No Prisma in controllers/use cases/domain. `PrismaService` stays in `database/prisma/` layer.
**Scale/Scope**: Foundation layer — all future Prisma repositories depend on this setup

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture
  — No new NestJS module. `DatabaseModule` already exists and is `@Global()`. `PrismaService` lives in `infrastructure/database/` — the correct layer.
- [x] Domain layer imports no NestJS or Prisma packages
  — `PrismaService` has no domain consumers. Enforced by existing architecture.
- [x] Controllers are thin — all logic delegated to use cases
  — No new controllers. `PrismaService` is forbidden in controllers (documented in JSDoc + constitution).
- [x] Cross-module interaction uses explicit interfaces or events only
  — Future modules will inject `PrismaService` in infrastructure repositories only. Use cases depend on repository interfaces from Feature 011.

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column with index
  — N/A: No DB tables in this feature. `schema.prisma` is minimal (datasource + generator). Business models are Feature 013.
- [x] All repository queries filter by `tenant_id`
  — N/A: No repository implementations. `tenantFilter` utility (Feature 011) is already in place for future use.
- [x] Request context injected via guard before any business logic
  — Already implemented (Features 009-010). Not changed by this feature.

**Authentication & Authorization**

- [x] Clerk JWT verified against JWKS
  — Already implemented. Not changed.
- [x] Role/permission checks enforced in backend guards
  — Not in scope.

**Data Layer**

- [x] All DB access goes through repository interfaces
  — `PrismaService` is available only to infrastructure repositories. No direct Prisma usage in controllers/use cases.
- [x] Prisma schema changes include `tenant_id` index on affected models
  — N/A: No models added. Tenant-id requirements are documented in schema.prisma comments for Feature 013.

**API & Async**

- [x] All new endpoints documented with Swagger
  — N/A: No new endpoints.
- [x] DTOs use class-validator
  — N/A: No new DTOs.
- [x] Heavy operations offloaded to BullMQ
  — N/A.
- [x] BullMQ jobs are idempotent
  — N/A.

**Testing**

- [x] Unit tests cover domain and application logic
  — N/A: No domain/application logic in this feature. Validation is by command exit codes.
- [x] Integration tests cover repository interactions
  — N/A: No repositories in this feature.
- [x] E2E tests cover API endpoints
  — N/A: No new endpoints.

**Security**

- [x] No secrets in source code
  — `schema.prisma` uses `env("DATABASE_URL")`. `.env` is gitignored.
- [x] Rate limiting on public endpoints
  — N/A.
- [x] All inputs validated
  — `DATABASE_URL` is already validated by Joi schema in `validation.schema.ts`.

## Post-Design Constitution Check

All gates pass. No violations or complexity justifications required.

## Project Structure

### Documentation (this feature)

```text
specs/012-prisma-orm-setup/
+-- spec.md         ?
+-- plan.md         ? (this file)
+-- research.md     ?
+-- data-model.md   ?
+-- quickstart.md   ?
+-- checklists/
¦   +-- requirements.md  ?
+-- tasks.md        ? /speckit.tasks output
```

### Source Code (this feature)

```text
apps/api/
+-- prisma/
¦   +-- schema.prisma          ? NEW: datasource + generator (no models)
+-- src/
¦   +-- database/
¦       +-- prisma/
¦           +-- prisma.service.ts  ? MODIFIED: replace placeholder with PrismaClient extension
¦           +-- prisma.module.ts   ? UNCHANGED: already correct (@Global, exports PrismaService)
+-- package.json               ? MODIFIED: add prisma:* scripts

package.json (root)            ? MODIFIED: add db:generate, db:migrate, db:studio, db:validate, db:format
```

## Implementation Phases

---

### Phase 1 — Install Prisma Packages

**Goal**: Install `prisma` (devDep) and `@prisma/client` (dep) in `apps/api` only.

**Why first**: All subsequent steps require the Prisma CLI binary (`prisma`) and the generated client (`@prisma/client`).

#### Commands

```bash
# From repo root — targets @leaseKo/api workspace
pnpm --filter @leaseKo/api add @prisma/client
pnpm --filter @leaseKo/api add -D prisma
```

**Verification**: `apps/api/package.json` contains `"@prisma/client"` in `dependencies` and `"prisma"` in `devDependencies`.

**Constraint**: Do NOT run these commands in `apps/web` or at the monorepo root.

---

### Phase 2 — Create Prisma Schema

**Goal**: Create `apps/api/prisma/schema.prisma` with datasource and generator. No models.

#### File: `apps/api/prisma/schema.prisma`

```prisma
// Prisma schema — LeaseKo backend
// https://www.prisma.io/docs/concepts/components/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ------------------------------------------------------------------------------
// MODELS
//
// Feature 013 (Base Schema Models) will add:
//   - User             (global — no tenantId)
//   - Tenant           (global — no tenantId)
//   - TenantMembership (junction — tenantId as FK, not isolation field)
//
// Feature 014+ (Business Modules) will add tenant-scoped models:
//   - Property, Unit, Lease, Payment, MaintenanceRequest, etc.
//   All must include: tenantId String @map("tenant_id") + @@index([tenantId])
//   See: docs/tenant-isolation.md
// ------------------------------------------------------------------------------
```

**Key decisions**:
- `generator` block before `datasource` block — Prisma convention, enforced by `prisma format`.
- No models — schema is valid and generates a minimal client without them.
- Comments link to tenant-isolation docs and call out Feature 013 scope.

---

### Phase 3 — Replace PrismaService Placeholder

**Goal**: Replace the placeholder in `apps/api/src/database/prisma/prisma.service.ts` with the real `PrismaClient`-extending implementation.

#### File: `apps/api/src/database/prisma/prisma.service.ts`

```typescript
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — manages the Prisma client lifecycle inside NestJS.
 *
 * Architecture rule (NON-NEGOTIABLE per constitution):
 * This service MUST only be imported by repository implementations inside
 * the `infrastructure/` layer of each module.
 *
 * NEVER import PrismaService in:
 *   - controllers       (presentation layer)
 *   - use cases         (application layer)
 *   - domain services   (domain layer)
 *
 * @see docs/tenant-isolation.md — tenant-safe query patterns
 * @see apps/api/src/common/utils/tenant-filter.util.ts — use in every repository query
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('PrismaService connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('PrismaService disconnected from PostgreSQL');
  }
}
```

**Key decisions**:
- `extends PrismaClient` — `PrismaService` IS the client; modules get full query API via DI.
- `$connect()` on init — eager connection; surfaces `DATABASE_URL` errors at startup (not on first query).
- `$disconnect()` on destroy — prevents open connections during graceful shutdown.
- No tenant middleware — filtering is handled at repository level via `tenantFilter`.

**Note**: `DatabaseModule` (`prisma.module.ts`) is already correct. No changes needed to that file.

---

### Phase 4 — Add Prisma Scripts to `apps/api/package.json`

**Goal**: Add 5 Prisma script aliases to `apps/api/package.json`.

#### Scripts to add:

```json
{
  "prisma:generate": "prisma generate",
  "prisma:validate": "prisma validate",
  "prisma:format":   "prisma format",
  "prisma:studio":   "prisma studio",
  "prisma:migrate":  "prisma migrate dev"
}
```

**Note**: Prisma scripts run from the `apps/api` directory — the schema at `prisma/schema.prisma` is found automatically by the Prisma CLI when the working directory is `apps/api`.

---

### Phase 5 — Add Root `db:*` Scripts to Root `package.json`

**Goal**: Add Prisma delegation scripts alongside the existing `db:up/down/logs/ps/reset` Docker scripts.

#### Scripts to add to root `package.json`:

```json
{
  "db:generate": "pnpm --filter @leaseKo/api prisma:generate",
  "db:migrate":  "pnpm --filter @leaseKo/api prisma:migrate",
  "db:studio":   "pnpm --filter @leaseKo/api prisma:studio",
  "db:validate": "pnpm --filter @leaseKo/api prisma:validate",
  "db:format":   "pnpm --filter @leaseKo/api prisma:format"
}
```

---

### Phase 6 — Generate Prisma Client and Validate

**Goal**: Confirm the installation works end-to-end before running the full build.

#### Commands (run in order):

```bash
# From repo root
pnpm --filter api prisma:generate
# Expected: "Generated Prisma Client (v5.x.x)"

pnpm --filter api prisma:validate
# Expected: "The schema at apps/api/prisma/schema.prisma is valid"
# Note: requires Docker PostgreSQL to be running for datasource connectivity check
```

**SC-001 verified** by generate exit code. **SC-004 verified** by validate exit code.

---

### Phase 7 — Typecheck and Build Verification

**Goal**: Confirm the real `PrismaService` compiles and the full API builds without errors.

#### Commands:

```bash
pnpm --filter api typecheck
# Expected: exit 0, zero errors (SC-002)

pnpm --filter api build
# Expected: exit 0 (SC-003)
```

**If typecheck fails** after replacing `PrismaService`: The most likely cause is a stale `dist/` or missing generated client. Fix: run `prisma:generate` first, then retry.

---

### Phase 8 — BACKLOG Update

**Goal**: Mark US 4.1 tasks as complete in `BACKLOG.md`.

```
- [x] Install Prisma
- [x] Setup Prisma client
- [x] Configure database connection
```

---

## Package Installation Commands

```bash
# Install from repo root (targets apps/api package)
pnpm --filter @leaseKo/api add @prisma/client
pnpm --filter @leaseKo/api add -D prisma
```

**Result in `apps/api/package.json`**:
```json
{
  "dependencies": {
    "@prisma/client": "^5.x.x"
  },
  "devDependencies": {
    "prisma": "^5.x.x"
  }
}
```

---

## Environment Variable Table

| Variable | Location | Required | Value (dev) | Validated by |
|----------|----------|----------|-------------|-------------|
| `DATABASE_URL` | `apps/api/.env` | Yes | `postgresql://postgres:postgres@localhost:5432/leaseKo` | `validation.schema.ts` (Joi) |

**Status**: `DATABASE_URL` is already in `apps/api/.env.example` and already validated by Joi. No changes needed.

---

## Prisma Command Reference

| Command | Script | Purpose |
|---------|--------|---------|
| `prisma generate` | `prisma:generate` | Generate/regenerate Prisma client from schema |
| `prisma validate` | `prisma:validate` | Validate schema syntax + datasource connectivity |
| `prisma format` | `prisma:format` | Auto-format schema.prisma |
| `prisma studio` | `prisma:studio` | Open Prisma Studio browser GUI |
| `prisma migrate dev` | `prisma:migrate` | Run pending migrations (Feature 013+) |

---

## Clean Architecture Usage Rules

| Layer | `PrismaService` allowed? | How to access data |
|-------|--------------------------|-------------------|
| Domain (`domain/`) | ? Never | No data access — domain has no external deps |
| Application (`application/`) | ? Never | Inject repository interface (`IPropertyRepository` etc.) |
| Infrastructure (`infrastructure/`) | ? Yes | Inject `PrismaService` via constructor DI |
| Presentation (`presentation/`) | ? Never | Inject use case via constructor DI |

**Future repository location**:
```
apps/api/src/modules/<module>/infrastructure/<module>.prisma.repository.ts
```

---

## Database Verification Steps

### With Docker

```bash
# 1. Start Docker infrastructure
pnpm db:up

# 2. Verify container is running
pnpm db:ps
# Expected: property_postgres running, port 5432

# 3. Validate Prisma schema + connection
pnpm db:validate
# Expected: exit 0

# 4. Generate client
pnpm db:generate
# Expected: "Generated Prisma Client"

# 5. Build and start API
pnpm --filter api build
pnpm --filter api dev
# Expected: "PrismaService connected to PostgreSQL" in log
```

### Without Docker (schema-only validation)

```bash
# prisma validate checks schema syntax without live connection
pnpm --filter api prisma:validate
# Note: may warn about unreachable datasource — that's OK when Docker is down
```

---

## Testing and Validation Checklist

| Check | SC | Method |
|-------|----|--------|
| `prisma` in `apps/api/package.json` devDependencies | FR-001 | Read file |
| `@prisma/client` in `apps/api/package.json` dependencies | FR-002 | Read file |
| `apps/api/prisma/schema.prisma` exists | FR-003 | File exists |
| schema datasource uses `postgresql` | FR-003 | Read schema |
| schema datasource uses `env("DATABASE_URL")` | FR-003 | Read schema |
| `prisma-client-js` generator present | FR-003 | Read schema |
| `prisma:generate` ? exit 0 | SC-001 | Run command |
| `typecheck` ? exit 0 | SC-002 | Run command |
| `build` ? exit 0 | SC-003 | Run command |
| `prisma:validate` ? exit 0 (Docker running) | SC-004 | Run command |
| 5 prisma scripts in `apps/api/package.json` | FR-007 | Read file |
| 5 db:* scripts in root `package.json` | FR-008 | Read file |
| No `PrismaService` in `application/` or `presentation/` | SC-007 | grep |
| No business models in schema | FR-012 | Read schema |
| `@prisma/client` not in `apps/web/package.json` | FR-002 | Read file |

---

## Notes for Next Tasks

### Feature 013: Base Schema Models (US 4.2)
- Add `User`, `Tenant`, `TenantMembership` to `schema.prisma` — global models, no `tenantId` field
- Run `pnpm --filter api prisma:migrate` to generate and apply the first migration
- Migration file lands in `apps/api/prisma/migrations/`

### Feature 014: First Tenant-Scoped Model + Repository (US 4.4 + Property Module)
- Add `Property` model: `tenantId String @map("tenant_id")` + `@@index([tenantId])`
- Create `IPropertyRepository extends ITenantScopedRepository<Property>`
- Create `PrismaPropertyRepository implements IPropertyRepository` using `tenantFilter`

### Feature 015+: Business Module Pattern
- Each module follows the pattern from `quickstart.md` and `docs/tenant-isolation.md`
- All Prisma repos inject `PrismaService` via constructor — never via `import` in use cases
