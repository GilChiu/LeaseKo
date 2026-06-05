# Tasks: Create Unit

**Input**: Design documents from `specs/031-create-unit/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/create-unit.yaml ✅

**Tests**: Required — spec explicitly mandates unit tests for all five scenarios.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on other [P] tasks in same group)
- **[Story]**: US1 = successful creation | US2 = duplicate unit number | US3 = inaccessible property
- All file paths are relative to `apps/api/`

---

## Phase 1: Setup (Module Directory Structure)

**Purpose**: Create the `units` module skeleton so all subsequent tasks have valid destination paths.

- [x] T001 Create directory tree `apps/api/src/modules/units/` with subdirectories: `domain/entities/`, `application/repositories/`, `application/types/`, `application/use-cases/`, `infrastructure/repositories/`, `presentation/dto/`

---

## Phase 2: Foundational (Prisma Schema + Migration)

**Purpose**: Establish the `units` DB table and generated Prisma client types. All TypeScript files in Phases 3–5 depend on the generated `@prisma/client` output.

**⚠️ CRITICAL**: No implementation work can begin until T006 completes and `@prisma/client` is regenerated.

- [x] T002 Add `UnitStatus` enum (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`) to `apps/api/prisma/schema.prisma` before the `Unit` model declaration
- [x] T003 Add `Unit` model to `apps/api/prisma/schema.prisma` — fields: `id`, `tenantId`, `propertyId`, `unitNumber`, `status` (default `AVAILABLE`), `floorArea` (Float?), `bedrooms` (Int?), `bathrooms` (Float?), `monthlyRent` (Decimal? `@db.Decimal(12,2)`), `description`, `createdAt`, `updatedAt`; constraints: `@@unique([propertyId, unitNumber])`, `@@index([tenantId])`, `@@index([propertyId])`; FK relations to `Tenant` and `Property` (both `onDelete: Cascade`)
- [x] T004 Add `units Unit[]` back-reference to the `Property` model in `apps/api/prisma/schema.prisma`
- [x] T005 Add `units Unit[]` back-reference to the `Tenant` model in `apps/api/prisma/schema.prisma`
- [x] T006 Run `pnpm db:migrate` from repo root to generate and apply the migration; confirm `@prisma/client` is regenerated

**Checkpoint**: `pnpm typecheck` passes with no errors related to unknown Prisma types.

---

## Phase 3: User Story 1 — Successful Unit Creation (Priority: P1) 🎯 MVP

**Goal**: A landlord can submit `POST /properties/:propertyId/units` with a valid unit number and receive the created unit record in response.

**Independent Test**: Submit a valid creation request against a running dev server (or pass the use-case test); verify the returned record has a generated ID, the property's tenantId, AVAILABLE status, all provided fields, and timestamps.

### Implementation for User Story 1

- [x] T007 [US1] Create `src/modules/units/domain/entities/unit.entity.ts` — export `UnitStatus` string union (`'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'`) and `Unit` interface with all fields typed as plain TypeScript (no Prisma imports); see `data-model.md` for full field list
- [x] T008 [P] [US1] Create `src/modules/units/application/types/unit-repository.types.ts` — export `CreateUnitInput` interface (`tenantId`, `propertyId`, `unitNumber`, and all optional fields); this is the repository layer's input contract; `status` is NOT included (always AVAILABLE on create)
- [x] T009 [P] [US1] Create `src/modules/units/application/repositories/unit.repository.ts` — export `UNIT_REPOSITORY = Symbol('UNIT_REPOSITORY')` and `UnitRepository` interface with single method `create(input: CreateUnitInput): Promise<Unit>`; import only from domain and types — no Prisma or NestJS imports
- [x] T010 [US1] Create `src/modules/units/application/use-cases/create-unit.use-case.ts` — inject both `UNIT_REPOSITORY` (`UnitRepository`) and `PROPERTY_REPOSITORY` (`PropertyRepository`); `execute()` receives `{ tenantId, propertyId, unitNumber, floorArea?, bedrooms?, bathrooms?, monthlyRent?, description? }`; calls `propertyRepository.findById(input.propertyId, input.tenantId)` — throws `NotFoundException('Property not found.')` if null; passes `property.tenantId` (not `input.tenantId`) as the unit's `tenantId` to `unitRepository.create()`
- [x] T011 [US1] Create `src/modules/units/application/use-cases/create-unit.use-case.spec.ts` — mock both `PropertyRepository` and `UnitRepository` (no NestJS TestingModule, no Prisma); write all five required scenarios: (1) successful creation returns Unit record, (2) successful creation passes `property.tenantId` (not input tenantId) to `unitRepository.create`, (3) `ConflictException` from `unitRepository.create` propagates unmodified, (4) `propertyRepository.findById` returning null throws `NotFoundException`, (5) all three null-returning cases (non-existent / other-tenant / archived) produce an identical `NotFoundException`; see spec.md acceptance scenarios for exact scenario descriptions
- [x] T012 [P] [US1] Create `src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` — implement `PrismaUnitRepository` with `create()` method using `this.prisma.unit.create()`; map all fields from `CreateUnitInput`; `status` is NOT in the input — Prisma default (`AVAILABLE`) is used automatically; `toEntity()` private method converts `PrismaUnit` to `Unit` domain entity, calling `.toNumber()` on `monthlyRent` (Prisma Decimal); follow `PrismaPropertyRepository` as the reference pattern
- [x] T013 [P] [US1] Create `src/modules/units/presentation/dto/create-unit.dto.ts` — `unitNumber`: `@IsString() @IsNotEmpty() @MaxLength(50)`; `floorArea`: `@IsOptional() @IsNumber() @IsPositive()`; `bedrooms`: `@IsOptional() @IsInt() @Min(1)`; `bathrooms`: `@IsOptional() @IsNumber() @IsPositive()`; `monthlyRent`: `@IsOptional() @IsNumber() @IsPositive()`; `description`: `@IsOptional() @IsString() @MaxLength(1000)`; NO `tenantId`, NO `propertyId`, NO `status` fields in this DTO
- [x] T014 [P] [US1] Create `src/modules/units/presentation/dto/unit-response.dto.ts` — map all `Unit` entity fields to `@ApiProperty` / `@ApiPropertyOptional` decorated class properties; add static `fromDomain(unit: Unit): UnitResponseDto` factory; follow `PropertyResponseDto` as the reference pattern
- [x] T015 [US1] Create `src/modules/units/presentation/units.controller.ts` — `@Controller('properties/:propertyId/units')`; single `@Post()` method: receives `@CurrentTenant() tenantId`, `@Param('propertyId') propertyId`, `@Body() dto: CreateUnitDto`; delegates to `CreateUnitUseCase.execute()`; returns `UnitResponseDto.fromDomain(unit)`; decorate with `@RequiresTenant()`, `@ApiTags('Units')`, `@ApiBearerAuth()`, and full Swagger response decorators (`@ApiCreatedResponse`, `@ApiBadRequestResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse`)
- [x] T016 [US1] Create `src/modules/units/units.module.ts` — declare `UnitsController`; register `{ provide: UNIT_REPOSITORY, useClass: PrismaUnitRepository }` and `CreateUnitUseCase` as providers; import `PropertiesModule` so `PROPERTY_REPOSITORY` is available via DI
- [x] T017 [US1] Register `UnitsModule` in `src/app.module.ts` — add to the `imports` array alongside existing modules

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` — all five use-case scenarios should pass. Run `pnpm typecheck` — no errors.

---

## Phase 4: User Story 2 — Reject Duplicate Unit Number (Priority: P2)

**Goal**: Attempting to create a second unit with the same `unitNumber` under the same property returns a 409 Conflict response.

**Independent Test**: Create a unit successfully (US1 complete), then send an identical request — confirm the response is 409 Conflict with a descriptive message.

### Implementation for User Story 2

- [x] T018 [US2] Update `src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` — wrap `prisma.unit.create()` call in try-catch; catch `PrismaClientKnownRequestError` with code `'P2002'` and throw `new ConflictException('Unit number already exists under this property.')`; re-throw all other errors

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` — all five scenarios still pass. Manually verify: the `ConflictException` test case in the spec (scenario 3) exercises this path via the mocked repository; no new test file needed.

---

## Phase 5: User Story 3 — Reject Inaccessible Properties (Priority: P3)

**Goal**: Requests targeting a non-existent, another tenant's, or an archived property all return 404 Not Found — indistinguishable from each other.

**Independent Test**: Send three requests targeting (a) a random UUID, (b) a known other-tenant property ID, (c) an archived property ID — confirm all three return 404 with the same response shape.

### Implementation for User Story 3

> All implementation for US3 is contained in the `CreateUnitUseCase` written in T010: `propertyRepository.findById()` returns null for all three cases; the use case throws `NotFoundException('Property not found.')` in each. No new files or changes are required.

- [x] T019 [US3] Verify `src/modules/units/application/use-cases/create-unit.use-case.spec.ts` (written in T011) includes explicit test cases for all three US3 property-inaccessible scenarios: (a) mock `propertyRepository.findById` returns `null` for a non-existent ID → `NotFoundException`, (b) mock returns `null` for a different-tenant property → `NotFoundException`, (c) mock returns `null` for an archived property → `NotFoundException`; confirm all three produce `NotFoundException` with the same message, making them indistinguishable to the caller

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` — all five scenarios pass with US3 scenarios explicitly verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories.

- [x] T020 [P] Run `pnpm lint` and fix any linting errors across all new/modified files
- [x] T021 [P] Run `pnpm typecheck` and resolve any TypeScript errors
- [x] T022 Run `pnpm build` and confirm the build succeeds with no compilation errors
- [x] T023 Run `pnpm --filter @leaseKo/api test` and confirm all five `CreateUnitUseCase` test scenarios pass with no regressions in existing test suites

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — **blocks all user story work**
- **Phase 3 (US1)**: Depends on Phase 2 (Prisma client must be regenerated) — can then proceed fully
- **Phase 4 (US2)**: Depends on Phase 3 (modifies `prisma-unit.repository.ts` created in T012)
- **Phase 5 (US3)**: Depends on Phase 3 (verifies spec coverage of use case from T010/T011)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2 (Foundational)
- **US2 (P2)**: Depends on US1 — adds one change to the repository file from T012
- **US3 (P3)**: Depends on US1 — all implementation already present; phase is a verification step

### Within Phase 3

Tasks T008, T009 are independent of each other and can run in parallel.
Tasks T012, T013, T014 are independent of each other and can run in parallel.
T010 depends on T007, T008, T009 (entity + types + interface must exist).
T011 depends on T010 (use case must exist to test).
T015 depends on T013, T014 (DTOs must exist).
T016 depends on T012, T015 (repo + controller must exist).
T017 depends on T016 (module must exist).

---

## Parallel Opportunities

```text
Phase 3 — Group A (run in parallel after T007):
  T008: Create unit-repository.types.ts
  T009: Create unit.repository.ts

Phase 3 — Group B (run in parallel after T010):
  T012: Create prisma-unit.repository.ts
  T013: Create create-unit.dto.ts
  T014: Create unit-response.dto.ts

Phase 6 (run in parallel):
  T020: pnpm lint
  T021: pnpm typecheck
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — schema + migration (**critical blocker**)
3. Complete Phase 3: US1 — all new files + full test suite
4. **STOP and VALIDATE**: `pnpm --filter @leaseKo/api test` passes; feature is functional
5. Ship if Phase 3 is sufficient for immediate needs

### Incremental Delivery

1. Setup + Foundational → DB table ready, Prisma client regenerated
2. US1 → Successful unit creation working end-to-end (MVP)
3. US2 → Adds P2002 duplicate protection to the repository
4. US3 → Verified: property isolation already enforced by the use case from US1
5. Polish → Lint + typecheck + full build + full test suite

### Notes

- [P] tasks within a phase have different file targets — safe to parallelize
- The full test spec (T011) covers all 5 scenarios even though they span US1–US3; this is intentional since they all test the same `CreateUnitUseCase`
- `propertyId` MUST come exclusively from `@Param('propertyId')` in the controller — never from the request body
- `tenantId` MUST come exclusively from `@CurrentTenant()` in the controller — never from the request body
- `status` MUST NOT appear in `CreateUnitDto` or `CreateUnitUseCaseInput` — it is a DB default
- `monthlyRent` is `Decimal` in Prisma → convert to `number` in `toEntity()` via `.toNumber()`
