# Tasks: Update Renter Contact API (US 12.4)

**Branch**: `sprint/003` | **Backlog**: [SPRINT-3-BACKLOG.md](../../SPRINT-3-BACKLOG.md#user-story-124)

---

## Phase 1: Types & Repository Interface

- [ ] T001 Add `UpdateTenantContactInput` interface to `apps/api/src/modules/contacts/application/types/tenant-contact-repository.types.ts` (all fields optional: firstName?, lastName?, email?, phone?, idNumber?, notes?)
- [ ] T002 Add `update(id: string, tenantId: string, data: UpdateTenantContactInput): Promise<TenantContact | null>` to `TenantContactRepository` interface in `apps/api/src/modules/contacts/application/repositories/tenant-contact.repository.ts`

---

## Phase 2: Application & Infrastructure

- [ ] T003 [P] Create `apps/api/src/modules/contacts/application/use-cases/update-tenant-contact.use-case.ts` (1. empty-check → BadRequestException; 2. findById → NotFoundException if null; 3. if email: normalize, findByEmail, ConflictException if found & different id; 4. build patchData with only defined fields; 5. call update → return entity)
- [ ] T004 [P] Implement `update` in `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.ts` (prisma.tenantContact.update with `where: { id, tenantId }`; catch P2025 → return null; also import `PrismaClientKnownRequestError`)

---

## Phase 3: Presentation

- [ ] T005 [P] Create `apps/api/src/modules/contacts/presentation/dto/update-tenant-contact.dto.ts` (all 6 fields optional; `@IsOptional` + validators matching create DTO max lengths; no `tenantId`; `@ApiPropertyOptional` on all)
- [ ] T006 Add `PATCH /:id` route to `apps/api/src/modules/contacts/presentation/contacts.controller.ts` (`@Patch(':id') @HttpCode(200) @RequiresTenant()`; inject `UpdateTenantContactUseCase`; full Swagger: `@ApiParam`, `@ApiOkResponse`, `@ApiBadRequestResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`)
- [ ] T007 Register `UpdateTenantContactUseCase` in `apps/api/src/modules/contacts/contacts.module.ts`

---

## Phase 4: Tests

- [ ] T008 [P] Write unit tests in `apps/api/src/modules/contacts/application/use-cases/update-tenant-contact.use-case.spec.ts` (partial update; empty body → BadRequestException; not found → NotFoundException; email self-match → no conflict; email conflict different contact → ConflictException; successful full update)
- [ ] T009 [P] Extend `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.spec.ts` with `update` tests (partial update persists only changed fields; cross-tenant update returns null; archived contact update returns null)
- [ ] T010 Extend `apps/api/test/contacts.e2e-spec.ts` with PATCH tests (200 partial update; 200 full update; 400 empty body; 400 blank firstName; 409 email conflict; 200 self-email; 404 non-existent; 404 cross-tenant; 404 archived)
- [ ] T011 Add `update: jest.fn()` to all existing mock repos in use case spec files (create, list, get-by-id specs)

---

## Dependencies

- T001 before T002; T002 before T003 + T004
- T003 + T004 parallel after T002
- T005 parallel with T003/T004
- T006 after T003 + T005; T007 after T003
- T008 after T003; T009 after T004; T010 after T006 + T007
- T011 at any point during Phase 4
