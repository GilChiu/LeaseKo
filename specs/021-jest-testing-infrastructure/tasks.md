# Tasks: Jest Testing Infrastructure Setup

**Input**: Design documents from `specs/021-jest-testing-infrastructure/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in descriptions

---

## Phase 1: Setup

- [x] T001 Install `supertest` and `@types/supertest` devDependencies in `apps/api/` via `pnpm --filter @leaseKo/api add -D supertest @types/supertest`

> All other testing dependencies (jest, ts-jest, @types/jest, @nestjs/testing) are already installed and verified. Only `supertest` is missing.

**Checkpoint**: `supertest` and `@types/supertest` present in `apps/api/package.json` devDependencies.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core config changes that US1, US2, and US3 all depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Update `collectCoverageFrom` in `apps/api/jest.config.ts` to add exclusion patterns for `main.ts`, `*.module.ts`, `*.dto.ts`, `*.interface.ts`, `*.d.ts`, and `prisma/**`
- [x] T003 [P] Add `apps/api/.env.test` to root `.gitignore` below the existing `!.env.example` line

**Checkpoint**: Coverage exclusions in place; `.env.test` gitignored.

---

## Phase 3: User Story 1 — Developer runs unit tests reliably (Priority: P1) 🎯 MVP

**Goal**: `pnpm --filter @leaseKo/api test` passes all 20 tests; `test:cov` generates a clean coverage report excluding noise files.

**Independent Test**: Run `pnpm --filter @leaseKo/api test` → exit 0, 20 tests pass. Run `pnpm --filter @leaseKo/api test:cov` → `apps/api/coverage/` generated; `main.ts` and `*.module.ts` files absent from report.

### Implementation for User Story 1

- [x] T004 [US1] Create `docs/testing.md` documenting: run commands, file naming conventions (colocated `*.spec.ts` unit / `test/` e2e), mocking strategy (jest.fn for Prisma/Clerk/ConfigService), unit vs e2e distinction, env setup instructions, and architecture boundary rules

**Checkpoint**: Unit test suite unchanged and passing; coverage excludes noise files (verified by T002); testing conventions documented.

---

## Phase 4: User Story 2 — Safe test environment configuration (Priority: P2)

**Goal**: `apps/api/.env.test.example` committed with safe placeholder values; `.env.test` gitignored; `coverage/` already gitignored by root `.gitignore`.

**Independent Test**: Confirm `apps/api/.env.test.example` exists. Run `git status` — `apps/api/.env.test` does not appear as tracked.

### Implementation for User Story 2

- [x] T005 [P] [US2] Create `apps/api/.env.test.example` with safe placeholder values for all required env vars (`NODE_ENV=test`, `PORT=3002`, `DATABASE_URL` pointing to `leaseKo_test`, `CLERK_SECRET_KEY=test_sk_placeholder`, etc.)

**Checkpoint**: `.env.test.example` present and committed; `.env.test` gitignored (verified by T003).

---

## Phase 5: User Story 3 — Minimal e2e test structure (Priority: P3)

**Goal**: `pnpm --filter @leaseKo/api test:e2e` executes `test/health.e2e-spec.ts` using a minimal NestJS test module — no Docker, no Prisma, no Clerk JWT required.

**Independent Test**: Run `pnpm --filter @leaseKo/api test:e2e` → `test/health.e2e-spec.ts` passes; `GET /api/v1/health` returns `200 OK` with all 5 fields.

### Implementation for User Story 3

- [x] T006 [US3] Create `apps/api/jest-e2e.config.ts` with `rootDir: "."`, `testRegex: "\\.e2e-spec\\.ts$"`, `transform: ts-jest`, and `moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" }`
- [x] T007 [US3] Create `apps/api/test/health.e2e-spec.ts` using a minimal test module (`ConfigModule.forRoot({ load: [appConfig], ignoreEnvFile: true })` + `HealthModule`) and `supertest` to assert `GET /api/v1/health` → `200 OK` with `status`, `service`, `timestamp`, `uptime`, `environment` fields
- [x] T008 [US3] Add `"test:e2e": "jest --config jest-e2e.config.ts"` script to `apps/api/package.json`

**Checkpoint**: `pnpm --filter @leaseKo/api test:e2e` runs and health e2e spec passes without Docker.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T009 [P] Run `pnpm --filter @leaseKo/api build` and confirm exit 0
- [x] T010 [P] Run `pnpm --filter @leaseKo/api test` and confirm all unit tests still pass (20+)
- [x] T011 Run `pnpm --filter @leaseKo/api test:e2e` and confirm health e2e spec passes
- [x] T012 Update `BACKLOG.md` to mark US 7.1 tasks `[x]` (`Setup Jest`, `Configure test environment`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (supertest must be installed before e2e spec can reference it)
- **US1 (Phase 3)**: Depends on Phase 2 (coverage exclusions from T002)
- **US2 (Phase 4)**: Depends on Phase 2 (gitignore entry from T003) — T005 can run in parallel with US1
- **US3 (Phase 5)**: Depends on Phase 1 (supertest) and Phase 2; T006, T007, T008 run sequentially (T008 references the config file created by T006)
- **Polish (Phase 6)**: Depends on Phases 3, 4, 5 completion

### User Story Dependencies

- **US1 (P1)**: T004 depends only on T002 (coverage exclusions)
- **US2 (P2)**: T005 depends only on T003 (gitignore) — can run in parallel with US1
- **US3 (P3)**: T006 → T007 → T008 (sequential within the story); all depend on T001 (supertest)

### Parallel Opportunities

```bash
# After T001+T002+T003 complete, run in parallel:
# T004 (docs/testing.md) ← US1
# T005 (.env.test.example) ← US2

# After T004+T005 complete, run sequentially:
# T006 → T007 → T008 ← US3
```

---

## Implementation Strategy

**MVP scope**: US1 + US2 (T001–T005) — delivers reliable unit test runner with coverage and safe env config. Zero Docker required.

**Full delivery**: US3 (T006–T008) adds e2e scaffolding — minimal overhead, proves the e2e pattern for future tests.

**Execution order**:
1. T001 — install supertest
2. T002 + T003 in parallel — coverage exclusions + gitignore
3. T004 + T005 in parallel — docs + .env.test.example
4. T006 → T007 → T008 — e2e config + spec + script
5. T009 + T010 in parallel — build + unit test validation
6. T011 — e2e validation
7. T012 — BACKLOG update

**Total tasks**: 12
**Tasks per user story**: US1 = 1 (T004), US2 = 1 (T005), US3 = 3 (T006–T008)
**Parallel opportunities**: T002+T003, T004+T005, T009+T010
