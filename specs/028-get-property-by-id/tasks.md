# Tasks: Get Property by ID

**Input**: Design documents from `specs/028-get-property-by-id/`
**Prerequisites**: plan.md âœ“, spec.md âœ“, research.md âœ“, data-model.md âœ“, contracts/get-property-by-id.md âœ“

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = View Property Details, US2 = Tenant Isolation / Cross-Tenant 404
- File paths are relative to `apps/api/src/modules/properties/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**No foundational infrastructure changes required.** `findById(id, tenantId)` already exists in the repository interface and implementation. No new types, no new DTOs, no migration.

**Checkpoint**: All existing 51 tests must continue to pass throughout implementation.

---

## Phase 2: User Story 1 + 2 â€” Property Detail & Tenant Isolation (Priority: P1) ðŸŽ¯ MVP

**Goal**: An authenticated landlord can retrieve the full details of any property in their workspace by ID. An ID belonging to a different tenant returns an identical 404 to a non-existent ID â€” no information leakage.

**Independent Test**: Run `pnpm --filter @leaseKo/api test` and confirm all `GetPropertyByIdUseCase` tests pass. Call `GET /properties/:id` via Swagger with a valid JWT and confirm 200 for own properties and 404 for other-tenant or non-existent IDs.

### Implementation for US1 + US2

- [x] T001 [US1] [US2] Create `GetPropertyByIdUseCase` in `application/use-cases/get-property-by-id.use-case.ts` â€” inject `PROPERTY_REPOSITORY`; `execute({ id, tenantId })` calls `this.properties.findById(id, tenantId)` and throws `NotFoundException('Property not found.')` when result is `null`; returns `Property` on success
- [x] T002 [P] [US1] [US2] Add `GET /properties/:id` handler to `presentation/properties.controller.ts` â€” inject `GetPropertyByIdUseCase` in constructor (alongside existing use cases); handler: `@Get(':id')`, `@RequiresTenant()`, `@Param('id') id: string`, `@CurrentTenant() tenantId: string`; call `getPropertyById.execute({ id, tenantId })` and return `PropertyResponseDto.fromDomain(property)`; place handler after `@Get()` to avoid route conflict; add full Swagger: `@ApiParam`, `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`
- [x] T003 [P] [US1] [US2] Register `GetPropertyByIdUseCase` in `providers` array of `properties.module.ts` and import it at the top of the file

### Tests for US1 + US2

- [x] T004 [P] [US1] [US2] Create `application/use-cases/get-property-by-id.use-case.spec.ts` with 6 test cases:
  1. Returns the full `Property` entity when `findById` resolves a record (TC1 â€” US1 happy path)
  2. Throws `NotFoundException` when `findById` returns `null` â€” not-found case (TC2 â€” US1 / FR-003)
  3. Throws `NotFoundException` when `findById` returns `null` â€” cross-tenant case, explicitly documented as same code path (TC3 â€” US2 / FR-002 + FR-004)
  4. Calls `findById` with the exact `id` and `tenantId` from input â€” no mutation (TC4 â€” constitution: tenantId from context only)
  5. Does not call any other repository method (TC5 â€” single responsibility)
  6. Propagates unexpected repository errors without swallowing (TC6 â€” error handling)

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` â€” all 51 existing tests plus 6 new `GetPropertyByIdUseCase` tests must pass (total 57).

---

## Final Phase: Polish & Validation

- [x] T005 Run `pnpm lint` â€” fix any ESLint errors in new/modified files
- [x] T006 [P] Run `pnpm typecheck` â€” fix any TypeScript errors
- [x] T007 Run `pnpm build` â€” confirm API and web build successfully
- [x] T008 Run `pnpm --filter @leaseKo/api test` â€” confirm all 57 tests pass
- [x] T009 Update `SPRINT-2-BACKLOG.md` â€” mark User Story 8.3 tasks as `[x]` only after T005â€“T008 all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (US1+US2)**: No blocking prerequisites â€” T001 can start immediately
- **Final Phase**: Depends on all Phase 2 tasks complete

### Within Phase 2

- **T001**: Start immediately â€” no dependencies
- **T002, T003, T004**: All depend on T001 (use case must exist before controller injects it, module registers it, or tests import it)
- **T002, T003, T004**: Can run in parallel once T001 is complete â€” they modify different files

### Parallel Opportunities

- T002 (controller), T003 (module), T004 (tests) â€” all different files, run simultaneously after T001
- T005 (lint) and T006 (typecheck) â€” run simultaneously

---

## Parallel Execution Example: Phase 2

```
# Step 1 (sequential â€” must complete first):
T001: Create get-property-by-id.use-case.ts

# Step 2 (parallel â€” all different files):
T002: Add GET :id to properties.controller.ts
T003: Register use case in properties.module.ts
T004: Write get-property-by-id.use-case.spec.ts
```

---

## Implementation Strategy

### MVP (all of Phase 2 â€” both user stories share the same 4 tasks)

Both US1 and US2 are fully delivered by T001â€“T004. There is no meaningful MVP subset â€” the security invariant (US2) is implemented by the same `null â†’ NotFoundException` path as the happy path (US1).

### Incremental Delivery

1. T001 â†’ T002 + T003 + T004 (parallel) â†’ validate â†’ T005â€“T009

---

## Notes

- T002 and T003 modify different files and are safe to implement simultaneously after T001
- TC3 in T004 uses the same mock setup as TC2 (`mockResolvedValueOnce(null)`) â€” this is intentional; the test documents that both conditions produce identical behaviour by design
- The `@Get(':id')` decorator on the new handler must appear **after** `@Get()` in the controller class body to prevent NestJS from matching the literal string `id` as a route segment before the list endpoint
- Do not update `SPRINT-2-BACKLOG.md` until T005â€“T008 all pass (project constitution rule)
