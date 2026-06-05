# Tasks: Update Unit

**Input**: Design documents from `specs/034-update-unit/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/update-unit.yaml ✅

**Tests**: Required — spec mandates unit tests for all six scenarios.

**Organization**: Tasks grouped by user story. No schema changes — pure extension of existing `units/` module.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete [P] tasks in same group)
- **[Story]**: US1 = successful update | US2 = invalid/empty updates | US3 = duplicate unitNumber | US4 = inaccessible units
- All file paths are relative to `apps/api/`

---

## Phase 1: Setup

> No setup required. No new directories, no schema changes. Proceeding directly to foundational tasks.

---

## Phase 2: Foundational (Types + Interface + Repository Implementation)

**Purpose**: Add `UpdateUnitInput`, extend `UnitRepository` interface, and implement `update()` in `PrismaUnitRepository`. All Phase 3 files depend on these.

- [X] T001 Add `UpdateUnitInput` interface to `src/modules/units/application/types/unit-repository.types.ts` — import `UnitStatus` from `../../domain/entities/unit.entity`; all fields optional; clearable fields typed as `| null`: `unitNumber?: string`, `floorArea?: number | null`, `bedrooms?: number | null`, `bathrooms?: number | null`, `monthlyRent?: number | null`, `description?: string | null`, `status?: UnitStatus`; do NOT include `id`, `tenantId`, or `propertyId`
- [X] T002 Add `update(id: string, tenantId: string, input: UpdateUnitInput): Promise<Unit | null>` method signature to `src/modules/units/application/repositories/unit.repository.ts` — import `UpdateUnitInput` from `../types/unit-repository.types`; JSDoc: returns null for both non-existent and cross-tenant (indistinguishable); tenantId MUST NOT appear in input
- [X] T003 Add `update()` implementation to `src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` — use `this.prisma.unit.update({ where: { id, tenantId }, data: input })`; wrap in try-catch for `PrismaClientKnownRequestError`: code `P2025` → return null; code `P2002` → throw `new ConflictException('Unit number already exists under this property.')`; import `UpdateUnitInput` from application types; return `this.toEntity(record)` on success

**Checkpoint**: `pnpm typecheck` — `PrismaUnitRepository` must now fully implement `UnitRepository` (no missing method errors).

---

## Phase 3: User Story 1 — Partial Unit Update (Priority: P1) 🎯 MVP

**Goal**: `PATCH /units/:id` with one or more valid fields returns HTTP 200 with the full updated unit record. Omitted fields are unchanged. Explicit null clears optional fields.

**Independent Test**: PATCH a unit with `{ monthlyRent: 20000, description: null }` — verify 200 with updated `monthlyRent` and `description: null`; all other fields unchanged.

### Implementation for User Story 1

- [X] T004 [P] [US1] Create `src/modules/units/application/use-cases/update-unit.use-case.ts` — `@Injectable()` class; inject `UNIT_REPOSITORY` only; `execute(input: { id: string; tenantId: string; data: UpdateUnitInput }): Promise<Unit>` — calls `this.units.update(input.id, input.tenantId, input.data)`; if result is null throws `NotFoundException('Unit not found.')`; returns the updated `Unit`; propagates `ConflictException` unchanged (no try-catch for it)
- [X] T005 [P] [US1] Create `src/modules/units/presentation/dto/update-unit.dto.ts` — import `UnitStatus` from `../../domain/entities/unit.entity`; import `ValidateIf` from `class-validator`; all fields `@IsOptional()`; clearable fields add `@ValidateIf(o => o.FIELD !== null)` before type validators to allow explicit null: `floorArea` (`@IsNumber() @IsPositive()`), `bedrooms` (`@IsInt() @Min(1)`), `bathrooms` (`@IsNumber() @IsPositive()`), `monthlyRent` (`@IsNumber() @IsPositive()`), `description` (`@IsString() @MaxLength(1000)`); non-clearable: `unitNumber` (`@IsString() @IsNotEmpty() @MaxLength(50)`), `status` (`@IsEnum(UnitStatus)`); types: `unitNumber?: string`, `floorArea?: number | null`, `bedrooms?: number | null`, `bathrooms?: number | null`, `monthlyRent?: number | null`, `description?: string | null`, `status?: UnitStatus`; add `@ApiPropertyOptional` Swagger decorators to each field; do NOT include `id`, `tenantId`, `propertyId`, or `createdAt`
- [X] T006 [P] [US1] Create `src/modules/units/application/use-cases/update-unit.use-case.spec.ts` — mock `UnitRepository` with all four methods (`create`, `findManyByProperty`, `findById`, `update`); write all six scenarios: (1) TC-US1-A: `update` resolves Unit → use case returns it; (2) TC-US1-B: `update` called with correct `id`, `tenantId`, and input data; (3) TC-US1-C: `update` called with `{ floorArea: null }` → use case passes null through (null-clearing is propagated); (4) TC-US2: `update` throws `ConflictException` → use case propagates it unchanged; (5) TC-US4-A: `update` returns null (non-existent) → use case throws `NotFoundException`; (6) TC-US4-B: `update` returns null (cross-tenant, indistinguishable from non-existent) → same `NotFoundException`; no NestJS TestingModule, no Prisma
- [X] T007 [US1] Add `PATCH ':id'` handler to `src/modules/units/presentation/unit.controller.ts` — inject `UpdateUnitUseCase` in constructor alongside `GetUnitByIdUseCase`; handler: `@Patch(':id') @HttpCode(HttpStatus.OK) @RequiresTenant()` with `@CurrentTenant() tenantId`, `@Param('id') id`, `@Body() dto: UpdateUnitDto`; before calling use case check `Object.values(dto).some(v => v !== undefined)` — if false throw `BadRequestException('At least one field must be provided to update a unit.')`; call `this.updateUnit.execute({ id, tenantId, data: { ...dto } })`; return `UnitResponseDto.fromDomain(updated)`; decorate with `@ApiOperation`, `@ApiParam`, `@ApiOkResponse(type: UnitResponseDto)`, `@ApiBadRequestResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse`
- [X] T008 [US1] Add `UpdateUnitUseCase` to the `providers` array in `src/modules/units/units.module.ts`; add import for `UpdateUnitUseCase`

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` — all six T006 scenarios pass.

---

## Phase 4: User Story 2 — Reject Invalid/Empty Updates (Priority: P2)

**Goal**: Empty payload, negative/zero numbers, blank unitNumber, invalid status, and oversized description are all rejected with HTTP 400.

**Independent Test**: DTO validation is enforced by `class-validator` via the global `ValidationPipe`. T005's DTO decorators handle all seven validation scenarios from the spec.

> All validation for US2 is handled by the `UpdateUnitDto` (T005) and the empty-payload check in the controller (T007). No new files are needed.

- [X] T009 [US2] Verify `src/modules/units/presentation/dto/update-unit.dto.ts` (written in T005) correctly covers all US2 validation scenarios: (a) empty object `{}` rejected by controller; (b) `monthlyRent: -500` rejected by `@IsPositive()`; (c) `bedrooms: 0` rejected by `@Min(1)`; (d) `floorArea: -1` rejected by `@IsPositive()`; (e) `unitNumber: ""` rejected by `@IsNotEmpty()`; (f) `status: "RENTED"` rejected by `@IsEnum(UnitStatus)`; (g) description >1000 chars rejected by `@MaxLength(1000)`; confirm `unitNumber: null` is rejected and `floorArea: null` is accepted

**Checkpoint**: All US2 rejection cases verified via DTO decorators.

---

## Phase 5: User Story 3 — Reject Duplicate Unit Number (Priority: P3)

**Goal**: Changing a unit's `unitNumber` to one already in use under the same property returns HTTP 409 Conflict.

**Independent Test**: Use-case spec scenario TC-US2 (written in T006) verifies that `ConflictException` from the repository propagates unchanged through the use case.

> All conflict handling for US3 is implemented in T003 (P2002 → ConflictException in repository) and T006 (TC-US2 propagation scenario). No new files needed.

- [X] T010 [US3] Verify `src/modules/units/application/use-cases/update-unit.use-case.spec.ts` (written in T006) contains an explicit scenario where the repository throws `ConflictException` and the use case propagates it unchanged — confirming the conflict is not swallowed; also verify that the Prisma implementation (T003) catches P2002 before P2025 in the catch chain

**Checkpoint**: TC-US2 in the spec file verifies conflict propagation.

---

## Phase 6: User Story 4 — Reject Inaccessible Units (Priority: P4)

**Goal**: Non-existent unit and cross-tenant unit both return identical HTTP 404.

**Independent Test**: Use-case spec scenarios TC-US4-A and TC-US4-B (written in T006) verify that a null return from `update()` produces `NotFoundException` in both cases.

> All 404 handling for US4 is implemented in T003 (P2025 → null), T004 (null → NotFoundException), and T006 (TC-US4-A/B). No new files needed.

- [X] T011 [US4] Verify `src/modules/units/application/use-cases/update-unit.use-case.spec.ts` (written in T006) contains two explicitly separate TC-US4 scenarios: (a) non-existent unit (mock `update` returns null) → `NotFoundException('Unit not found.')`; (b) cross-tenant unit (mock `update` returns null) → same `NotFoundException` — both cases use the same mock to prove they are indistinguishable

**Checkpoint**: Both TC-US4 scenarios pass with identical NotFoundException.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run `pnpm lint` and fix any linting errors in new/modified files
- [X] T013 [P] Run `pnpm typecheck` and confirm no new TypeScript errors beyond the pre-existing TS6059
- [X] T014 Run `pnpm build` and confirm compilation succeeds
- [X] T015 Run `pnpm --filter @leaseKo/api test` and confirm all test scenarios pass with no regressions in existing suites

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — start immediately; T001 → T002 → T003 sequential
- **Phase 3 (US1)**: Depends on Phase 2 completion; T004 and T005 can then run in parallel
- **Phase 4–6**: Depend on Phase 3 — verification of T005/T006/T007 coverage
- **Phase 7 (Polish)**: Depends on Phases 3–6

### Within Phase 3

T004 and T005 are independent files — run in parallel after T003.
T006 depends on T004 (use case must exist to test it).
T007 depends on both T004 and T005 (imports both use case and DTO).
T006 and T007 are independent files — can run in parallel once their respective dependencies are met.
T008 depends on T007 (module must wire the updated controller constructor).

### Parallel Opportunities

```text
Phase 2 — strictly sequential (each depends on prior):
  T001 → T002 → T003

Phase 3 — Group A (after T003):
  T004: Create update-unit.use-case.ts
  T005: Create update-unit.dto.ts

Phase 3 — Group B (after Group A):
  T006: Create use-case spec (after T004)
  T007: Add PATCH handler to controller (after T004 + T005)

Phase 7:
  T012: pnpm lint
  T013: pnpm typecheck
```

---

## Implementation Strategy

### MVP First

1. T001–T003: Types + interface + repository implementation
2. T004+T005: Use case + DTO (parallel)
3. T006+T007: Spec + controller handler (parallel)
4. T008: Module registration
5. **VALIDATE**: `pnpm --filter @leaseKo/api test` — all 6 scenarios pass; build succeeds
6. T009–T011: Verification of US2/US3/US4 spec coverage
7. T012–T015: Polish

### Notes

- `UpdateUnitInput` MUST NOT include `tenantId`, `propertyId`, or `id`
- `@ValidateIf(o => o.field !== null)` is required for every clearable field in `UpdateUnitDto`
- The empty-payload check in T007 counts `Object.values(dto).some(v => v !== undefined)` — a payload of all nulls IS valid (clearing fields) and must NOT be rejected
- The use case MUST propagate `ConflictException` without catching it — it flows up to the global exception filter which returns 409
- `UnitRepository` mock in T006 MUST include all four methods: `create`, `findManyByProperty`, `findById`, `update`
- `UpdateUnitDto` does not need `id`, `tenantId`, `propertyId` fields — the global `forbidNonWhitelisted: true` ValidationPipe rejects them automatically if submitted
