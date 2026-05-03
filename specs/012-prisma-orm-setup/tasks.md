# Tasks: Prisma ORM Installation and Database Connection

**Input**: Design documents from `/specs/012-prisma-orm-setup/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story — each story is independently verifiable.
**Tests**: Not requested — validation is by command exit codes per spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Package Installation)

**Purpose**: Install Prisma packages — prerequisite for all subsequent phases

**⚠️ CRITICAL**: No other work can begin until packages are installed

- [x] T001 Install `@prisma/client` as runtime dependency in `apps/api/package.json` via `pnpm --filter @leaseKo/api add @prisma/client`
- [x] T002 Install `prisma` as devDependency in `apps/api/package.json` via `pnpm --filter @leaseKo/api add -D prisma`

**Checkpoint**: `apps/api/package.json` contains `@prisma/client` in `dependencies` and `prisma` in `devDependencies`

---

## Phase 2: Foundational (Schema + PrismaService)

**Purpose**: Core Prisma infrastructure that MUST be complete before user story verification can begin

**⚠️ CRITICAL**: No user story validation can run until this phase is complete

- [x] T003 Create `apps/api/prisma/schema.prisma` with `prisma-client-js` generator and `postgresql` datasource using `env("DATABASE_URL")` — no models (see plan.md Phase 2 for full file content)
- [x] T004 Replace placeholder in `apps/api/src/database/prisma/prisma.service.ts` with real `PrismaClient`-extending implementation: `class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy` with `$connect()` on init and `$disconnect()` on destroy (see plan.md Phase 3 for full file content)

**Checkpoint**: Schema exists, `PrismaService` extends `PrismaClient` — ready to generate client

---

## Phase 3: User Story 1 — Prisma Client Generation and API Build (Priority: P1) 🎯 MVP

**Goal**: Developer runs `prisma:generate` and `build` — both succeed. `PrismaService` no longer logs "placeholder".

**Independent Test**: `pnpm --filter api prisma:generate` exits 0 and emits "Generated Prisma Client". `pnpm --filter api build` exits 0. `pnpm --filter api typecheck` exits 0.

### Implementation for User Story 1

- [x] T005 [US1] Run `pnpm --filter api prisma:generate` from repo root — verify exit 0 and "Generated Prisma Client" in output (SC-001)
- [x] T006 [US1] Run `pnpm --filter api typecheck` — verify exit 0 with zero errors (SC-002)
- [x] T007 [US1] Run `pnpm --filter api build` — verify exit 0 (SC-003)

**Checkpoint**: User Story 1 complete — `PrismaService` compiles, client is generated, API builds

---

## Phase 4: User Story 2 — Schema Validation and Database Connection (Priority: P1)

**Goal**: `prisma validate` passes. NestJS API connects to PostgreSQL on startup without error.

**Independent Test**: With Docker running — `pnpm --filter api prisma:validate` exits 0. Start API → no `PrismaClientInitializationError` in log.

### Implementation for User Story 2

- [x] T008 [US2] Ensure Docker PostgreSQL is running via `pnpm db:up` — verify container is healthy
- [x] T009 [US2] Run `pnpm --filter api prisma:validate` — verify exit 0 (SC-004)
- [ ] T010 [US2] Start NestJS API (`pnpm --filter api dev`) — verify "PrismaService connected to PostgreSQL" in log and no `PrismaClientInitializationError` (SC-005)
- [ ] T011 [US2] Call `GET /api/v1/health` — verify `200 OK` response confirming full app initialization

**Checkpoint**: User Story 2 complete — Prisma validates schema and connects to live PostgreSQL

---

## Phase 5: User Story 3 — Developer Scripts and Workflow (Priority: P2)

**Goal**: All 5 Prisma scripts available in `apps/api/package.json`. Root `package.json` has `db:generate` and `db:migrate`.

**Independent Test**: Read `apps/api/package.json` — find all 5 scripts. Read root `package.json` — find `db:generate` and `db:migrate`. Run `pnpm --filter api prisma:validate` → exits 0.

### Implementation for User Story 3

- [x] T012 [P] [US3] Add 5 Prisma script aliases to `apps/api/package.json`
- [x] T013 [P] [US3] Add 5 delegating scripts to root `package.json` scripts section
- [x] T014 [US3] Verify scripts work end-to-end: run `pnpm db:validate` from repo root — verify exit 0

**Checkpoint**: User Story 3 complete — all Prisma lifecycle scripts are available and documented

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, architecture compliance check, and BACKLOG update

- [x] T015 [P] Verify SC-007: grep confirms zero occurrences of `PrismaService` or `PrismaClient` imports in `apps/api/src/**/{application,presentation,domain}/**` directories
- [x] T016 [P] Verify FR-002 compliance: confirm `@prisma/client` is NOT added to `apps/web/package.json` (Prisma is backend-only)
- [x] T017 Update `BACKLOG.md` US 4.1 tasks to `[x]`: "Install Prisma", "Setup Prisma client", "Configure database connection"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (packages must be installed to create schema and compile `PrismaClient` extension)
- **Phase 3 (US1)**: Depends on Phase 2 — generate client and build
- **Phase 4 (US2)**: Depends on Phase 3 — requires generated client; Docker needed
- **Phase 5 (US3)**: Depends on Phase 2 — scripts can be added once schema exists; **T012 and T013 are parallel** (different files)
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5 — final verification

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 complete — no dependency on US2 or US3
- **US2 (P1)**: Depends on US1 complete — requires generated client for `$connect()` to work
- **US3 (P2)**: Depends on Phase 2 only — can be done in parallel with US1 verification

### Critical Path

```
T001 → T002 → T003 + T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011
                          ↘ T012 + T013 (parallel) → T014
```

---

## Parallel Execution Examples

### Phase 2 (Foundational) — T003 and T004 can run in parallel
T003 creates a new file; T004 modifies an existing file — no conflict:
```
Parallel: T003 (create schema.prisma) || T004 (replace prisma.service.ts)
```

### Phase 5 (US3) — T012 and T013 run in parallel
T012 edits `apps/api/package.json`; T013 edits root `package.json` — different files:
```
Parallel: T012 (apps/api/package.json scripts) || T013 (root package.json scripts)
```

### Phase 6 (Polish) — T015 and T016 run in parallel
Both are read-only verification tasks:
```
Parallel: T015 (grep architecture check) || T016 (verify web package.json)
```

---

## Implementation Strategy

### MVP Scope (US1 only — minimum to unblock Feature 013)
Complete Phases 1, 2, and 3 (T001–T007). This proves Prisma is installed, client generates, and the API builds. Feature 013 (base schema models) can begin immediately after T007.

### Full Scope (all user stories)
Complete all phases in order. US2 (live connection) and US3 (scripts) add operational confidence but do not block Feature 013.

### Suggested Order for Single Developer
T001 → T002 → T003 → T004 → T012 → T013 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T014 → T015 → T016 → T017

_Note_: T012 and T013 (scripts) are placed early so `pnpm --filter api prisma:generate` can be invoked via the alias `prisma:generate` in subsequent tasks.

---

## Format Validation

All tasks follow the required checklist format:
- ✅ Every task starts with `- [ ]`
- ✅ Every task has a sequential ID (T001–T017)
- ✅ [P] marker present on parallelizable tasks (T012, T013, T015, T016)
- ✅ [US] label present on all user story phase tasks
- ✅ Every task includes exact file paths or commands
- ✅ Setup and Foundational phase tasks have no story label
- ✅ Polish phase tasks have no story label

**Total tasks**: 17
**Tasks per user story**: US1: 3 | US2: 4 | US3: 3 | Setup/Foundation/Polish: 7
**Parallel opportunities**: 3 groups (Phase 2, Phase 5, Phase 6)
**Suggested MVP scope**: US1 (T001–T007) — unblocks Feature 013
