# Tasks: Manage Unit Status Lifecycle

**Input**: Design documents from `specs/035-manage-unit-status/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/update-unit-status.yaml ✅

**Tests**: Required — spec mandates unit test coverage for all 8 transition guard scenarios (SC-005).

**Organization**: Tasks grouped by user story. Pure extension of the existing `units/` module — no new module, no new endpoint, no new repository method.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete [P] tasks in same group)
- **[Story]**: US1 = valid transitions | US2 = invalid transitions | US3 = invalid status values | US4 = inaccessible units
- All file paths are relative to `apps/api/`

---

## Phase 1: Setup

> No new directories or modules required. The `units/` module structure already exists. Proceeding directly to foundational tasks.

---

## Phase 2: Foundational (Schema + Domain Constant)

**Purpose**: Add INACTIVE to the database enum, update the domain type, and create the transition table. All Phase 3+ work depends on these.

- [X] T001 Add `INACTIVE` to the `UnitStatus` enum in `prisma/schema.prisma` — insert `INACTIVE` as the fourth value after `MAINTENANCE`; no other schema changes
- [X] T002 Run `pnpm db:migrate` to generate and apply the migration — migration SQL will contain `ALTER TYPE "UnitStatus" ADD VALUE 'INACTIVE'`; verify the Prisma client is regenerated and `UnitStatus` enum now includes `INACTIVE`
- [X] T003 Add `| 'INACTIVE'` to the `UnitStatus` type in `src/modules/units/domain/entities/unit.entity.ts` — update the exported type: `export type UnitStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'`; no other changes to the file
- [X] T004 Create `src/modules/units/domain/unit-status-transitions.ts` — export `ALLOWED_TRANSITIONS: Record<UnitStatus, UnitStatus[]>` constant: `AVAILABLE: ['OCCUPIED', 'MAINTENANCE', 'INACTIVE']`, `OCCUPIED: ['AVAILABLE', 'MAINTENANCE']`, `MAINTENANCE: ['AVAILABLE', 'INACTIVE']`, `INACTIVE: []`; import `UnitStatus` from `./entities/unit.entity`; no NestJS or Prisma imports

**Checkpoint**: `pnpm typecheck` — `unit.entity.ts` and `unit-status-transitions.ts` must compile; no new type errors.

---

## Phase 3: User Story 1 — Valid Status Transitions (Priority: P1) 🎯 MVP

**Goal**: `PATCH /units/:id` with a valid status transition returns HTTP 200 with the updated unit. Same-status update returns 200 with the unchanged unit (no-op). Non-status field updates bypass the guard entirely.

**Independent Test**: Send `{ "status": "OCCUPIED" }` to a unit currently AVAILABLE — verify 200 with status OCCUPIED and all other fields unchanged. Send `{ "status": "AVAILABLE" }` to the same unit — verify 200.

### Implementation for User Story 1

- [X] T005 [US1] Update `execute()` in `src/modules/units/application/use-cases/update-unit.use-case.ts` — add import for `ALLOWED_TRANSITIONS` from `../../domain/unit-status-transitions`; add import for `UnprocessableEntityException` from `@nestjs/common`; at the start of `execute()`, before calling `update()`: `if (input.data.status !== undefined)` → call `this.units.findById(input.id, input.tenantId)` → if null throw `NotFoundException('Unit not found.')`; if `current.status === input.data.status` return `current` immediately (no-op, skip `update()`); if `!ALLOWED_TRANSITIONS[current.status].includes(input.data.status)` throw `UnprocessableEntityException(\`Unit status cannot transition from \${current.status} to \${input.data.status}.\`)`; after the guard block, `update()` is called as before; `null` result from `update()` still throws `NotFoundException`
- [X] T006 [P] [US1] Add TC-GUARD-1, TC-GUARD-2, TC-GUARD-6, TC-GUARD-7 to `src/modules/units/application/use-cases/update-unit.use-case.spec.ts` — TC-GUARD-1: `findById` returns unit(AVAILABLE), `update` returns unit(OCCUPIED) → use case returns updated unit; TC-GUARD-2: `findById` returns unit(AVAILABLE), status requested also AVAILABLE → use case returns current unit and `update` is NOT called (assert `mockRepo.update` not called); TC-GUARD-6: input has no `status` field (e.g. `{ floorArea: 80 }`) → `findById` is NOT called, `update` is called directly (assert `mockRepo.findById` not called); TC-GUARD-7: `findById` returns unit(MAINTENANCE), `update` returns unit(AVAILABLE + updated monthlyRent) for combined input `{ status: 'AVAILABLE', monthlyRent: 18000 }` → use case returns updated unit with both fields changed

**Checkpoint**: `pnpm --filter @leaseKo/api test` — all 10 scenarios pass (6 original + 4 new TC-GUARD-1/2/6/7).

---

## Phase 4: User Story 2 — Reject Invalid Transitions (Priority: P2)

**Goal**: `PATCH /units/:id` with a disallowed status transition returns HTTP 422 with a message naming the current and requested status. INACTIVE → any status is always rejected. An invalid transition combined with other field changes rejects the entire request.

**Independent Test**: Send `{ "status": "INACTIVE" }` to a unit currently OCCUPIED — verify 422 with message `"Unit status cannot transition from OCCUPIED to INACTIVE."`. Verify the unit record is unchanged.

### Implementation for User Story 2

> All rejection logic is implemented by T005. Phase 4 adds the confirmation test scenarios.

- [X] T007 [US2] Add TC-GUARD-3, TC-GUARD-4, TC-GUARD-8 to `src/modules/units/application/use-cases/update-unit.use-case.spec.ts` — TC-GUARD-3: `findById` returns unit(OCCUPIED), input `{ status: 'INACTIVE' }` → use case throws `UnprocessableEntityException` containing "OCCUPIED" and "INACTIVE"; TC-GUARD-4: `findById` returns unit(INACTIVE), input `{ status: 'AVAILABLE' }` → throws `UnprocessableEntityException` (INACTIVE is terminal — ALLOWED_TRANSITIONS[INACTIVE] is empty); TC-GUARD-8: `findById` returns unit(OCCUPIED), combined input `{ status: 'INACTIVE', monthlyRent: 18000 }` → throws `UnprocessableEntityException` and `update` is NOT called (no partial write)

**Checkpoint**: `pnpm --filter @leaseKo/api test` — all 13 scenarios pass (10 previous + 3 new TC-GUARD-3/4/8).

---

## Phase 5: User Story 3 — Reject Invalid Status Values (Priority: P3)

**Goal**: `PATCH /units/:id` with an unrecognised status string returns HTTP 400 before transition logic runs. `null` status is rejected. Valid values include INACTIVE.

**Independent Test**: Send `{ "status": "RENTED" }` — verify 400. Send `{ "status": "INACTIVE" }` to a valid unit — verify 200 (not 400), confirming INACTIVE is now an accepted value.

### Implementation for User Story 3

- [X] T008 [US3] Update `src/modules/units/presentation/dto/update-unit.dto.ts` — in the `@IsEnum` decorator, replace `['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] satisfies UnitStatus[]` with `['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'] satisfies UnitStatus[]`; update the `@ApiPropertyOptional` `enum` array to include `'INACTIVE'`; update the `example` description to mention all four values; the `status?: UnitStatus` type field will automatically accept INACTIVE after T003

**Checkpoint**: `pnpm typecheck` — `UpdateUnitDto` must compile with INACTIVE in the enum; the `satisfies UnitStatus[]` check must pass.

---

## Phase 6: User Story 4 — Reject Inaccessible Units (Priority: P4)

**Goal**: `PATCH /units/:id` with a status field, for a non-existent or cross-tenant unit, returns HTTP 404 — indistinguishable from the existing not-found behavior.

**Independent Test**: Send `{ "status": "OCCUPIED" }` with a unit ID belonging to a different tenant — verify 404, identical to a non-existent unit.

### Implementation for User Story 4

> The `findById` null check added in T005 already covers this path. Phase 6 adds the confirmation test.

- [X] T009 [US4] Add TC-GUARD-5 to `src/modules/units/application/use-cases/update-unit.use-case.spec.ts` — TC-GUARD-5: `findById` returns null when status is present in input → throws `NotFoundException('Unit not found.')`; write two explicitly separate sub-scenarios (a) non-existent unit and (b) cross-tenant unit, both using `findById → null` — documenting the security invariant that both cases produce identical NotFoundException (same pattern as TC-US4-A/B in the original spec)

**Checkpoint**: `pnpm --filter @leaseKo/api test` — all 14 scenarios pass (13 previous + 1 new TC-GUARD-5 with 2 sub-cases).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T010 [P] Add `@ApiUnprocessableEntityResponse` to the `PATCH ':id'` handler in `src/modules/units/presentation/unit.controller.ts` — import `ApiUnprocessableEntityResponse` from `@nestjs/swagger`; add decorator: `@ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: 'Status transition not permitted by lifecycle rules.' })`; place it after `@ApiConflictResponse` and before `@ApiUnauthorizedResponse`
- [X] T011 [P] Run `pnpm lint` and fix any linting errors in new/modified files
- [X] T012 [P] Run `pnpm typecheck` and confirm no new TypeScript errors beyond the pre-existing TS6059
- [X] T013 Run `pnpm build` and confirm compilation succeeds
- [X] T014 Run `pnpm --filter @leaseKo/api test` and confirm all 14 scenarios pass with no regressions in existing suites

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — start immediately; T001 → T002 → T003 → T004 sequential
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Depends on Phase 3 completion (guard must exist before rejection tests)
- **Phase 5 (US3)**: Depends on T003 (INACTIVE in UnitStatus type)
- **Phase 6 (US4)**: Depends on Phase 3 completion (findById guard path must exist)
- **Phase 7 (Polish)**: Depends on Phases 3–6

### Within Phase 3

T005 and T006 are in the same phase. T006 depends on T005 (tests require the new guard logic to exist). Both are in the same file conceptually, but T006 is marked [P] for documentation accuracy since it edits a spec file while T005 edits the source file — they can proceed simultaneously in practice if a developer writes tests while another writes implementation.

### Parallel Opportunities

```text
Phase 2 — sequential (each step depends on prior):
  T001 → T002 → T003 → T004

Phase 3 — sequential within the phase:
  T005 (implement guard) → T006 (test valid transitions)

Phase 7:
  T010 (Swagger), T011 (lint), T012 (typecheck) — all parallel
```

---

## Implementation Strategy

### MVP First

1. T001–T004: Schema + entity + transition table
2. T005: Transition guard in use case
3. T006: Valid transition tests
4. **VALIDATE**: `pnpm --filter @leaseKo/api test` — 10 scenarios pass
5. T007: Invalid transition tests
6. T008: DTO INACTIVE value
7. T009: Inaccessible unit guard test
8. T010–T014: Polish

### Notes

- `ALLOWED_TRANSITIONS[current.status]` is a direct array lookup — no switch/if chains
- The guard block checks `input.data.status !== undefined`, NOT `input.data.status` (which would be falsy for `null`) — but status cannot be null anyway (not in the type)
- The no-op check (`current.status === input.data.status`) MUST come before the transition check — a same-status "transition" would otherwise be rejected as not being in `ALLOWED_TRANSITIONS[x]` for terminal states
- `UnprocessableEntityException` is from `@nestjs/common` — no custom exception needed
- `toEntity()` in `PrismaUnitRepository` uses `record.status as Unit['status']` — this cast remains valid after INACTIVE is added to both the Prisma enum and the domain type
- Existing TC-US4-A and TC-US4-B tests the case where `update()` itself returns null (no status in input) — TC-GUARD-5 is the complementary case where `findById` returns null (status IS in input)
