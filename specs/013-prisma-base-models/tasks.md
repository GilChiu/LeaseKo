# Tasks: Prisma Base Models — User, Tenant, TenantMembership

**Input**: Design documents from `/specs/013-prisma-base-models/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story — each story is independently verifiable.
**Tests**: Not requested — validation by `prisma validate`, `prisma generate`, `typecheck`, `build`, and DB inspection.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Schema Update)

**Purpose**: Replace the `Placeholder` model with the three real base models — prerequisite for all user story verification

**⚠️ CRITICAL**: No user story validation can run until T001 is complete

- [x] T001 Replace entire contents of `apps/api/prisma/schema.prisma`

**Checkpoint**: `schema.prisma` contains `User`, `Tenant`, `TenantMembership`; `Placeholder` is gone

---

## Phase 2: Foundational (Format + Validate)

**Purpose**: Confirm schema is syntactically correct and consistently formatted before any commands run against it

**⚠️ CRITICAL**: T002 and T003 MUST pass before `prisma:generate` or `prisma:migrate` can succeed

- [x] T002 Run `pnpm --filter api prisma:format` — verify exit 0 and schema.prisma remains well-formed
- [x] T003 Run `pnpm --filter api prisma:validate` — verify exit 0 and output includes "schema is valid" (SC-002)

**Checkpoint**: Schema validated — ready for client generation and migration

---

## Phase 3: User Story 1 — Client Generation and API Build (Priority: P1) 🎯 MVP

**Goal**: Developer runs `prisma:generate`, `typecheck`, and `build` — all succeed. Prisma client exposes `prisma.user`, `prisma.tenant`, `prisma.tenantMembership`.

**Independent Test**: `pnpm --filter api prisma:generate` exits 0 and emits "Generated Prisma Client". `pnpm --filter api typecheck` exits 0. `pnpm --filter api build` exits 0.

### Implementation for User Story 1

- [x] T004 [US1] Run `pnpm --filter api prisma:generate` — verify exit 0 and "Generated Prisma Client (v5.22.0)" in output; confirm `prisma.user`, `prisma.tenant`, `prisma.tenantMembership` are available in the generated client (SC-001)
- [x] T005 [US1] Run `pnpm --filter api typecheck` — verify exit 0 with zero errors
- [x] T006 [US1] Run `pnpm --filter api build` — verify exit 0

**Checkpoint**: User Story 1 complete — all three models are in the generated client, API compiles and builds

---

## Phase 4: User Story 2 — Schema Validation and Format (Priority: P1)

**Goal**: `prisma:validate` and `prisma:format` both pass without errors.

**Independent Test**: `pnpm --filter api prisma:validate` exits 0. `pnpm --filter api prisma:format` exits 0.

> **Note**: US2 validation commands (T002, T003) are already run in Phase 2 (Foundational). This phase has no additional implementation tasks — US2 is satisfied by the Foundational phase completing successfully.

**Checkpoint**: User Story 2 complete — covered by T002 and T003 in Phase 2

---

## Phase 5: User Story 3 — Initial Database Migration (Priority: P1)

**Goal**: Docker PostgreSQL database has `users`, `tenants`, `tenant_memberships` tables after migration.

**Independent Test**: With Docker running — `pnpm --filter api prisma:migrate` (name: `init_base_identity_tenant_models`) exits 0. Tables `users`, `tenants`, `tenant_memberships` confirmed in DB.

### Implementation for User Story 3

- [ ] T007 [US3] Start Docker PostgreSQL via `pnpm db:up` — verify `leaseKo_postgres` container is running and healthy via `pnpm db:ps`
- [ ] T008 [US3] Run migration from `apps/api` directory: `pnpm prisma:migrate` — when prompted for migration name enter `init_base_identity_tenant_models` — verify exit 0 and migration file created under `apps/api/prisma/migrations/` (SC-004, FR-013)
- [ ] T009 [US3] Verify `users` table: `docker exec -it leaseKo_postgres psql -U postgres -d leaseKo -c "\d+ users"` — confirm columns `id`, `clerk_user_id` (unique), `email` (nullable), `first_name` (nullable), `last_name` (nullable), `created_at`, `updated_at`
- [ ] T010 [US3] Verify `tenant_memberships` table: confirm unique constraint on `(user_id, tenant_id)` and indexes on `tenant_id` and `user_id`
- [ ] T011 [US3] Start NestJS API (`pnpm --filter api dev`) — verify "PrismaService connected to PostgreSQL" in log and no `PrismaClientInitializationError`
- [ ] T012 [US3] Call `GET /api/v1/health` — verify `200 OK` confirming full app initialisation after migration

**Checkpoint**: User Story 3 complete — database tables created, API connects and responds

---

## Phase 6: User Story 4 — Tenant-Scoped Model Pattern Documentation (Priority: P2)

**Goal**: `docs/data-model.md` documents all three base models and the canonical tenant-scoped model pattern.

**Independent Test**: Read `docs/data-model.md` — find `User`, `Tenant`, `TenantMembership` descriptions, Clerk mapping explanation, `FutureTenantScopedModel` pattern with `tenantId`, `@@index([tenantId])`, and `tenantFilter()` usage.

### Implementation for User Story 4

- [x] T013 [US4] Create `docs/data-model.md`

**Checkpoint**: User Story 4 complete — pattern documented for future developers

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and BACKLOG update

- [x] T014 [P] Verify SC-006: confirm `Placeholder` model is absent from `apps/api/prisma/schema.prisma`
- [x] T015 [P] Verify SC-007 (from Feature 012): confirm zero occurrences of `PrismaService` or `PrismaClient` imports in `application/`, `presentation/`, or `domain/` layer directories
- [x] T016 Update `BACKLOG.md` US 4.2 tasks to `[x]`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — schema must exist before format/validate
- **Phase 3 (US1)**: Depends on Phase 2 — client generation requires valid schema
- **Phase 4 (US2)**: Satisfied by Phase 2 — no additional tasks
- **Phase 5 (US3)**: Depends on Phase 3 — migration requires generated client; Docker required
- **Phase 6 (US4)**: Independent of Phases 3 and 5 — documentation can be written after Phase 2
- **Phase 7 (Polish)**: Depends on all phases complete

### Critical Path

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012
                    ↘ T013 (parallel with T004+)
```

### Parallel Opportunities

- **T013** (docs) can be written in parallel with T004–T012 — different file, no dependency on migration result
- **T014 and T015** (Phase 7 verification) can run in parallel — both read-only checks

---

## Parallel Execution Examples

### Phase 6 (US4) — T013 in parallel with Phase 5 (US3)
T013 creates `docs/data-model.md`; T007–T012 run Docker/migration — no conflict:
```
Parallel: T013 (docs/data-model.md) || T007-T012 (migration + verification)
```

### Phase 7 (Polish) — T014 and T015 in parallel
Both are read-only verification commands:
```
Parallel: T014 (grep Placeholder) || T015 (grep PrismaService in forbidden layers)
```

---

## Implementation Strategy

### MVP Scope (US1 + US2 — minimum to unblock Feature 014)
Complete Phases 1, 2, and 3 (T001–T006). The schema has real models, the client is generated, and the API builds. Feature 014 (first business module) can start immediately after T006.

### Full Scope (all user stories)
Complete all phases. US3 (migration) creates the actual DB tables needed for runtime. US4 (docs) ensures future developers follow the tenant-scoped model pattern correctly.

### Suggested Order for Single Developer
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016

---

## Format Validation

All tasks follow the required checklist format:
- ✅ Every task starts with `- [ ]`
- ✅ Every task has a sequential ID (T001–T016)
- ✅ [P] marker on parallelisable tasks (T014, T015)
- ✅ [US] label on all user story phase tasks
- ✅ Every task includes exact file paths or commands
- ✅ Setup and Foundational phase tasks have no story label
- ✅ Polish phase tasks have no story label

**Total tasks**: 16
**Tasks per user story**: US1: 3 | US2: 0 (covered by Foundational) | US3: 6 | US4: 1 | Setup/Foundation/Polish: 6
**Parallel opportunities**: 2 groups (T013 ‖ T007–T012; T014 ‖ T015)
**Suggested MVP scope**: US1 (T001–T006) — unblocks Feature 014
