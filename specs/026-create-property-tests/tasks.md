# Tasks: CreateProperty Use Case Unit Tests

**Input**: Design documents from `specs/026-create-property-tests/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅
**Branch**: `test/create-property-use-case`
**Implementation status**: ✅ COMPLETE — all tasks executed and committed

**Note**: Implementation was completed alongside specification. Tasks are recorded here for audit trail and traceability. All tasks are marked `[X]` as completed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story label (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Verify prerequisites and branch exist before authoring test code.

- [X] T001 Verify branch `test/create-property-use-case` is checked out — `git branch --show-current`
- [X] T002 [P] Verify `create-property.use-case.ts` exists at `apps/api/src/modules/properties/application/use-cases/create-property.use-case.ts`
- [X] T003 [P] Verify `PropertyRepository` interface exists at `apps/api/src/modules/properties/application/repositories/property.repository.ts`
- [X] T004 [P] Verify `CreatePropertyInput` type exists at `apps/api/src/modules/properties/application/types/property-repository.types.ts`
- [X] T005 [P] Verify `Property` domain entity exists at `apps/api/src/modules/properties/domain/entities/property.entity.ts`

**Checkpoint**: All 5 source files confirmed present; branch is `test/create-property-use-case`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No new directories or infrastructure needed — Jest is already configured in `apps/api/jest.config.ts`. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 — Developer Verifies CreatePropertyUseCase Creates via Repository (Priority: P1) 🎯 MVP

**Goal**: Create the spec file with the mock repository, instantiation, and core delegation tests. Running `npx jest create-property.use-case.spec.ts` passes with at least 3 tests.

**Independent Test**: `npx jest create-property.use-case.spec.ts --verbose` exits 0. Tests TC-1, TC-2, TC-3 pass.

### Implementation for User Story 1

- [X] T006 [US1] Create `apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts` with:
  - Imports for `CreatePropertyUseCase`, `PropertyRepository`, `CreatePropertyInput`, `Property`
  - `mockInput: CreatePropertyInput` with all fields including `tenantId: "tenant_test_123"`
  - `mockProperty: Property` with `id: "property_test_123"` and fixed `Date` objects
  - `mockRepo: PropertyRepository` with all 5 methods as `jest.fn()`
  - `beforeEach`: `jest.clearAllMocks()` + `useCase = new CreatePropertyUseCase(mockRepo)`
  - No `PrismaService`, `@prisma/client`, `TestingModule`, `PropertiesController`, or DTO imports
- [X] T007 [P] [US1] Add TC-1: `"returns the Property created by the repository"` — mock `create` resolves `mockProperty`, assert `result` deep-equals `mockProperty`
- [X] T008 [P] [US1] Add TC-2: `"calls repository.create exactly once"` — assert `toHaveBeenCalledTimes(1)`
- [X] T009 [P] [US1] Add TC-3: `"passes the full input to repository.create"` — assert `toHaveBeenCalledWith(mockInput)`

**Checkpoint**: `npx jest create-property.use-case.spec.ts` exits 0. 3+ tests pass.

---

## Phase 4: User Story 2 — Developer Confirms tenantId Is Forwarded, Not Generated (Priority: P2)

**Goal**: Add the tenantId-specific forwarding test and the no-side-effects test.

**Independent Test**: TC-4 passes — `repository.create` receives `tenantId: "tenant_test_123"`. TC-5 passes — no other repository method was called.

### Implementation for User Story 2

- [X] T010 [P] [US2] Add TC-4: `"forwards tenantId from input to repository.create"` — assert `toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant_test_123" }))`
- [X] T011 [P] [US2] Add TC-5: `"does not call any other repository method"` — assert `findManyByTenant`, `findById`, `update`, `softDelete` were not called

**Checkpoint**: 5 tests passing. `tenantId` forwarding proven. No unexpected repository side effects.

---

## Phase 5: User Story 3 — Developer Confirms Repository Errors Are Propagated (Priority: P3)

**Goal**: Add the error propagation tests.

**Independent Test**: TC-6 and TC-7 pass — use case rejects with the same error thrown by the repository.

### Implementation for User Story 3

- [X] T012 [P] [US3] Add TC-6: `"propagates repository errors without swallowing them"` — mock `create` rejects with `new Error("Repository failure")`; assert `rejects.toThrow("Repository failure")`
- [X] T013 [P] [US3] Add TC-7: `"propagates the exact error thrown by the repository"` — reuse `repositoryError` const; assert `rejects.toBe(repositoryError)` (identity check)

**Checkpoint**: 7/7 tests passing. Error propagation proven with both message and object-identity assertions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Architecture boundary check, full suite verification, backlog update, commit.

- [X] T014 Verify no `PrismaService`, `@prisma/client`, or `PropertiesController` import in `create-property.use-case.spec.ts` — grep confirms zero matches
- [X] T015 [P] Run focused test: `npx jest create-property.use-case.spec.ts --verbose` — all 7 tests pass (SC-001)
- [X] T016 [P] Run full suite: `npx jest` — all 44 tests pass (37 pre-existing + 7 new); no regressions (SC-002)
- [X] T017 [P] Run build: `npx nest build` — TypeScript compiles without errors (SC-003)
- [X] T018 Update `SPRINT-2-BACKLOG.md` — mark `[x] Add unit tests for CreateProperty use case` under US 8.1 (SC-005)
- [X] T019 Update `specs/026-create-property-tests/tasks.md` — mark all completed tasks `[X]`
- [X] T020 Commit: `git add apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts SPRINT-2-BACKLOG.md specs/026-create-property-tests/ .specify/feature.json` then `git commit -m "test(api): add create property use case tests"`

---

## Dependencies

```
T001 → T006
T002, T003, T004, T005 → T006
T006 → T007, T008, T009
T007, T008, T009 → T010, T011
T010, T011 → T012, T013
T012, T013 → T014
T014 → T015, T016, T017
T015, T016, T017 → T018
T018 → T019
T019 → T020
```

T002–T005 are parallel verification reads.
T007–T009 are parallel test additions (same file, no order dependency between test cases).
T010–T011 are parallel. T012–T013 are parallel.
T015–T017 are parallel verifications.

---

## Parallel Execution Examples

### Phase 1 — parallel verification:
```
T002 ║ T003 ║ T004 ║ T005
```

### Phase 3 — after T006:
```
T007 ║ T008 ║ T009
```

### Phase 4 — after Phase 3:
```
T010 ║ T011
```

### Phase 5 — after Phase 4:
```
T012 ║ T013
```

### Phase 6 — after T014:
```
T015 ║ T016 ║ T017  →  T018  →  T019  →  T020
```

---

## Test Case Matrix

| Task | Test Case ID | Description | Assertion Type |
|---|---|---|---|
| T007 | TC-1 | Use case returns repository result | `toEqual(mockProperty)` |
| T008 | TC-2 | `repository.create` called exactly once | `toHaveBeenCalledTimes(1)` |
| T009 | TC-3 | Full input passed to repository | `toHaveBeenCalledWith(mockInput)` |
| T010 | TC-4 | `tenantId` forwarded unchanged | `objectContaining({ tenantId: ... })` |
| T011 | TC-5 | No other repository method called | `not.toHaveBeenCalled()` × 4 |
| T012 | TC-6 | Error message propagated | `rejects.toThrow("Repository failure")` |
| T013 | TC-7 | Exact error object propagated | `rejects.toBe(repositoryError)` |

---

## Implementation Strategy

**MVP Scope** (US1 only — T006–T009):
- Spec file exists; 3 core delegation tests pass
- Proves basic use case behavior without needing error/tenant tests

**Full scope** (all 20 tasks):
- 7 test cases covering all 3 user stories
- Full suite: 44/44 passing
- Backlog updated and committed

---

## Task Count Summary

| Phase | Tasks | Story |
|---|---|---|
| Phase 1: Setup | T001–T005 | — |
| Phase 2: Foundational | (none) | — |
| Phase 3: US1 Implementation | T006–T009 | US1 |
| Phase 4: US2 Verification | T010–T011 | US2 |
| Phase 5: US3 Verification | T012–T013 | US3 |
| Phase 6: Polish | T014–T020 | — |
| **Total** | **20 tasks** | |

**Parallel opportunities**: 14 of 20 tasks can run in parallel at their respective phases.

**Suggested MVP**: T001–T009 (Phases 1 + 3). US2 and US3 phases follow in minutes.
