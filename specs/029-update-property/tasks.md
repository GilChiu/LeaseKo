# Tasks: Update Property

**Input**: Design documents from `specs/029-update-property/`
**Prerequisites**: plan.md âœ“, spec.md âœ“, research.md âœ“, data-model.md âœ“, contracts/patch-property.md âœ“

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = Correct Property Information, US2 = Cross-Tenant 404, US3 = Empty Payload Rejection
- File paths are relative to `apps/api/src/modules/properties/`

---

## Phase 1: Foundational (Blocking Prerequisites)

**No new repository methods, types, or migrations required.** `update(id, tenantId, input)` and `UpdatePropertyInput` already exist.

**Checkpoint**: All existing 57 tests must continue to pass throughout implementation.

---

## Phase 2: User Story 1 + 2 â€” Partial Update & Tenant Isolation (Priority: P1) ðŸŽ¯ MVP

**Goal**: An authenticated landlord can update one or more property fields. The update is scoped strictly to their tenant â€” a valid ID belonging to another tenant returns 404, identical to a non-existent property.

**Independent Test**: Run `pnpm --filter @leaseKo/api test` and confirm all `UpdatePropertyUseCase` tests pass. Send `PATCH /properties/:id` via Swagger with `{ "name": "Updated" }` and confirm 200 with the updated property.

### Implementation for US1 + US2

- [x] T001 [P] [US1] [US2] Create `UpdatePropertyDto` in `presentation/dto/update-property.dto.ts` â€” define `AtLeastOnePropertyFieldConstraint` class (implements `ValidatorConstraintInterface`, checks that at least one of the 9 field names is not `undefined` on `args.object`); apply `@Validate(AtLeastOnePropertyFieldConstraint)` at class level; all 9 fields (`name`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`, `propertyType`, `description`) with `@IsOptional()`, `@IsString()`, `@MaxLength(N)` â€” use same lengths as `CreatePropertyDto`; import `Validate`, `ValidatorConstraint`, `ValidatorConstraintInterface`, `ValidationArguments` from `class-validator`
- [x] T002 [P] [US1] [US2] Create `UpdatePropertyUseCase` in `application/use-cases/update-property.use-case.ts` â€” inject `PROPERTY_REPOSITORY`; `execute({ id, tenantId, data: UpdatePropertyInput })` calls `this.properties.update(id, tenantId, data)` and throws `NotFoundException('Property not found.')` when result is `null`; returns `Property` on success; import `NotFoundException` from `@nestjs/common`

- [x] T003 [US1] [US2] Add `PATCH /properties/:id` handler to `presentation/properties.controller.ts` â€” import `Patch` from `@nestjs/common`; import `UpdatePropertyUseCase` and `UpdatePropertyDto`; inject `UpdatePropertyUseCase` in constructor; add `@Patch(':id')` handler after `@Get(':id')` with `@RequiresTenant()`, `@Param('id') id: string`, `@Body() dto: UpdatePropertyDto`, `@CurrentTenant() tenantId: string`; execute `updateProperty.execute({ id, tenantId, data: { ...dto } })`; return `PropertyResponseDto.fromDomain(updated)`; full Swagger: `@ApiOperation`, `@ApiParam`, `@ApiOkResponse(type: PropertyResponseDto)`, `@ApiNotFoundResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse` (depends on T001, T002)
- [x] T004 [P] [US1] [US2] Register `UpdatePropertyUseCase` in `providers` array of `properties.module.ts` and add import at top of file (depends on T002)

### Tests for US1 + US2

- [x] T005 [P] [US1] [US2] Create `application/use-cases/update-property.use-case.spec.ts` with 6 test cases:
  1. Returns the updated `Property` when `update()` resolves a record (TC1 â€” happy path)
  2. Throws `NotFoundException` when `update()` returns `null` â€” not-found case (TC2 â€” FR-001)
  3. Throws `NotFoundException` when `update()` returns `null` â€” cross-tenant case, same code path, explicitly documented (TC3 â€” FR-004 + FR-005)
  4. Calls `update()` with exact `id`, `tenantId`, and `data` object from input (TC4 â€” constitution)
  5. Does not call any other repository method (TC5 â€” single responsibility)
  6. Propagates unexpected repository errors without swallowing (TC6 â€” error handling)
  (depends on T002)

**Checkpoint**: Run `pnpm --filter @leaseKo/api test` â€” all 57 existing + 6 new `UpdatePropertyUseCase` tests must pass (total 63).

---

## Phase 3: User Story 3 â€” Empty Payload Rejection (Priority: P2)

**Goal**: A PATCH request with no recognized fields in the body returns `400` with a validation error â€” the use case is never called.

**Independent Test**: Send `PATCH /properties/:id` with body `{}` and confirm `400` response with "At least one field must be provided".

- [x] T006 [US3] Verify `UpdatePropertyDto` (written in T001) has `@Validate(AtLeastOnePropertyFieldConstraint)` at class level â€” confirm the constraint checks all 9 field names and returns `false` when all are `undefined`; this is the rejection mechanism for empty payloads (no new code â€” verify T001 is correct)

**Checkpoint**: Send `{}` body in Swagger â†’ expect `400`. Send `{ "tenantId": "other" }` â†’ expect `400` (unknown field rejected by global `ValidationPipe`).

---

## Final Phase: Polish & Validation

- [x] T007 Run `pnpm lint` â€” fix any ESLint errors in new/modified files
- [x] T008 [P] Run `pnpm typecheck` â€” fix any TypeScript errors
- [x] T009 Run `pnpm build` â€” confirm API and web build successfully
- [x] T010 Run `pnpm --filter @leaseKo/api test` â€” confirm all 63 tests pass
- [x] T011 Update `SPRINT-2-BACKLOG.md` â€” mark User Story 8.4 tasks as `[x]` only after T007â€“T010 all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (US1+US2)**: No blocking prerequisites â€” T001 and T002 can start immediately in parallel
- **Phase 3 (US3)**: Depends on T001 being correct (verification only)
- **Final Phase**: Depends on all Phase 2 tasks complete

### Within Phase 2

- **T001, T002**: Fully independent â€” different files, start simultaneously
- **T003**: Depends on T001 (needs `UpdatePropertyDto` imported) AND T002 (needs `UpdatePropertyUseCase` imported)
- **T004**: Depends on T002 only â€” can run in parallel with T003 and T005
- **T005**: Depends on T002 only â€” can run in parallel with T003 and T004

### Parallel Opportunities

- **T001 + T002**: Start together (DTO vs use case â€” different files, different layers)
- **T003 + T004 + T005**: After T001 and T002 complete, all three run simultaneously
- **T007 + T008**: lint and typecheck simultaneously

---

## Parallel Execution Example: Phase 2

```
# Step 1 (parallel â€” different layers, no cross-dependencies):
T001: Create update-property.dto.ts
T002: Create update-property.use-case.ts

# Step 2 (parallel â€” after T001 + T002 complete):
T003: Add PATCH :id to properties.controller.ts
T004: Register use case in properties.module.ts
T005: Write update-property.use-case.spec.ts
```

---

## Implementation Strategy

### MVP (Phase 2 only â€” delivers US1 + US2)

Both P1 user stories (successful update + tenant isolation) are delivered by T001â€“T005. US3 (empty payload) is delivered by the `@Validate` constraint in T001 â€” no separate implementation.

### Full Delivery

T001 â†’ T002 â†’ (T003 + T004 + T005 parallel) â†’ T006 verify â†’ T007â€“T011

---

## Notes

- T001 is the most complex task â€” `UpdatePropertyDto` requires both field-level and class-level validators
- T003 must import `Patch` from `@nestjs/common` alongside the existing `Get`, `Post`, `Param` imports
- TC3 in T005 uses the same `mockResolvedValueOnce(null)` as TC2 â€” intentionally documented separately to prove the security invariant
- `{ ...dto }` spread in the controller ensures only defined fields are passed to the use case (undefined fields are not included in object spread)
- Do not update `SPRINT-2-BACKLOG.md` until T007â€“T010 all pass
