---
description: "Task list for Property Data Model & Prisma Migration"
---

# Tasks: Property Data Model & Prisma Migration

**Input**: Design documents from `/specs/023-property-data-model/`
**Branch**: `feature/property-data-model`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not requested — no test tasks generated for this schema-only task.

---

## Phase 1: Setup

**Purpose**: Confirm the working environment before any changes are made.

- [x] T001 Confirm feature branch `feature/property-data-model` is active: `git checkout feature/property-data-model`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure PostgreSQL is reachable before the migration can run.

**⚠️ CRITICAL**: Migration will fail if the database is not accessible.

- [x] T002 Start PostgreSQL and verify DATABASE_URL is reachable — Docker: `$env:DB_PORT="5433"; docker compose -f infra/docker-compose.yml up -d postgres` or confirm local PG at port 5432 responds; update `apps/api/.env` DATABASE_URL to match the active port

**Checkpoint**: Database is reachable at the URL in `apps/api/.env` ✅

---

## Phase 3: User Story 1 - Data Layer Supports Property Persistence (Priority: P1) 🎯 MVP

**Goal**: The `Property` Prisma model exists in `schema.prisma`, a migration is applied to the database creating the `properties` table, and the Prisma client is regenerated.

**Independent Test**: Run `prisma migrate status` and confirm `Database schema is up to date!` with 2 migrations found. Inspect the `properties` table to confirm all columns exist.

- [x] T003 [US1] Add `properties Property[]` reverse relation to the Tenant model in `apps/api/prisma/schema.prisma` (after the `memberships TenantMembership[]` line, before `@@map("tenants")`)
- [x] T004 [US1] Add the full Property model to `apps/api/prisma/schema.prisma` — include fields: id, tenantId, name, addressLine1, addressLine2, city, state, postalCode, country, propertyType, description, createdAt, updatedAt, deletedAt; add tenant relation (`onDelete: Cascade`); add `@@index([tenantId])` and `@@index([tenantId, deletedAt])`; add `@@map("properties")`; replace the existing `FUTURE TENANT-SCOPED MODEL PATTERN` comment block with the real model
- [x] T005 [US1] Validate schema: `pnpm prisma:validate` from `apps/api/` — expect `The schema is valid 🚀`
- [x] T006 [US1] Create and apply migration: `pnpm prisma:migrate -- --name add_property_model` from `apps/api/` — expect `Applying migration [timestamp]_add_property_model` and `Your database is now in sync with your schema`
- [x] T007 [P] [US1] Verify migration status: `pnpm prisma:migrate:status` from `apps/api/` — expect `2 migrations found ... Database schema is up to date!`
- [x] T008 [P] [US1] Regenerate Prisma client: `pnpm prisma:generate` from `apps/api/`

**Checkpoint**: `properties` table exists in the database. `Property` type is available in the generated Prisma client. US1 is independently testable. ✅

---

## Phase 4: User Story 2 - Tenant Isolation Guaranteed at Schema Level (Priority: P2)

**Goal**: Confirm the generated migration SQL enforces tenant isolation via NOT NULL constraint, FK constraint to `tenants(id)`, and CASCADE delete — all at the database level.

**Independent Test**: Inspect the migration SQL file to confirm the FK, NOT NULL, and index are generated. Optionally attempt an insert with a null `tenant_id` and confirm constraint violation.

- [x] T009 [P] [US2] Inspect `apps/api/prisma/migrations/[timestamp]_add_property_model/migration.sql` and confirm: `tenant_id` column is NOT NULL, `FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE` is present, `CREATE INDEX` on `tenant_id` is present
- [x] T010 [P] [US2] Inspect migration SQL in `apps/api/prisma/migrations/[timestamp]_add_property_model/migration.sql` and confirm composite index `CREATE INDEX` on `(tenant_id, deleted_at)` is present

**Checkpoint**: Database-level tenant isolation is enforced. No property can exist without a valid tenant. ✅

---

## Phase 5: User Story 3 - Soft Delete Readiness (Priority: P3)

**Goal**: Confirm that the `deleted_at` column is nullable in the applied schema, allowing future soft-delete filtering without a new migration.

**Independent Test**: Confirm `deleted_at` column exists as nullable in the migration SQL and in `schema.prisma`.

- [x] T011 [P] [US3] Inspect `apps/api/prisma/migrations/[timestamp]_add_property_model/migration.sql` and confirm `deleted_at` column is defined without `NOT NULL` (nullable by default in PostgreSQL)
- [x] T012 [P] [US3] Confirm `deletedAt DateTime? @map("deleted_at")` exists in the `Property` model in `apps/api/prisma/schema.prisma` — the `?` suffix makes it nullable

**Checkpoint**: `deleted_at` column is nullable. Future soft-delete queries can use `WHERE deleted_at IS NULL` optimised by the composite index. ✅

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Verify no regressions, update the backlog, and commit.

- [x] T013 [P] Run full test suite: `pnpm --filter @leaseKo/api test` from repo root — expect `37 passed, 37 total`
- [x] T014 [P] Build API: `pnpm --filter @leaseKo/api build` from repo root — expect successful NestJS compilation
- [x] T015 Update `SPRINT-2-BACKLOG.md` — mark these 4 tasks `[x]` under US 8.1: `Create Property Prisma model`, `Add tenantId relation to Property`, `Add indexes for tenantId`, `Create Prisma migration for Property model`
- [x] T016 Commit: stage `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`, `SPRINT-2-BACKLOG.md`; confirm no `.env` files are staged; run `git commit -m "feat(api): add property data model"`

---

## Dependencies

```
T001 → T002 → T003 → T004 → T005 → T006
                                       ├→ T007 (parallel)
                                       └→ T008
                                              ├→ T009 (parallel)
                                              ├→ T010 (parallel)
                                              ├→ T011 (parallel)
                                              └→ T012 (parallel)
T009, T010, T011, T012 → T013 (parallel with T014)
T013, T014 → T015 → T016
```

## Parallel Execution Examples

- **T007 + T008**: After schema edits are done — run `prisma:validate` while mentally confirming changes, then migrate
- **T009 + T010**: After migration completes — run `prisma:migrate:status` and `prisma:generate` simultaneously (different commands, no conflict)
- **T011 + T012**: Both are read-only inspection of the same migration SQL file — can be done in one reading pass
- **T013 + T014**: Run `pnpm test` and `pnpm build` as separate terminal sessions simultaneously

## Implementation Strategy

**MVP scope**: All three user stories are satisfied by a single `schema.prisma` edit + one migration. Start with T003–T004 (the full schema change), then validate and migrate. Phases 4 and 5 are verification-only — no additional code is needed beyond what is written in Phase 3.

**Note on T003 + T004**: These two tasks modify the same file (`schema.prisma`) and should be done together in a single edit session. T003 adds the reverse relation to `Tenant`; T004 adds the full `Property` model (replacing the template comment block).
