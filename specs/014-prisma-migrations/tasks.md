# Tasks: Prisma Migrations and Database Schema Verification

**Input**: Design documents from `/specs/014-prisma-migrations/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not requested — schema verification is done via `prisma migrate status` and build validation.

**Docker note**: Tasks marked ⚠️ Docker require Docker Desktop running and `pnpm db:up` executed first. All other tasks can run without Docker.

---

## Phase 1: Setup — Scripts and Environment Safety

**Purpose**: Add missing package scripts and confirm `.env` is gitignored. No Docker required. All three tasks are parallelizable.

- [x] T001 [P] Add `"prisma:migrate:status": "prisma migrate status"` script to `apps/api/package.json` after the `prisma:migrate` entry
- [x] T002 [P] Add `"db:status": "pnpm --filter @leaseKo/api prisma:migrate:status"` script to root `package.json` after the `db:migrate` entry
- [x] T003 [P] Verify `apps/api/.env` is listed in `.gitignore` (root or `apps/api/.gitignore`); add it if missing

**Checkpoint**: All three scripts present and `.env` confirmed gitignored. Run `Get-Content apps/api/package.json | Select-String "prisma:migrate:status"` and `Get-Content package.json | Select-String "db:status"` to confirm.

---

## Phase 2: Foundational — Developer Documentation

**Purpose**: Create `docs/development.md` as the canonical local data layer reference. Covers US3 (reset workflow) and US4 (command reference) entirely. No Docker required. Depends on T001–T002 being complete so documented commands match the actual scripts.

- [x] T004 Create `docs/development.md` with all required sections: prerequisites, `pnpm db:up`, migration workflow (`pnpm db:migrate` with `init_base_identity_tenant_models` naming), status check (`pnpm db:status`), Prisma Client generation (`pnpm db:generate`), Prisma Studio (`pnpm db:studio`), Adminer (`http://localhost:8080`), local reset instructions with explicit ⚠️ data-loss warning, migration naming convention table (good/bad examples), anti-patterns (never run `migrate dev` on production), full command reference table

**Checkpoint**: `docs/development.md` exists and contains all sections listed above. Read the file to confirm all sections are present.

---

## Phase 3: User Story 1 — Developer Runs Initial Migration (Priority: P1) 🎯 MVP

**Goal**: Execute the first Prisma migration so `users`, `tenants`, and `tenant_memberships` tables exist in the local PostgreSQL database with correct constraints and indexes.

**Independent Test**: With Docker running — `pnpm --filter @leaseKo/api exec prisma migrate dev --name init_base_identity_tenant_models` exits 0. `pnpm db:status` reports "Database schema is up to date!". `docker exec leaseKo-postgres psql -U postgres -d leaseKo -c "\dt"` lists all three tables.

**⚠️ All tasks in this phase require Docker Desktop running and `pnpm db:up` executed first.**

- [ ] T005 [US1] Run initial migration: `pnpm --filter @leaseKo/api exec prisma migrate dev --name init_base_identity_tenant_models` — confirms exit 0 and verifies `apps/api/prisma/migrations/<timestamp>_init_base_identity_tenant_models/migration.sql` was created
- [ ] T006 [US1] Verify migration status: `pnpm db:status` exits 0 and reports "Database schema is up to date!" in `apps/api/prisma/migrations/`
- [ ] T007 [US1] Verify PostgreSQL tables via `docker exec leaseKo-postgres psql -U postgres -d leaseKo -c "\dt"` — confirm `users`, `tenants`, `tenant_memberships`, `_prisma_migrations` are present; confirm `_prisma_migrations` has 1 row; confirm no business model tables exist (`properties`, `units`, `leases`, `payments`)

**Checkpoint**: US1 complete — migration file exists on disk, database is in sync, all three tables confirmed in PostgreSQL. `pnpm db:status` is green.

---

## Phase 4: User Story 2 — Migration Status Command and API Builds (Priority: P1)

**Goal**: Confirm `prisma:migrate:status` script works correctly, Prisma Client is regenerated, and the NestJS API builds and typechecks cleanly after migration.

**Independent Test**: `pnpm db:status` exits 0. `pnpm --filter @leaseKo/api build` exits 0. `pnpm --filter @leaseKo/api typecheck` exits 0.

**No Docker required for T008–T010** (Prisma Client generation and build are offline operations).

- [x] T008 [P] [US2] Regenerate Prisma Client: `pnpm db:generate` — confirm exits 0 and outputs "Generated Prisma Client (v5.22.0)" in `apps/api/node_modules/.prisma/client/`
- [x] T009 [P] [US2] Build NestJS API: `pnpm --filter @leaseKo/api build` — confirm exits 0 with no TypeScript errors in `apps/api/dist/`
- [x] T010 [P] [US2] Typecheck NestJS API: `pnpm --filter @leaseKo/api typecheck` — confirm exits 0 with no type errors

**Checkpoint**: US2 complete — `db:status` is green, Prisma Client regenerated, build and typecheck both pass. API is ready to start against the migrated database.

---

## Phase 5: Polish and Completion

**Purpose**: Mark BACKLOG complete and confirm all validation checklist items pass.

- [x] T011 Update `BACKLOG.md` — mark all three US 4.3 tasks complete: `- [x] Setup Prisma migrations`, `- [x] Run initial migration`, `- [x] Verify DB schema`

**Final validation checklist** (confirm all before marking feature done):

- [ ] `apps/api/package.json` contains `prisma:migrate:status` script (T001)
- [ ] Root `package.json` contains `db:status` script (T002)
- [ ] `apps/api/.env` is gitignored (T003)
- [ ] `docs/development.md` exists with all required sections (T004)
- [ ] `apps/api/prisma/migrations/<ts>_init_base_identity_tenant_models/migration.sql` exists (T005)
- [ ] `pnpm db:status` reports "Database schema is up to date!" (T006)
- [ ] `users`, `tenants`, `tenant_memberships`, `_prisma_migrations` tables confirmed in PostgreSQL (T007)
- [ ] `pnpm db:generate` exits 0 (T008)
- [ ] `pnpm --filter @leaseKo/api build` exits 0 (T009)
- [ ] `pnpm --filter @leaseKo/api typecheck` exits 0 (T010)
- [ ] BACKLOG.md US 4.3 tasks marked complete (T011)
- [ ] No business model tables exist in the database (T007)
- [ ] Migration SQL file contains no secrets or hardcoded credentials (T005)
- [ ] Migration name is exactly `init_base_identity_tenant_models` (T005)

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001–T002 must be complete so docs reference correct scripts)
- **Phase 3 (US1)**: Depends on Phase 1; requires Docker — run after T001–T002 are complete
- **Phase 4 (US2)**: T008–T010 depend on Phase 3 being complete (migration applied before regenerating client)
- **Phase 5 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 (scripts) — requires Docker ⚠️
- **US2 (P1)**: Depends on US1 complete (migration must exist before verifying build)
- **US3 (P2)**: Covered by T004 (docs) — no additional implementation tasks
- **US4 (P2)**: Covered by T004 (docs) — no additional implementation tasks

### Parallel Execution Opportunities

**Phase 1** — all three tasks run in parallel:
```
T001 ─┐
T002 ─┤─→ Phase 2 → Phase 3 → Phase 4
T003 ─┘
```

**Phase 4** — all three tasks run in parallel after Phase 3:
```
T008 ─┐
T009 ─┤─→ T011
T010 ─┘
```

**Phase 2 + Phase 3 can overlap** — T004 (docs) doesn't need Docker; T005 (migration) does. Start T004 while waiting for Docker to come up, then run T005–T007.

---

## Implementation Strategy

**MVP scope**: Complete Phase 1 + Phase 2 + Phase 3 (T001–T007). This delivers a working migration with all tables in PostgreSQL — the minimum needed to unblock Feature 015 (repository abstraction).

**Full scope**: T001–T011 (all phases).

**Without Docker**: T001–T004 and T008–T010 can all be completed without Docker running. Only T005–T007 are gated on Docker. Start these first and defer T005–T007 until Docker is available.

---

## Summary

| Phase | Tasks | Docker? | Parallelizable |
|-------|-------|---------|----------------|
| Phase 1: Setup | T001, T002, T003 | No | All 3 in parallel |
| Phase 2: Foundational | T004 | No | No (single task) |
| Phase 3: US1 Migration | T005, T006, T007 | **Yes ⚠️** | Sequential |
| Phase 4: US2 Build | T008, T009, T010 | No | All 3 in parallel |
| Phase 5: Polish | T011 | No | No (single task) |

**Total tasks**: 11
**US1 tasks**: 3 (T005–T007)
**US2 tasks**: 3 (T008–T010)
**US3 tasks**: 0 (covered by T004)
**US4 tasks**: 0 (covered by T004)
**Suggested MVP**: T001–T007 (US1 complete)
