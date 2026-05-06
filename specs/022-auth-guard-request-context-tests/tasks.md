# Tasks: Auth Guard and Request Context Tests

**Input**: Design documents from `specs/022-auth-guard-request-context-tests/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Confirm all source files exist and the test runner is working before adding new spec files

- [X] T001 Verify existing guard and decorator source files compile — run `pnpm --filter @leaseKo/api build` from repo root and confirm exit 0
- [X] T002 Confirm baseline test suite passes — run `pnpm --filter @leaseKo/api test` and confirm all existing tests pass before adding new ones

**Checkpoint**: Build passes and existing tests pass. Safe to add new spec files.

---

## Phase 2: Foundational (Guard Test Infrastructure)

**Purpose**: Create the shared `createMockContext()` factory and mock wiring pattern that US1 and US2 both depend on. These are defined at the top of `clerk-jwt.guard.spec.ts` — no separate file needed.

- [X] T003 Create `apps/api/src/common/guards/clerk-jwt.guard.spec.ts` with file-level imports: `ClerkJwtGuard` from `./clerk-jwt.guard`; `Reflector` from `@nestjs/core`; `VerifyClerkTokenUseCase` from `../../modules/auth/application/verify-clerk-token.use-case`; `UnauthorizedException`, `ForbiddenException`, `ExecutionContext` from `@nestjs/common`; `IRequestContext` from `../types/request-context.type`
- [X] T004 Add `createMockContext(options: { authorization?: string; body?: Record<string, unknown>; query?: Record<string, unknown> }): ExecutionContext` factory function at the top of `clerk-jwt.guard.spec.ts` — returns a plain object matching the `ExecutionContext` interface shape
- [X] T005 Add `beforeEach` mock wiring in `clerk-jwt.guard.spec.ts`: `mockReflector = { getAllAndOverride: jest.fn() }`, `mockVerifyClerkToken = { execute: jest.fn() }`, and `guard = new ClerkJwtGuard(...)` with both mocks injected

**Checkpoint**: Guard spec file scaffolded with factory and mocks. Ready to add test cases.

---

## Phase 3: User Story 1 — ClerkJwtGuard Unit Tests (Priority: P1) 🎯 MVP

**Goal**: Every guard execution path is covered — public bypass, all 401 failure modes, valid-token success, `@UserOnly()` bypass, `@RequiresTenant()` with and without tenantId.

**Independent Test**: Run `pnpm --filter @leaseKo/api test -- --testPathPattern="clerk-jwt.guard.spec"` — 9 test cases pass, `VerifyClerkTokenUseCase` is never called for the public-route case.

### Implementation for User Story 1

- [X] T006 [US1] Add test in `clerk-jwt.guard.spec.ts`: `@Public() route — returns true without calling verifier`
- [X] T007 [US1] Add test: `missing Authorization header — throws UnauthorizedException`
- [X] T008 [US1] Add test: `malformed header (no Bearer prefix) — throws UnauthorizedException`
- [X] T009 [US1] Add test: `malformed header (Basic prefix) — throws UnauthorizedException`
- [X] T010 [US1] Add test: `empty token after Bearer — throws UnauthorizedException`
- [X] T011 [US1] Add test: `invalid token — verifier throws, guard propagates UnauthorizedException`
- [X] T012 [US1] Add test: `valid token — returns true and attaches request.user`
- [X] T013 [US1] Add test: `@UserOnly() with null tenantId — returns true`
- [X] T014 [US1] Add test: `@RequiresTenant() with null tenantId — throws ForbiddenException`
- [X] T015 [US1] Add test: `@RequiresTenant() with valid tenantId — returns true`

**Checkpoint**: 9 US1 test cases pass. `pnpm --filter @leaseKo/api test` exits 0.

---

## Phase 4: User Story 2 — Tenant Injection Prevention Tests (Priority: P2)

**Goal**: Confirm `request.user.tenantId` is always the JWT-verified value regardless of what the client sends in body, query params, or headers.

**Independent Test**: Add 3 test cases to the existing `clerk-jwt.guard.spec.ts` describe block. Run `pnpm --filter @leaseKo/api test -- --testPathPattern="clerk-jwt.guard.spec"` — all 12 cases pass.

### Implementation for User Story 2

- [X] T016 [US2] Add test in `clerk-jwt.guard.spec.ts`: `ignores tenantId in request body`
- [X] T017 [US2] Add test: `ignores tenantId in query params`
- [X] T018 [P] [US2] Add test: `ignores tenantId in x-tenant-id header`

**Checkpoint**: 12 total guard test cases pass. All three injection vectors confirmed safe.

---

## Phase 5: User Story 3 — Decorator Unit Tests (Priority: P3)

**Goal**: `@CurrentUser()` and `@CurrentTenant()` correctly read `request.user` from the `ExecutionContext`. Tests are colocated with the decorator source files and need no NestJS module.

**Independent Test**: Run `pnpm --filter @leaseKo/api test -- --testPathPattern="decorator.spec"` — 4 test cases across 2 files pass.

### Implementation for User Story 3

- [X] T019 [P] [US3] Create `apps/api/src/common/decorators/current-user.decorator.spec.ts`
- [X] T020 [P] [US3] Create `apps/api/src/common/decorators/current-tenant.decorator.spec.ts`
- [X] T021 [US3] Add test in `current-user.decorator.spec.ts`: `returns full IRequestContext from request.user`
- [X] T022 [US3] Add test in `current-user.decorator.spec.ts`: `returns context when tenantId is null`
- [X] T023 [US3] Add test in `current-tenant.decorator.spec.ts`: `returns tenantId when present`
- [X] T024 [US3] Add test in `current-tenant.decorator.spec.ts`: `returns null when tenantId is null`

**Checkpoint**: 4 decorator test cases pass. Total new test count: 16 across 3 spec files.

---

## Phase 6: Polish and Cross-Cutting

**Purpose**: Validate the full suite, typecheck, lint, and update the backlog

- [X] T025 Run full test suite — `pnpm --filter @leaseKo/api test` — confirm all tests pass (existing + 16 new), zero failures, no `MODULE_NOT_FOUND` errors
- [X] T026 [P] Run typecheck — `pnpm --filter @leaseKo/api typecheck` — confirm exit 0 with no new errors
- [X] T027 [P] Run lint — `pnpm --filter @leaseKo/api lint` — confirm exit 0
- [X] T028 Run build — `pnpm --filter @leaseKo/api build` — confirm exit 0, no regression
- [X] T029 Update `BACKLOG.md` — mark US 7.2 tasks complete

---

## Dependencies

```
T001 → T002 → T003 → T004 → T005
                              │
              ┌───────────────┤
              │               │
         [US1 Phase 3]   [US2 Phase 4]
         T006–T015         T016–T018
              │               │
              └───────┬───────┘
                      │
                [US3 Phase 5]   ← independent (different files, can start after T002)
                T019–T024
                      │
              [Phase 6 Polish]
               T025–T029
```

US3 (decorator tests) is independent of US1/US2 — decorator spec files are different from the guard spec file. T019–T024 can begin as soon as T002 is complete.

## Parallel Execution

**After T005 (guard scaffold complete)**:
- US1 tasks T006–T015 execute sequentially within `clerk-jwt.guard.spec.ts`

**After T002 (baseline tests pass)**:
- US3 tasks T019–T024 can run in parallel with US1 and US2

**After T025–T028 all pass**:
- T029 (backlog update) is the final step

## Implementation Strategy

**MVP scope (US1 alone)**: Tasks T001–T015 deliver a fully passing guard spec with all 9 acceptance scenarios from spec.md US1. This is the highest-value increment.

**Full feature (US1 + US2 + US3)**: All 27 tasks, 3 spec files, 16 test cases, all validation commands passing.
