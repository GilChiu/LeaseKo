# Tasks: List Units by Property

**Input**: Design documents from `specs/032-list-units-by-property/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/list-units-by-property.yaml ✅

**Tests**: Required — spec mandates unit tests for all five scenarios.

**Organization**: Tasks grouped by user story. No new module or schema changes — pure extension of existing `units/` module.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on other [P] tasks in same group)
- **[Story]**: US1 = multi-unit listing | US2 = empty property | US3 = inaccessible property
- All file paths are relative to `apps/api/`

---

## Phase 1: Setup

> No setup required. This feature extends the existing `units/` module with no new directories, no new module registration, and no Prisma schema changes. Proceeding directly to foundational tasks.

---

## Phase 2: Foundational (Shared Types + Interface Extension)

**Purpose**: Add the new shared types and extend the `UnitRepository` interface. All Phase 3 files depend on these types being defined first.

**⚠️ CRITICAL**: No user story work can begin until T001 and T002 are complete — the use case and repository implementation both import these types.

- [x] T001 Add `FindManyByPropertyOptions` interface (`page: number; limit: number`) and `PagedUnits` interface (`items: Unit[]; total: number`) to `src/modules/units/application/types/unit-repository.types.ts` — import `Unit` from the domain entity; these additions go alongside the existing `CreateUnitInput`
- [x] T002 Add `findManyByProperty(propertyId: string, tenantId: string, options: FindManyByPropertyOptions): Promise<PagedUnits>` method signature to `src/modules/units/application/repositories/unit.repository.ts` — import `FindManyByPropertyOptions` and `PagedUnits` from `../types/unit-repository.types`; include a JSDoc comment noting the caller MUST verify property ownership via `PropertyRepository.findById()` before calling this method

**Checkpoint**: `pnpm typecheck` should fail only on the pre-existing TS6059 error — no new errors from the added interface method (Prisma repo will show "does not implement" until T003).

---

## Phase 3: User Story 1 — Paginated Unit Listing (Priority: P1) 🎯 MVP

**Goal**: A landlord can call `GET /properties/:propertyId/units` for an accessible property and receive an ordered, paginated list of units with correct total count.

**Independent Test**: Call the endpoint (or run the use-case spec) for a property containing 2+ units; verify HTTP 200 with units ordered by `unitNumber` asc, correct `total`, correct `hasMore`, and all required fields on each unit.

### Implementation for User Story 1

- [x] T003 [P] [US1] Add `findManyByProperty()` implementation to `src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` — use `this.prisma.$transaction([findMany, count])` with `where: { propertyId, tenantId }`, `orderBy: { unitNumber: 'asc' }`, `skip: (page - 1) * limit`, `take: limit`; return `{ items: records.map(r => this.toEntity(r)), total }`; import `FindManyByPropertyOptions` and `PagedUnits` from application types
- [x] T004 [P] [US1] Create `src/modules/units/application/use-cases/list-units-by-property.use-case.ts` — inject `UNIT_REPOSITORY` (`UnitRepository`) and `PROPERTY_REPOSITORY` (`PropertyRepository`); `execute()` receives `{ tenantId, propertyId, page, limit }`; Step 1: call `propertyRepository.findById(input.propertyId, input.tenantId)` — throw `NotFoundException('Property not found.')` if null; Step 2: call `unitRepository.findManyByProperty(input.propertyId, input.tenantId, { page: input.page, limit: input.limit })`; return the `PagedUnits` result; return type is `Promise<PagedUnits>`
- [x] T005 [P] [US1] Create `src/modules/units/presentation/dto/list-units-query.dto.ts` — `page`: `@IsOptional() @Type(() => Number) @IsInt() @Min(1)` default `1`; `limit`: `@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)` default `50`; follow `ListPropertiesQueryDto` as the reference pattern exactly, including `@Type(() => Number)` for query-param coercion; add `@ApiPropertyOptional` decorators for Swagger
- [x] T006 [P] [US1] Create `src/modules/units/presentation/dto/paginated-units-response.dto.ts` — class with `@ApiProperty`-decorated fields: `items: UnitResponseDto[]`, `total: number`, `page: number`, `limit: number`, `hasMore: boolean`; static `fromDomain(pagedResult: PagedUnits, page: number, limit: number): PaginatedUnitsResponseDto` — maps items via `UnitResponseDto.fromDomain`, computes `hasMore = page * limit < pagedResult.total`; follow `PaginatedPropertiesResponseDto` as the reference pattern
- [x] T007 [US1] Create `src/modules/units/application/use-cases/list-units-by-property.use-case.spec.ts` — mock both `PropertyRepository` (full interface) and `UnitRepository` (must include `findManyByProperty` alongside existing `create`); write all five required scenarios: (1) returns `PagedUnits` when property found and has units; (2) calls `propertyRepository.findById` with correct `propertyId` and `tenantId`; (3) calls `unitRepository.findManyByProperty` with `propertyId`, `tenantId`, `page`, `limit`; (4) returns `{ items: [], total: 0 }` (not a 404) when property found but `findManyByProperty` resolves an empty result; (5) US3-A: `propertyRepository.findById` returns null → `NotFoundException`; (6) US3-B: cross-tenant property also returns null → same `NotFoundException`; (7) US3-C: archived property also returns null → same `NotFoundException`; (8) does NOT call `unitRepository.findManyByProperty` when property is not found; no NestJS TestingModule, no Prisma
- [x] T008 [US1] Add `@Get()` handler to `src/modules/units/presentation/units.controller.ts` — inject `ListUnitsByPropertyUseCase` in the constructor alongside existing `CreateUnitUseCase`; handler signature: `async list(@CurrentTenant() tenantId, @Param('propertyId') propertyId, @Query() query: ListUnitsQueryDto): Promise<PaginatedUnitsResponseDto>`; call `this.listUnitsByProperty.execute({ tenantId, propertyId, page: query.page, limit: query.limit })` then return `PaginatedUnitsResponseDto.fromDomain(result, query.page, query.limit)`; decorate with `@Get()`, `@HttpCode(HttpStatus.OK)`, `@RequiresTenant()`, `@ApiOperation`, `@ApiParam`, `@ApiOkResponse(type: PaginatedUnitsResponseDto)`, `@ApiNotFoundResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse`; add `@ApiQuery` decorators for `page` and `limit`
- [x] T009 [US1] Add `ListUnitsByPropertyUseCase` to the `providers` array in `src/modules/units/units.module.ts`

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` — all use-case scenarios (T007) should pass. Run `pnpm typecheck` — no new errors (beyond pre-existing).

---

## Phase 4: User Story 2 — Empty Unit List (Priority: P2)

**Goal**: `GET /properties/:propertyId/units` for an accessible property with no units returns HTTP 200 with `{ items: [], total: 0, hasMore: false }` — never a 404.

**Independent Test**: Use-case spec scenario (4) in T007 covers this: mock `findManyByProperty` to resolve `{ items: [], total: 0 }` and verify the use case returns it unchanged (not throws).

### Implementation for User Story 2

> All implementation for US2 is contained in T003 (repository returns `{ items: [], total: 0 }` naturally when no rows match) and T004 (use case passes the empty result through). No new files or code changes are required for this story.

- [x] T010 [US2] Verify `src/modules/units/application/use-cases/list-units-by-property.use-case.spec.ts` (written in T007) contains an explicit scenario where `unitRepository.findManyByProperty` resolves `{ items: [], total: 0 }` and the use case returns that result without throwing — confirming the empty-property case produces 200, not 404

**Checkpoint**: The scenario from T010 is part of the T007 spec file; running `pnpm --filter @leaseKo/api test` confirms it.

---

## Phase 5: User Story 3 — Inaccessible Property (Priority: P3)

**Goal**: All three inaccessibility cases (non-existent, cross-tenant, archived) return identical `NotFoundException` responses and never reach the unit query.

**Independent Test**: Use-case spec scenarios (5)–(8) in T007 cover all three cases: mock `propertyRepository.findById` returning null for each, verify `NotFoundException` is thrown and `unitRepository.findManyByProperty` is never called.

### Implementation for User Story 3

> All implementation for US3 is contained in T004 (use case calls `findById` and throws `NotFoundException` on null). No new files or code changes are required.

- [x] T011 [US3] Verify `src/modules/units/application/use-cases/list-units-by-property.use-case.spec.ts` (written in T007) contains three explicitly separate scenarios for US3 — one for non-existent property, one for cross-tenant property, one for archived property — all mocking `propertyRepository.findById` to return null and all expecting `NotFoundException('Property not found.')`; also verify a scenario confirming `unitRepository.findManyByProperty` is NOT called when `findById` returns null

**Checkpoint**: All three US3 scenarios pass with identical `NotFoundException` and no unit query issued.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T012 [P] Run `pnpm lint` and fix any linting errors in new/modified files
- [x] T013 [P] Run `pnpm typecheck` and confirm no new TypeScript errors beyond the pre-existing TS6059
- [x] T014 Run `pnpm build` and confirm compilation succeeds
- [x] T015 Run `pnpm --filter @leaseKo/api test` and confirm all test scenarios pass with no regressions in existing suites

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — start immediately
- **Phase 3 (US1)**: Depends on Phase 2 (T001 + T002 must be complete)
- **Phase 4 (US2)**: Depends on Phase 3 — verification of T007 spec coverage
- **Phase 5 (US3)**: Depends on Phase 3 — verification of T007 spec coverage
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2 completion
- **US2 (P2)**: Depends on US1 — behavior already implemented; phase is spec verification
- **US3 (P3)**: Depends on US1 — behavior already implemented; phase is spec verification

### Within Phase 3

T001 and T002 must complete before Phase 3 begins.
T003, T004, T005, T006 are independent of each other (different files) — all can run in parallel after T002.
T007 depends on T004 (use case must exist to test).
T008 depends on T005 and T006 (DTOs must exist for the controller).
T009 depends on T008 (controller must be updated before module wires it).

---

## Parallel Opportunities

```text
Phase 2 (sequential — same file for T001, then T002):
  T001 → T002

Phase 3 — Group A (run in parallel after T002):
  T003: Add findManyByProperty() to prisma-unit.repository.ts
  T004: Create list-units-by-property.use-case.ts
  T005: Create list-units-query.dto.ts
  T006: Create paginated-units-response.dto.ts

Phase 3 — After Group A:
  T007: Create spec (depends on T004)
  T008: Add @Get() to controller (depends on T005 + T006)
  → T009: Update module (depends on T008)

Phase 6 (run in parallel):
  T012: pnpm lint
  T013: pnpm typecheck
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: T001 + T002 (types + interface)
2. Complete Phase 3: T003–T009 (repository + use case + DTOs + controller + module)
3. **STOP and VALIDATE**: `pnpm --filter @leaseKo/api test` passes all 5+ scenarios
4. US2 and US3 are already working — their behaviour is embedded in the Phase 3 use case

### Incremental Delivery

1. T001+T002 → Foundation ready
2. T003–T009 → Full endpoint working (MVP); US1, US2, US3 all handled
3. T010+T011 → Spec coverage verified
4. T012–T015 → All checks pass

### Notes

- **T001+T002 must be sequential** — T002 edits the same `unit.repository.ts` that uses the types from T001
- **`UnitRepository` mock in T007** must include both `create` (existing) and `findManyByProperty` (new) methods — the mock must satisfy the full interface
- **Default `limit` is 50**, not 20 — this is intentional and differs from the properties endpoint
- **`hasMore = page * limit < total`** — same formula as `PaginatedPropertiesResponseDto`
- **`unitRepository.findManyByProperty` must NOT be called if `findById` returns null** — T007 scenario (8) explicitly verifies this
