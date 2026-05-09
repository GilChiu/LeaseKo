# Tasks: Create Property Use Case & API Endpoint

**Input**: Design documents from `specs/025-create-property-endpoint/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅, contracts/post-properties.md ✅
**Branch**: `feature/create-property-endpoint`
**Tests**: Not explicitly requested in this task — existing 37 tests must remain passing; unit tests for `CreatePropertyUseCase` are explicitly deferred to a future task per spec

**Organization**: Tasks are grouped by user story. US1 delivers the full working endpoint (MVP). US2 and US3 are validation-focused acceptance checkpoints on the code written in US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story label (US1, US2, US3)
- Exact file paths included in every task

---

## Phase 1: Setup

**Purpose**: Create the new folders needed before any source files are authored.

- [X] T001 Create `apps/api/src/modules/properties/application/use-cases/` directory
- [X] T002 [P] Create `apps/api/src/modules/properties/presentation/dto/` directory

**Checkpoint**: Folder structure exists — file creation can now begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No blocking foundational tasks needed — all domain entities, repository interface, and `PrismaPropertyRepository` exist from Feature 024. This phase is intentionally empty; proceed directly to Phase 3.

---

## Phase 3: User Story 1 — Authenticated Tenant User Can Create a Property (Priority: P1) 🎯 MVP

**Goal**: Deliver the full `POST /api/v1/properties` flow: use case → repository → controller → response. Returns 201 with typed `PropertyResponseDto`. `tenantId` comes exclusively from Clerk JWT context.

**Independent Test**: Build passes (exit 0). All 37 existing tests pass. `POST /api/v1/properties` with a valid auth token and body returns 201 with property data including `id`, `tenantId`, `createdAt`.

### Implementation for User Story 1

- [X] T003 [P] [US1] Create `CreatePropertyUseCase` in `apps/api/src/modules/properties/application/use-cases/create-property.use-case.ts` — `@Injectable()`, inject `PROPERTY_REPOSITORY` token via `@Inject(PROPERTY_REPOSITORY)`, `execute(input: CreatePropertyInput): Promise<Property>` delegates to `this.properties.create(input)`; no PrismaService import; no HTTP import
- [X] T004 [P] [US1] Create `PropertyResponseDto` in `apps/api/src/modules/properties/presentation/dto/property-response.dto.ts` — fields: `id`, `tenantId`, `name`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`, `propertyType`, `description`, `createdAt`, `updatedAt`; each decorated with `@ApiProperty` / `@ApiPropertyOptional`; static `fromDomain(property: Property): PropertyResponseDto` mapper method; `deletedAt` excluded
- [X] T005 [P] [US1] Create `CreatePropertyDto` in `apps/api/src/modules/properties/presentation/dto/create-property.dto.ts` — NO `tenantId` field; required fields (`name`, `addressLine1`, `city`, `country`, `propertyType`) with `@IsString() @IsNotEmpty() @MaxLength(N)`; optional fields (`addressLine2`, `state`, `postalCode`, `description`) with `@IsOptional() @IsString() @MaxLength(N)`; `@ApiProperty` / `@ApiPropertyOptional` on every field
- [X] T006 [US1] Create `PropertiesController` in `apps/api/src/modules/properties/presentation/properties.controller.ts` — `@ApiTags('Properties')`, `@ApiBearerAuth()`, `@Controller('properties')`; single `@Post()` method with `@RequiresTenant()`, `@ApiOperation`, `@ApiCreatedResponse({ type: PropertyResponseDto })`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse`; receives `@CurrentTenant() tenantId: string` and `@Body() dto: CreatePropertyDto`; calls `createProperty.execute({ tenantId, ...dto fields })` mapping optional fields to `null`; returns `PropertyResponseDto.fromDomain(property)`; no PrismaService import
- [X] T007 [US1] Update `PropertiesModule` in `apps/api/src/modules/properties/properties.module.ts` — add `controllers: [PropertiesController]` array, add `CreatePropertyUseCase` to `providers` array; keep existing `PROPERTY_REPOSITORY` binding and `exports`

**Checkpoint**: `pnpm --filter @leaseKo/api build` exits 0. `pnpm --filter @leaseKo/api test` shows 37/37 pass. `POST /api/v1/properties` visible in Swagger at `/api/docs`.

---

## Phase 4: User Story 2 — Invalid Request Body is Rejected with a Structured Error (Priority: P2)

**Goal**: Verify that `CreatePropertyDto` validation rules enforce all required fields, max-length constraints, and that `tenantId` in the body is rejected by the `forbidNonWhitelisted: true` pipe.

**Independent Test**: Build + test still passing. A missing `name` field returns 400. `tenantId` in body returns 400 (`property tenantId should not exist`).

**Note**: US2 is a correctness-verification checkpoint on T005. No new files required.

### Implementation for User Story 2

- [X] T008 [US2] Verify `CreatePropertyDto` has NO `tenantId` field — grep `tenantId` in `apps/api/src/modules/properties/presentation/dto/create-property.dto.ts`; confirm zero matches; fix if present
- [X] T009 [US2] Verify required fields in `CreatePropertyDto` use `@IsNotEmpty()` — confirm `name`, `addressLine1`, `city`, `country`, `propertyType` all have `@IsString() @IsNotEmpty() @MaxLength(N)`; fix if missing
- [X] T010 [US2] Verify optional fields in `CreatePropertyDto` use `@IsOptional()` — confirm `addressLine2`, `state`, `postalCode`, `description` all have `@IsOptional() @IsString() @MaxLength(N)`; fix if missing
- [X] T011 [US2] Verify controller maps optional DTO fields to `null` — confirm `dto.addressLine2 ?? null`, `dto.state ?? null`, `dto.postalCode ?? null`, `dto.description ?? null` in `PropertiesController.create()` call to `execute()`; fix if missing

**Checkpoint**: All 5 required fields enforced. Optional fields are nullable. `tenantId` not present in DTO. Global `ValidationPipe` with `forbidNonWhitelisted: true` rejects unknown fields.

---

## Phase 5: User Story 3 — Unauthenticated or Tenant-less Requests Are Rejected (Priority: P3)

**Goal**: Verify that `POST /properties` uses `@RequiresTenant()` and that `tenantId` is sourced from `@CurrentTenant()` (request context), not from any body/query/header parameter.

**Independent Test**: No `@Public()` on controller or method. `@RequiresTenant()` present on the `create()` method. `@CurrentTenant()` is the only source of `tenantId`.

**Note**: US3 is a security-verification checkpoint on T006. No new files required.

### Implementation for User Story 3

- [X] T012 [US3] Verify `PropertiesController` does NOT have `@Public()` decorator — grep `@Public()` in `apps/api/src/modules/properties/presentation/properties.controller.ts`; confirm zero matches
- [X] T013 [US3] Verify `@RequiresTenant()` is applied to the `create()` method in `PropertiesController` — review the method decorators; fix if missing
- [X] T014 [US3] Verify `tenantId` comes from `@CurrentTenant()` and NOT from `@Body()`, `@Query()`, or `@Param()` — review `PropertiesController.create()` signature; fix if any other source is used
- [X] T015 [US3] Verify `CreatePropertyUseCase.execute()` receives `tenantId` as part of `CreatePropertyInput` from the controller — confirm the use case itself does NOT read HTTP context or parse JWT; review `create-property.use-case.ts`; fix if any HTTP/JWT import present

**Checkpoint**: Auth guard (APP_GUARD) blocks unauthenticated requests. `@RequiresTenant()` blocks tenant-less requests. Controller is the only place `tenantId` is read from context.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Architecture boundary check, build, test, backlog update, and commit.

- [X] T016 [P] Verify no `@prisma/client` import in `application/use-cases/` or `presentation/` — grep `@prisma/client` in both directories; confirm zero matches; fix any violation
- [X] T017 [P] Run `pnpm --filter @leaseKo/api build` — verify TypeScript compiles without errors (`SC-005`)
- [X] T018 [P] Run `pnpm --filter @leaseKo/api test` — verify all 37 existing tests pass (`SC-006`)
- [X] T019 Update `SPRINT-2-BACKLOG.md` — mark `[x]` for these US 8.1 tasks: "Create CreateProperty use case", "Create CreateProperty DTO", "Create POST /properties endpoint", "Add Swagger documentation for create property", "Add validation rules for property creation" — do NOT mark "Add unit tests for CreateProperty use case"
- [X] T020 Update `specs/025-create-property-endpoint/tasks.md` — mark all completed tasks `[X]`
- [X] T021 Commit: `git add apps/api/src/modules/properties/ SPRINT-2-BACKLOG.md specs/025-create-property-endpoint/` then `git commit -m "feat(api): add create property endpoint"`

---

## Dependencies

```
T001 → T003
T002 → T004, T005, T006
T003 → T006, T007
T004 → T006
T005 → T006, T007, T008, T009, T010, T011
T006 → T007, T012, T013, T014, T015
T007 → T016, T017, T018
T017, T018 → T019
T019 → T020
T020 → T021
```

T003, T004, T005 are parallel after T001+T002 complete.
T006 depends on T003, T004, T005.
T007 (module update) depends on T006.
US2 (T008–T011) and US3 (T012–T015) are parallel verification tasks after T007.

---

## Parallel Execution Examples

### Phase 1 — parallel:
```
T001 ║ T002
```

### Phase 3 — after T001+T002:
```
T003 ║ T004 ║ T005  →  T006  →  T007
```

### Phase 4+5 — after T007 (parallel verification):
```
T008 ║ T009 ║ T010 ║ T011 ║ T012 ║ T013 ║ T014 ║ T015
```

### Phase 6 — after verification phases:
```
T016 ║ T017 ║ T018  →  T019  →  T020  →  T021
```

---

## Implementation Strategy

**MVP Scope** (US1 only — T001–T007):
- Creates all 4 new files and updates `PropertiesModule`
- Build passes, tests pass, endpoint is live and documented in Swagger
- Sufficient for manual API testing and next feature (list properties)

**Full scope** (US1 + US2 + US3 + Polish):
- All 21 tasks
- US2 and US3 are lightweight code reviews — minutes if T005+T006 were written correctly
- T016–T021 take ~5 minutes

---

## Task Count Summary

| Phase | Tasks | Story |
|---|---|---|
| Phase 1: Setup | T001–T002 | — |
| Phase 2: Foundational | (none) | — |
| Phase 3: US1 Implementation | T003–T007 | US1 |
| Phase 4: US2 Verification | T008–T011 | US2 |
| Phase 5: US3 Verification | T012–T015 | US3 |
| Phase 6: Polish | T016–T021 | — |
| **Total** | **21 tasks** | |

**Parallel opportunities**: 15 of 21 tasks can run in parallel at their respective phases.

**Suggested MVP**: T001–T007 (Phases 1 + 3). Verification phases (US2, US3) and Polish follow immediately.
