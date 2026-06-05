# Tasks: Archive Property

**Input**: Design documents from `specs/030-archive-property/`
**Prerequisites**: plan.md âœ“, spec.md âœ“, research.md âœ“, data-model.md âœ“, contracts/delete-property.md âœ“

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1=Archive Active Property, US2=Cross-Tenant 404, US3=Idempotent Re-Archive, US4=Archived Invisible Across Queries
- File paths are relative to `apps/api/src/modules/properties/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**No new repository methods, types, DTOs, or migrations required.**
- `softDelete(id, tenantId): Promise<boolean>` already exists and is already implemented.
- `deletedAt` field and all read-query filtering already exist.
- Idempotent re-archive (US3) works by construction from the existing `softDelete` implementation â€” no code changes needed.

**Checkpoint**: All existing 63 tests must continue to pass throughout implementation.

---

## Phase 2: User Story 1 + 2 + 3 + 4 â€” Archive, Isolation, Idempotency, Invisibility (Priority: P1/P2) ðŸŽ¯ MVP

**Goal**: An authenticated landlord can archive any of their properties. The archived property immediately becomes invisible to all reads and updates. A cross-tenant archive attempt returns 404 identical to a non-existent property. Re-archiving always returns 204 (idempotent). All four user stories are delivered by the same 4 implementation tasks.

**Independent Test**: Run `pnpm --filter @leaseKo/api test` and confirm all `ArchivePropertyUseCase` tests pass. Call `DELETE /properties/:id` via Swagger, then call `GET /properties` and `GET /properties/:id` â€” the archived property must be absent from both.

### Implementation for US1 + US2 + US3 + US4

- [x] T001 [US1] [US2] [US3] Create `ArchivePropertyUseCase` in `application/use-cases/archive-property.use-case.ts` â€” inject `PROPERTY_REPOSITORY`; `execute({ id, tenantId }): Promise<void>` calls `this.properties.softDelete(id, tenantId)` and throws `NotFoundException('Property not found.')` when result is `false`; returns `void` on success (covers both active and already-archived cases since `softDelete` returns `true` for both)
- [x] T002 [P] [US1] [US2] [US3] [US4] Add `DELETE /properties/:id` handler to `presentation/properties.controller.ts` â€” import `Delete` from `@nestjs/common`; import `ApiNoContentResponse` from `@nestjs/swagger`; import `ArchivePropertyUseCase`; inject `ArchivePropertyUseCase` in constructor; add `@Delete(':id')` handler after `@Patch(':id')` with `@HttpCode(HttpStatus.NO_CONTENT)`, `@RequiresTenant()`, `@Param('id') id: string`, `@CurrentTenant() tenantId: string`; return type `Promise<void>`; call `await this.archiveProperty.execute({ id, tenantId })` with no return value; full Swagger: `@ApiOperation`, `@ApiParam`, `@ApiNoContentResponse`, `@ApiNotFoundResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse` (depends on T001)
- [x] T003 [P] [US1] [US2] [US3] Register `ArchivePropertyUseCase` in `providers` array of `properties.module.ts` and add import at top of file (depends on T001)

### Tests for US1 + US2 + US3 + US4

- [x] T004 [P] [US1] [US2] [US3] Create `application/use-cases/archive-property.use-case.spec.ts` with 5 test cases:
  1. Returns void when `softDelete` returns `true` â€” active property case (TC1 â€” US1 happy path)
  2. Returns void when `softDelete` returns `true` â€” already-archived case, same code path, documented separately (TC2 â€” US3 idempotency guarantee)
  3. Throws `NotFoundException` when `softDelete` returns `false` â€” not-found case (TC3 â€” US2 / FR-006)
  4. Throws `NotFoundException` when `softDelete` returns `false` â€” cross-tenant case, same code path, documented separately (TC4 â€” US2 / FR-007)
  5. Propagates unexpected repository errors without swallowing (TC5 â€” error handling)
  Also verify: `softDelete` called with exact `id` and `tenantId`; no other repository method called.
  (depends on T001)

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` â€” all 63 existing + 5+ new `ArchivePropertyUseCase` tests must pass. Call `DELETE /properties/:id` â†’ 204. Then call `GET /properties/:id` â†’ 404.

---

## Phase 3: User Story 4 â€” Archived Properties Invisible Across All Queries (Priority: P1)

**Goal**: US4 is satisfied by construction â€” all existing read operations already filter `deletedAt`. Verify explicitly via the manual test in quickstart.md.

- [x] T005 [US4] Verify post-archive invisibility: confirm `GET /properties` excludes the archived property, `GET /properties/:id` returns 404, and `PATCH /properties/:id` returns 404 â€” all enforced by existing read-query filters; no code changes needed (verification only)

**Checkpoint**: US4 satisfied by existing infrastructure â€” archived property is invisible system-wide immediately after T001â€“T004.

---

## Final Phase: Polish & Validation

- [x] T006 Run `pnpm lint` â€” fix any ESLint errors in new/modified files
- [x] T007 [P] Run `pnpm typecheck` â€” fix any TypeScript errors
- [x] T008 Run `pnpm build` â€” confirm API and web build successfully
- [x] T009 Run `pnpm --filter @leaseKo/api test` â€” confirm all 68+ tests pass
- [x] T010 Update `SPRINT-2-BACKLOG.md` â€” mark User Story 8.5 tasks as `[x]` only after T006â€“T009 all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2**: No blocking prerequisites â€” T001 can start immediately
- **Phase 3 (US4)**: Depends on T001â€“T004 complete â€” verification only
- **Final Phase**: Depends on all Phase 2 tasks complete

### Within Phase 2

- **T001**: Start immediately â€” no dependencies
- **T002, T003, T004**: All depend on T001 (use case must exist before controller imports it, module registers it, tests import it); run in parallel once T001 is complete
- **T006, T007**: Run simultaneously in Final Phase

### Parallel Opportunities

- T002 + T003 + T004: simultaneously after T001 (different files)
- T006 + T007: simultaneously in Final Phase

---

## Parallel Execution Example: Phase 2

```
# Step 1 (sequential â€” must complete first):
T001: Create archive-property.use-case.ts

# Step 2 (parallel â€” all different files):
T002: Add DELETE :id to properties.controller.ts
T003: Register use case in properties.module.ts
T004: Write archive-property.use-case.spec.ts
```

---

## Implementation Strategy

### MVP (T001â€“T004 â€” delivers all four user stories)

All four user stories (US1, US2, US3, US4) are delivered by T001â€“T004. US4 works by construction â€” no additional code. US3 (idempotency) is built into the existing `softDelete` implementation â€” no additional code. The MVP is the entire feature.

### Full Delivery

T001 â†’ (T002 + T003 + T004 parallel) â†’ T005 verify â†’ T006â€“T010

---

## Notes

- TC1 and TC2 in T004 use the same mock setup (`mockResolvedValueOnce(true)`) â€” documented as separate tests to prove the idempotency guarantee by design
- TC3 and TC4 in T004 use the same mock setup (`mockResolvedValueOnce(false)`) â€” documented as separate tests to prove the cross-tenant security invariant
- The `@Delete(':id')` handler must appear after `@Patch(':id')` in the controller class body â€” ordering by operation type (GET, GET:id, PATCH:id, DELETE:id, POST) is the cleanest convention
- The known pending concern (unit cascade) is documented in the plan's Complexity Tracking section and must be addressed in Epic 9 before unit listing is released
- Do not update `SPRINT-2-BACKLOG.md` until T006â€“T009 all pass
