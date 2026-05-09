# Implementation Plan: Property Data Model & Prisma Migration

**Branch**: `feature/property-data-model` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-property-data-model/spec.md`

## Summary

Add the `Property` Prisma model as the first tenant-owned business entity in the LeaseKo schema. The model must include a mandatory `tenantId` foreign key referencing `Tenant.id`, both `@@index([tenantId])` and `@@index([tenantId, deletedAt])` indexes, a `deletedAt` nullable timestamp for future soft-delete support, and a `propertyType` plain string field. A Prisma migration named `add_property_model` must be created and applied to the local PostgreSQL database. No repository, use case, controller, DTO, or API endpoint is introduced in this task.

## Technical Context

**Language/Version**: TypeScript 5.0, Node.js 18+  
**Primary Dependencies**: Prisma 5.22, @prisma/client 5.22, NestJS 10, pnpm 8+  
**Storage**: PostgreSQL — local instance on port 5432; Docker container `leaseKo-postgres` on port 5433 (DB_PORT env override needed when Docker is used alongside local PG)  
**Testing**: Jest 29 + ts-jest 29 — 37 existing tests must remain passing  
**Target Platform**: Local development (PostgreSQL), Linux server (Docker, production)  
**Project Type**: web-service (NestJS modular monolith in pnpm + Turborepo monorepo)  
**Performance Goals**: Tenant-scoped queries must use indexed `tenant_id` lookups; no throughput target for MVP schema task  
**Constraints**: Schema + migration only — no application code; strict multi-tenant isolation at DB level  
**Scale/Scope**: Multi-tenant SaaS MVP; Property is the first tenant-scoped business model

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

**Architecture** — _N/A for this task (schema + migration only; no module code introduced)_

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation` — N/A; no module code
- [x] Domain layer imports no NestJS or Prisma packages — N/A; no domain code
- [x] Controllers are thin — N/A; no controllers
- [x] Cross-module interaction uses explicit interfaces or events only — N/A

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column with index — `properties` table will have `tenant_id` + `@@index([tenantId])` + `@@index([tenantId, deletedAt])`
- [x] All repository queries filter by `tenant_id` — N/A; no repository code in this task
- [x] Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic — N/A; no endpoint in this task

**Authentication & Authorization** — _N/A for this task_

- [x] Clerk JWT is verified against JWKS — N/A; no new endpoint
- [x] Role/permission checks are enforced in backend guards, not in frontend — N/A

**Data Layer**

- [x] All DB access goes through repository interfaces — N/A; no application code in this task
- [x] Prisma schema changes include `tenant_id` index on affected models — YES: `@@index([tenantId])` and `@@index([tenantId, deletedAt])` added to `Property`

**API & Async** — _N/A for this task (no endpoint, no queue job)_

- [x] All new endpoints are documented with Swagger/OpenAPI decorators — N/A
- [x] All DTOs use `class-validator` decorators for strict validation — N/A
- [x] Heavy/non-critical operations are offloaded to BullMQ — N/A
- [x] BullMQ jobs are idempotent — N/A

**Testing** — _N/A for this task (no domain/application/API code introduced)_

- [x] Unit tests cover domain and application layer logic — N/A
- [x] Integration tests cover repository and module interactions — N/A
- [x] E2E tests cover new API endpoints with auth + tenant context — N/A

**Security**

- [x] No secrets or credentials in source code — `.env` not committed; migration uses local credentials only
- [x] Rate limiting applied to new public-facing endpoints — N/A
- [x] All inputs validated and sanitised before processing — N/A

**Gate Result**: ✅ ALL PASS — no violations.


## Project Structure

### Documentation (this feature)

```text
specs/023-property-data-model/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (speckit.tasks — not created here)
```

_No `contracts/` directory — this feature exposes no external interface (schema only)._

### Source Code (repository root)

```text
apps/api/
├── prisma/
│   ├── schema.prisma                              # MODIFIED — Property model added, Tenant updated
│   └── migrations/
│       ├── 20260506100031_init_base_identity_tenant_models/  # Existing — not touched
│       └── [timestamp]_add_property_model/        # NEW — created by migration command
└── (all other files unchanged)
```

**Structure Decision**: NestJS monorepo backend only. No frontend, no shared package changes. Two files affected: `schema.prisma` (modified) and the new migration folder (created by Prisma).

## Complexity Tracking

_No violations — not applicable._

---

## Phase 0: Research

**Status**: Complete — see [research.md](research.md)

**Resolved decisions**:

| Decision | Resolution |
|---|---|
| `propertyType` field type | `String` (plain) — enum deferred until value list is stable |
| Soft-delete readiness | `deletedAt DateTime?` — included; delete logic deferred to US 8.5 |
| Tenant FK cascade | `onDelete: Cascade` — consistent with TenantMembership pattern |
| PostgreSQL port | Port 5432 (local PG) or 5433 (Docker with `DB_PORT=5433`) |
| Migration name | `add_property_model` |
| Naming convention | `camelCase` fields → `@map("snake_case")` → `@@map("table_name")` |
| Tenant reverse relation | `properties Property[]` on `Tenant` |

---

## Phase 1: Design & Contracts

**Status**: Complete — see [data-model.md](data-model.md) and [quickstart.md](quickstart.md)

_No `contracts/` directory — this feature exposes no external interface._

### Property Model Design

```prisma
model Property {
  id           String    @id @default(uuid())
  tenantId     String    @map("tenant_id")
  name         String
  addressLine1 String    @map("address_line_1")
  addressLine2 String?   @map("address_line_2")
  city         String
  state        String?
  postalCode   String?   @map("postal_code")
  country      String
  propertyType String    @map("property_type")
  description  String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@map("properties")
}
```

### Tenant Model Update

Add reverse relation only — no field changes:

```prisma
model Tenant {
  // ... existing fields ...
  memberships TenantMembership[]
  properties  Property[]    // ← add this line

  @@map("tenants")
}
```

### Files to Modify / Create

| File | Action | Notes |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add `Property` model; add `properties Property[]` to `Tenant` |
| `apps/api/prisma/migrations/[ts]_add_property_model/migration.sql` | Create (auto) | Created by `prisma migrate dev` |
| `SPRINT-2-BACKLOG.md` | Modify | Mark 4 tasks `[x]` after verification |
| `docs/data-model.md` | Modify | Add Property section |

---

## Phase 2: Implementation Steps

### Step 1 — Ensure branch is active

```bash
git checkout feature/property-data-model
```

### Step 2 — Start PostgreSQL

```bash
# Docker (preferred):
$env:DB_PORT="5433"
docker compose -f infra/docker-compose.yml up -d postgres

# Or override DATABASE_URL for local PG:
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/leaseKo"
```

### Step 3 — Edit `apps/api/prisma/schema.prisma`

1. Add `properties Property[]` to the `Tenant` model (after `memberships TenantMembership[]`)
2. Replace the `FUTURE TENANT-SCOPED MODEL PATTERN` comment block with the full `Property` model

### Step 4 — Validate the schema

```bash
cd apps/api
pnpm prisma:validate
```

### Step 5 — Run the migration

```bash
pnpm prisma:migrate -- --name add_property_model
```

### Step 6 — Confirm migration status

```bash
pnpm prisma:migrate:status
# Expected: "2 migrations found ... Database schema is up to date!"
```

### Step 7 — Regenerate Prisma Client

```bash
pnpm prisma:generate
```

### Step 8 — Run the full test suite

```bash
cd C:\Users\Zared\Projects\LeaseKo
pnpm --filter @leaseKo/api test
# Expected: 37 passed, 37 total
```

### Step 9 — Build

```bash
pnpm --filter @leaseKo/api build
```

### Step 10 — Update SPRINT-2-BACKLOG.md

Mark complete:
- `[x] Create Property Prisma model`
- `[x] Add tenantId relation to Property`
- `[x] Add indexes for tenantId`
- `[x] Create Prisma migration for Property model`

### Step 11 — Commit

```bash
git add apps/api/prisma/schema.prisma
git add apps/api/prisma/migrations/
git add SPRINT-2-BACKLOG.md
git status  # Confirm no .env files staged
git commit -m "feat(api): add property data model"
```

---

## Validation Checklist

- [ ] Branch `feature/property-data-model` is active
- [ ] `Property` model exists in `schema.prisma`
- [ ] `Property` includes `tenantId` (non-nullable, FK → `Tenant.id`)
- [ ] `Property` has `tenant Tenant @relation(... onDelete: Cascade)`
- [ ] `Tenant` model includes `properties Property[]`
- [ ] `Property` has `@@index([tenantId])`
- [ ] `Property` has `@@index([tenantId, deletedAt])`
- [ ] `Property` has `deletedAt DateTime?`
- [ ] Migration `[timestamp]_add_property_model` exists under `apps/api/prisma/migrations/`
- [ ] `prisma validate` passes
- [ ] `prisma migrate status` reports up to date
- [ ] `prisma generate` completes successfully
- [ ] No `Unit`, `Lease`, or `Payment` models added
- [ ] No `PropertyController`, `PropertyRepository`, or `CreateProperty` use case added
- [ ] Full test suite passes (37/37)
- [ ] `apps/api` build passes
- [ ] `SPRINT-2-BACKLOG.md` updated — only the 4 schema/migration tasks marked `[x]`
- [ ] `.env` files not committed

---

## Next Tasks (not in this feature)

| Task | Sprint 2 Story |
|---|---|
| Define `Property` domain entity | US 8.1 |
| Define `IPropertyRepository` interface | US 8.1 |
| Implement `PrismaPropertyRepository` | US 8.1 |
| Create `CreateProperty` use case + DTO | US 8.1 |
| Create `POST /api/v1/properties` endpoint | US 8.1 |
| Add soft-delete logic + `DELETE /properties/:id` | US 8.5 |
| Add `Unit` model (FK → `Property`) | US 9.1 |

