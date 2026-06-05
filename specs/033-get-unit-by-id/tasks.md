# Tasks: Get Unit by ID

**Input**: Design documents from `specs/033-get-unit-by-id/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/get-unit-by-id.yaml ✅

**Tests**: Required — spec mandates unit tests for all three scenarios.

**Organization**: Tasks grouped by user story. No schema changes, no new module, no new DTOs — minimal extension of existing `units/` module.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on other [P] tasks in same group)
- **[Story]**: US1 = successful retrieval | US2 = inaccessible unit (404)
- All file paths are relative to `apps/api/`

---

## Phase 1: Setup

> No setup required. No new directories, no schema changes, no new module registration. Proceeding directly to foundational tasks.

---

## Phase 2: Foundational (Interface + Repository Implementation)

**Purpose**: Extend `UnitRepository` with `findById()` and implement it in `PrismaUnitRepository`. The use case (Phase 3) depends on both.

- [x] T001 Add `findById(id: string, tenantId: string): Promise<Unit | null>` method signature to `src/modules/units/application/repositories/unit.repository.ts` — include JSDoc noting: returns null for both non-existent and cross-tenant units (indistinguishable); units have no deletedAt filter
- [x] T002 Add `findById()` implementation to `src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` — use `this.prisma.unit.findFirst({ where: { id, tenantId } })`; return `this.toEntity(record)` if record is truthy, otherwise `null`; do NOT add a `deletedAt: null` filter — units have no soft-delete

**Checkpoint**: `pnpm typecheck` (only pre-existing TS6059 error expected; `PrismaUnitRepository` implements `UnitRepository` is verified).

---

## Phase 3: User Story 1 — Retrieve a Unit by Its ID (Priority: P1) 🎯 MVP

**Goal**: `GET /units/:id` returns HTTP 200 with the full unit record for a valid unit belonging to the current tenant.

**Independent Test**: Request the endpoint with a unit ID that exists and belongs to the tenant; verify HTTP 200 with all fields present including null optional fields.

### Implementation for User Story 1

- [x] T003 [US1] Create `src/modules/units/application/use-cases/get-unit-by-id.use-case.ts` — `@Injectable()` class; inject `UNIT_REPOSITORY` (`UnitRepository`) only (no `PROPERTY_REPOSITORY` needed); `execute(input: { id: string; tenantId: string }): Promise<Unit>` — calls `this.units.findById(input.id, input.tenantId)`; throws `NotFoundException('Unit not found.')` if null; returns the unit otherwise
- [x] T004 [P] [US1] Create `src/modules/units/application/use-cases/get-unit-by-id.use-case.spec.ts` — mock `UnitRepository` (full interface: `create`, `findManyByProperty`, `findById`); write all three required scenarios: (1) TC-US1-A: `findById` resolves unit → use case returns it; (2) TC-US1-B: `findById` called with exact `id` and `tenantId` from input; (3) TC-US2-A: `findById` returns null (non-existent unit) → `NotFoundException`; (4) TC-US2-B: `findById` returns null (cross-tenant unit, indistinguishable from non-existent) → same `NotFoundException`; (5) TC-US1-C: unexpected repository error propagates without swallowing; no NestJS TestingModule, no Prisma
- [x] T005 [P] [US1] Create `src/modules/units/presentation/unit.controller.ts` — `@ApiTags('Units') @ApiBearerAuth() @Controller('units')` class named `UnitController`; constructor injects `GetUnitByIdUseCase`; single handler: `@Get(':id') @HttpCode(HttpStatus.OK) @RequiresTenant()` async `findOne(@CurrentTenant() tenantId, @Param('id') id): Promise<UnitResponseDto>`; calls `this.getUnitById.execute({ id, tenantId })` then returns `UnitResponseDto.fromDomain(unit)`; decorate with `@ApiOperation({ summary: 'Get a unit by ID' })`, `@ApiParam({ name: 'id', description: 'Unit unique identifier' })`, `@ApiOkResponse({ type: UnitResponseDto })`, `@ApiNotFoundResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse`
- [x] T006 [US1] Update `src/modules/units/units.module.ts` — import `UnitController` and `GetUnitByIdUseCase`; add `UnitController` to the `controllers` array alongside `UnitsController`; add `GetUnitByIdUseCase` to the `providers` array

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` — all spec scenarios pass. Run `pnpm typecheck` — no new errors.

---

## Phase 4: User Story 2 — Reject Access to Inaccessible Units (Priority: P2)

**Goal**: `GET /units/:id` returns 404 for a non-existent unit, a unit belonging to a different tenant, and a malformed ID — all three cases are identical.

**Independent Test**: Use-case spec scenarios TC-US2-A and TC-US2-B (written in T004) verify that `findById` returning null always produces `NotFoundException`. No additional code is needed — the behavior is fully implemented in T003.

> All implementation for US2 is contained in T003 (the use case throws `NotFoundException` when `findById` returns null) and T002 (the repository returns null for both non-existent and cross-tenant lookups). No new files or code changes are required.

- [x] T007 [US2] Verify `src/modules/units/application/use-cases/get-unit-by-id.use-case.spec.ts` (written in T004) contains explicit scenarios for both inaccessible-unit cases: (a) TC-US2-A — `findById` returns null for a non-existent ID → `NotFoundException('Unit not found.')`; (b) TC-US2-B — `findById` returns null for a cross-tenant unit → same `NotFoundException`; confirm both cases use the same mock return value (null) to prove they are indistinguishable

**Checkpoint**: Running `pnpm --filter @leaseKo/api test` — all TC-US2 scenarios pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T008 [P] Run `pnpm lint` and fix any linting errors in new/modified files
- [x] T009 [P] Run `pnpm typecheck` and confirm no new TypeScript errors beyond the pre-existing TS6059
- [x] T010 Run `pnpm build` and confirm compilation succeeds
- [x] T011 Run `pnpm --filter @leaseKo/api test` and confirm all test scenarios pass with no regressions in existing suites

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — start immediately
- **Phase 3 (US1)**: T003 depends on T002 (interface + implementation must exist); T004 and T005 can run in parallel after T003; T006 depends on T005
- **Phase 4 (US2)**: Verification of T004 spec coverage — depends on Phase 3
- **Phase 5 (Polish)**: Depends on Phases 3–4

### Within Phase 3

T001 → T002 → T003 (sequential — each depends on prior)
After T003: T004 [P] and T005 [P] can run simultaneously (different files)
After T005: T006 (module wires the controller)

### Parallel Opportunities

```text
Phase 2:
  T001 → T002 (sequential — T002 implements the interface from T001)

Phase 3 — after T003 completes:
  T004: Create use-case spec (different file from T005)
  T005: Create unit.controller.ts (different file from T004)

Phase 5:
  T008: pnpm lint
  T009: pnpm typecheck
```

---

## Implementation Strategy

### MVP First (Single-story)

1. T001+T002: Extend interface and repository
2. T003: Create use case
3. T004+T005: Spec and controller (parallel)
4. T006: Wire module
5. **STOP and VALIDATE**: tests pass, build succeeds
6. T007–T011: verification

### Notes

- `UnitRepository` mock in T004 MUST include all three methods: `create`, `findManyByProperty`, `findById` (all members of the full interface after feature 031+032 extensions)
- `UnitController` (T005) is `@Controller('units')` — NOT `@Controller('properties/:propertyId/units')`
- Both `UnitController` and `UnitsController` are in `UnitsModule.controllers` — NestJS supports multiple controllers per module
- `findById` in T002 has NO `deletedAt` filter — this is intentional and differs from `PrismaPropertyRepository.findById`
- `UnitResponseDto` is imported and reused — do not create a new response DTO
