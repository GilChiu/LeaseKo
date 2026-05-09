# Tasks: Property Domain & Repository Layer

**Input**: Design documents from `specs/024-property-repository-layer/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅
**Branch**: `feature/property-repository-layer`
**Tests**: Not explicitly requested — no test tasks generated (domain entity is a plain interface with no testable logic; integration tests deferred to CreateProperty use-case task)

**Organization**: Tasks are grouped by user story. US1 (repository interface + implementation) is the MVP. US2 (tenant-safety) and US3 (soft-delete filtering) are implemented as part of the same files — no separate implementation files needed; they are acceptance-criteria checkpoints on the US1 files.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story label (US1, US2, US3)
- Exact file paths included in every task

---

## Phase 1: Setup

**Purpose**: Create the `properties` module folder structure before any source files are authored.

- [X] T001 Create `apps/api/src/modules/properties/domain/entities/` directory
- [X] T002 [P] Create `apps/api/src/modules/properties/application/repositories/` directory
- [X] T003 [P] Create `apps/api/src/modules/properties/application/types/` directory
- [X] T004 [P] Create `apps/api/src/modules/properties/infrastructure/repositories/` directory

**Checkpoint**: Folder structure exists — file creation can now begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `Property` domain entity must exist before the repository interface or infrastructure can be written — it is the return type used across all three layers.

**⚠️ CRITICAL**: T005 must be complete before T006 and T007 can begin

- [X] T005 Create `Property` domain entity interface (no Prisma, no NestJS) in `apps/api/src/modules/properties/domain/entities/property.entity.ts`

**Checkpoint**: `Property` interface is defined — repository interface and implementation can now be authored

---

## Phase 3: User Story 1 — Application Code Can Read and Create Properties via a Typed Interface (Priority: P1) 🎯 MVP

**Goal**: Deliver the `PropertyRepository` interface + `PROPERTY_REPOSITORY` DI token + `PrismaPropertyRepository` implementation + `PropertiesModule` wiring + `AppModule` registration so any future use case can inject a typed, mockable repository.

**Independent Test**: Start the NestJS application — no `UnknownDependenciesException`. Build exits with code 0. All 37 existing tests still pass.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `CreatePropertyInput` and `UpdatePropertyInput` types in `apps/api/src/modules/properties/application/types/property-repository.types.ts`
- [X] T007 [P] [US1] Create `PROPERTY_REPOSITORY` symbol token and `PropertyRepository` interface in `apps/api/src/modules/properties/application/repositories/property.repository.ts` — import `Property` from `property.entity.ts`; declare `create`, `findManyByTenant`, `findById`, `update`, `softDelete` methods; no Prisma import
- [X] T008 [US1] Create `PrismaPropertyRepository` in `apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts` — `@Injectable()`, inject `PrismaService`, use `tenantFilter()` in every tenant-scoped query, include inline private `toEntity()` mapper, catch `P2025` in `update` and `softDelete` returning `null`/`false`
- [X] T009 [US1] Create `PropertiesModule` in `apps/api/src/modules/properties/properties.module.ts` — bind `PROPERTY_REPOSITORY` to `PrismaPropertyRepository`, export `PROPERTY_REPOSITORY`; no `DatabaseModule` import needed (PrismaService is `@Global`)
- [X] T010 [US1] Register `PropertiesModule` in `apps/api/src/app.module.ts` — add to `imports` array alongside existing feature modules

**Checkpoint**: `pnpm --filter @leaseKo/api build` exits 0. `pnpm --filter @leaseKo/api test` shows 37/37 pass. Application starts without DI errors.

---

## Phase 4: User Story 2 — Property Data Access is Tenant-Safe by Default (Priority: P2)

**Goal**: Verify that `tenantFilter()` is applied in every repository query and that a cross-tenant `findById` call returns `null`.

**Independent Test**: Call `findById(propertyId, wrongTenantId)` where the property exists under a different tenant — result must be `null`. No property may be returned without matching `tenantId`.

**Note**: US2 is a correctness-verification checkpoint on T008. The implementation is part of `PrismaPropertyRepository` (already written in T008). This phase verifies the acceptance criteria are met and documents any gaps.

### Implementation for User Story 2

- [X] T011 [US2] Verify `PrismaPropertyRepository.findManyByTenant()` uses `tenantFilter(tenantId)` and `deletedAt: null` in the Prisma `where` clause — review `apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts`; fix if missing
- [X] T012 [US2] Verify `PrismaPropertyRepository.findById()` uses both `id`, `tenantFilter(tenantId)`, and `deletedAt: null` in a `findFirst` call — review same file; fix if missing
- [X] T013 [US2] Verify `PrismaPropertyRepository.update()` uses `{ id, tenantId }` compound filter and catches `P2025` returning `null` — review same file; fix if missing
- [X] T014 [US2] Verify `PrismaPropertyRepository.softDelete()` uses `{ id, tenantId }` compound filter and catches `P2025` returning `false` — review same file; fix if missing

**Checkpoint**: No repository method can query or mutate a Property by `id` alone. `tenantId` is required in every Prisma `where` clause.

---

## Phase 5: User Story 3 — Soft-Deleted Properties Excluded from Normal Reads (Priority: P3)

**Goal**: Verify that `deletedAt: null` is present in `findManyByTenant` and `findById` queries — soft-deleted properties are invisible by default.

**Independent Test**: A property with `deletedAt` set must not appear in `findManyByTenant` results. `findById` for a soft-deleted record must return `null`.

**Note**: US3 is also a correctness-verification checkpoint on T008. No new files are required.

### Implementation for User Story 3

- [X] T015 [US3] Confirm `deletedAt: null` filter is present in the `findManyByTenant` Prisma where clause in `apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts`
- [X] T016 [US3] Confirm `deletedAt: null` filter is present in the `findById` Prisma where clause in the same file
- [X] T017 [US3] Grep `@prisma/client` across `apps/api/src/modules/properties/domain/` and `apps/api/src/modules/properties/application/` — confirm zero matches; fix any violation (e.g., remove Prisma import, replace with plain TypeScript type)

**Checkpoint**: `SC-003` from spec satisfied — no Prisma imports in domain or application layers. `SC-005` and `SC-006` confirmed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final build + test validation and backlog update before commit.

- [X] T018 [P] Run `pnpm --filter @leaseKo/api build` — verify TypeScript compiles without errors (`SC-001`)
- [X] T019 [P] Run `pnpm --filter @leaseKo/api test` — verify all 37 existing tests pass (`SC-002`)
- [X] T020 Update `SPRINT-2-BACKLOG.md` — mark `[x]` for: "Define Property domain entity", "Define Property repository interface", "Implement PrismaPropertyRepository" under US 8.1
- [X] T021 Commit: `git add apps/api/src/modules/properties/ apps/api/src/app.module.ts SPRINT-2-BACKLOG.md` then `git commit -m "feat(api): add property repository layer"`

---

## Dependencies

```
T001 → T005
T002 → T006, T007
T003 → T006
T004 → T008
T005 → T006, T007, T008
T006 → T008
T007 → T008, T009
T008 → T009, T011, T012, T013, T014, T015, T016, T017
T009 → T010
T010 → T018, T019
T018, T019 → T020
T020 → T021
```

**US1 must complete before US2 and US3 verification tasks.**
US2 (T011–T014) and US3 (T015–T017) can run in parallel after T008.

---

## Parallel Execution Examples

### Phase 1 — all in parallel after checkout:
```
T001 ║ T002 ║ T003 ║ T004
```

### Phase 3 — after T005 completes:
```
T006 ║ T007  →  T008  →  T009  →  T010
```

### Phase 4+5 — after T008 completes (parallel verification):
```
T011 ║ T012 ║ T013 ║ T014 ║ T015 ║ T016 ║ T017
```

### Phase 6 — after T010 completes:
```
T018 ║ T019  →  T020  →  T021
```

---

## Implementation Strategy

**MVP Scope** (US1 only — minimum for the next feature to proceed):
- T001–T010: Create all 5 new files and register `PropertiesModule` in `AppModule`
- Verify build and tests pass
- This is sufficient for the next task (CreateProperty use case) to begin

**Full scope** (US1 + US2 + US3):
- All 21 tasks
- US2 and US3 are low-effort reviews of the code written in T008 — they take minutes if T008 was written correctly

---

## Task Count Summary

| Phase | Tasks | Story |
|---|---|---|
| Phase 1: Setup | T001–T004 | — |
| Phase 2: Foundational | T005 | — |
| Phase 3: US1 Implementation | T006–T010 | US1 |
| Phase 4: US2 Verification | T011–T014 | US2 |
| Phase 5: US3 Verification | T015–T017 | US3 |
| Phase 6: Polish | T018–T021 | — |
| **Total** | **21 tasks** | |

**Parallel opportunities**: 14 of 21 tasks can run in parallel (marked `[P]` or identified in execution examples above).

**Suggested MVP**: Complete Phase 1 through Phase 3 (T001–T010). Verification phases (US2, US3) are lightweight and should follow immediately after — they are "check what we wrote" tasks, not "write more code" tasks.
