# Tasks: List Properties

**Input**: Design documents from `specs/027-list-properties/`
**Prerequisites**: plan.md âœ“, spec.md âœ“, research.md âœ“, data-model.md âœ“, contracts/get-properties.md âœ“

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1=View List, US2=Empty Workspace, US3=Tenant Isolation, US4=Pagination)
- File paths are relative to `apps/api/src/modules/properties/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Repository interface and type changes that ALL user stories depend on. Must be complete before any use case or controller work begins.

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `FindPagedByTenantOptions` and `PagedProperties` interfaces to `application/types/property-repository.types.ts`
- [x] T002 Add `findPagedByTenant(tenantId, options): Promise<PagedProperties>` method to `PropertyRepository` interface in `application/repositories/property.repository.ts`
- [x] T003 Implement `findPagedByTenant` in `infrastructure/repositories/prisma-property.repository.ts` using `this.prisma.$transaction([findMany, count])` with `tenantFilter()` and `deletedAt: null`
- [x] T004 Add `findPagedByTenant: jest.fn()` to the `PropertyRepository` mock object in `application/use-cases/create-property.use-case.spec.ts` (one-line change to satisfy updated interface â€” no test behaviour changes)

**Checkpoint**: `pnpm typecheck` must pass with no new errors before proceeding.

---

## Phase 2: User Story 1 + 3 â€” View List & Tenant Isolation (Priority: P1) ðŸŽ¯ MVP

**Goal**: An authenticated landlord can retrieve their paginated property list. Zero properties from other tenants ever appear. These two stories share identical implementation â€” tenant isolation is an inherent property of the code path, not a separate code branch.

**Independent Test**: Run `pnpm --filter @leaseKo/api test` and confirm `ListPropertiesUseCase` tests pass. Manually call `GET /properties` via Swagger with a valid tenant JWT and confirm only that tenant's properties appear.

### Implementation for US1 + US3

- [x] T005 Create `ListPropertiesUseCase` in `application/use-cases/list-properties.use-case.ts` â€” inject `PROPERTY_REPOSITORY`, `execute({ tenantId, page, limit })` calls `findPagedByTenant` and returns `PagedProperties`
- [x] T006 [P] Create `ListPropertiesQueryDto` in `presentation/dto/list-properties-query.dto.ts` â€” `page` (default 1, min 1) and `limit` (default 20, min 1, max 100) with `@IsOptional`, `@Type(() => Number)`, `@IsInt`, `@Min`, `@Max`
- [x] T007 [P] Create `PaginatedPropertiesResponseDto` in `presentation/dto/paginated-properties-response.dto.ts` â€” fields: `items: PropertyResponseDto[]`, `total`, `page`, `limit`, `hasMore` (`page * limit < total`); static `fromDomain(pagedResult, page, limit)` factory
- [x] T008 Add `GET /properties` handler to `presentation/properties.controller.ts` â€” inject `ListPropertiesUseCase` in constructor; handler uses `@RequiresTenant()`, `@CurrentTenant() tenantId`, `@Query() query: ListPropertiesQueryDto`; returns `PaginatedPropertiesResponseDto.fromDomain(result, query.page, query.limit)` (depends on T005, T006, T007)
- [x] T009 Register `ListPropertiesUseCase` in the `providers` array of `properties.module.ts`

### Tests for US1 + US3

- [x] T010 [US1] [US3] Create `application/use-cases/list-properties.use-case.spec.ts` with all 7 required test cases:
  1. Returns items and total from repository (happy path)
  2. Calls `findPagedByTenant` with the exact `tenantId` from input (constitution: tenantId from context only)
  3. Calls `findPagedByTenant` with exact page and limit values (input forwarded unchanged)
  4. Does not call any other repository method (single responsibility)
  5. Result items all share the given tenantId â€” properties from a different tenantId are never returned (FR-002 / US3)
  6. Propagates repository errors without swallowing (error handling)
  7. `hasMore` is `true` when `page * limit < total`, `false` otherwise (pagination metadata)

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` â€” all existing 44 tests plus new `ListPropertiesUseCase` tests must pass. Verify in Swagger: `GET /properties` returns `{ items, total, page, limit, hasMore }`.

---

## Phase 3: User Story 2 â€” Empty Workspace (Priority: P2)

**Goal**: A landlord with no properties receives `{ items: [], total: 0, hasMore: false }` â€” not an error.

**Independent Test**: T010 must include a test case for `total: 0` / empty items. Run `pnpm --filter @leaseKo/api test` and confirm the empty-state test passes.

- [x] T011 [US2] Verify `list-properties.use-case.spec.ts` (written in T010) includes test case: `returns items: [] and total: 0 when repository returns empty result` â€” mock `findPagedByTenant` to resolve `{ items: [], total: 0 }` and assert the use case returns it unchanged
- [x] T012 [US2] Verify `PaginatedPropertiesResponseDto.fromDomain` sets `hasMore: false` when `total === 0` â€” confirmed by static analysis of `page * limit < total` where `total = 0`

**Checkpoint**: Empty state is correctly handled â€” `items: []` returns 200 not 404; `hasMore: false` when no properties exist.

---

## Phase 4: User Story 4 â€” Pagination Navigation (Priority: P3)

**Goal**: A landlord with 50 properties requesting page 3 with limit 20 receives the correct slice and metadata.

**Independent Test**: T010 test case 7 verifies `hasMore` logic. T003 implementation uses DB-level `skip`/`take`. Confirm by inspecting the Prisma implementation.

- [x] T013 [US4] Verify `PrismaPropertyRepository.findPagedByTenant` (written in T003) correctly computes `skip = (page - 1) * limit` and passes `skip` and `take: limit` to `findMany` â€” review the implementation for off-by-one correctness
- [x] T014 [US4] Verify `PaginatedPropertiesResponseDto.fromDomain` `hasMore` field: `page * limit < total` â€” e.g., page=1, limit=20, total=50 â†’ `hasMore: true`; page=3, limit=20, total=50 â†’ `hasMore: false`

**Checkpoint**: Pagination math is correct. `GET /properties?page=2&limit=5` returns the correct second page slice.

---

## Final Phase: Polish & Validation

**Purpose**: Confirm all checks pass and update the backlog.

- [x] T015 Run `pnpm lint` â€” fix any ESLint errors in new/modified files
- [x] T016 [P] Run `pnpm typecheck` â€” fix any TypeScript errors; confirm `create-property.use-case.spec.ts` mock update (T004) resolves interface mismatch
- [x] T017 Run `pnpm build` â€” confirm API and web build successfully
- [x] T018 Run `pnpm --filter @leaseKo/api test` â€” confirm all 44+ tests pass including new `ListPropertiesUseCase` suite
- [x] T019 Update `BACKLOG.md` â€” mark User Story 8.2 tasks as complete (`[x]`) only after T015â€“T018 all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies â€” start immediately
- **US1+US3 (Phase 2)**: Depends on Phase 1 complete â€” `PropertyRepository` interface must have `findPagedByTenant` before use case can reference it
- **US2 (Phase 3)**: Depends on T010 (tests written) â€” verification only, no new code
- **US4 (Phase 4)**: Depends on T003 (repository implementation) and T010 (pagination tests)
- **Polish (Final)**: Depends on all implementation phases complete

### User Story Dependencies

- **US1 + US3 (P1)**: Blocked only by Phase 1 â€” no dependencies on US2 or US4
- **US2 (P2)**: Blocked by T010 â€” the empty-state test case is written as part of US1's test suite
- **US4 (P3)**: Blocked by T003 and T010 â€” DB pagination and metadata logic written in earlier phases

### Within Phase 2

- **T005, T006, T007** are independent â€” different files, run in parallel
- **T008** depends on T005, T006, T007 â€” cannot start until all three complete
- **T009** depends on T005 â€” use case must exist before module can register it
- **T010** depends on T005 â€” test file imports the use case class

### Parallel Opportunities

- T006 (QueryDto) and T007 (ResponseDto) can be written simultaneously â€” independent files
- T015 (lint) and T016 (typecheck) can run simultaneously â€” independent commands
- T013 and T014 (Phase 4 verification) can run simultaneously

---

## Parallel Execution Example: Phase 2

```
# Start these three simultaneously (different files, no cross-dependencies):
T005: Create list-properties.use-case.ts
T006: Create list-properties-query.dto.ts
T007: Create paginated-properties-response.dto.ts

# Only after T005, T006, T007 are complete:
T008: Add GET handler to properties.controller.ts
T009: Register use case in properties.module.ts
T010: Write list-properties.use-case.spec.ts
```

---

## Implementation Strategy

### MVP (Phase 1 + Phase 2 only)

1. Complete Phase 1: Foundational (T001â€“T004)
2. Complete Phase 2: US1+US3 (T005â€“T010)
3. **STOP and VALIDATE**: `pnpm --filter @leaseKo/api test` â€” all tests pass
4. Manually test `GET /properties` in Swagger with a real tenant JWT
5. US2 and US4 are implicitly satisfied by the Phase 2 implementation â€” verify via checkpoints

### Full Delivery

Complete all phases sequentially, run validation after each checkpoint. Total: ~19 tasks.

---

## Notes

- Phases 3 and 4 contain **verification tasks only** â€” US2 (empty state) and US4 (pagination) are fully implemented by Phase 1+2 code; their phases exist to explicitly confirm correctness
- `[P]` tasks involve independent files â€” safe to implement concurrently
- `[US3]` tenant isolation has no dedicated implementation tasks â€” it is guaranteed by `tenantFilter()` in `findPagedByTenant` and verified by test case 5 in T010
- Do not update `BACKLOG.md` until T015â€“T018 all pass (project constitution rule)
