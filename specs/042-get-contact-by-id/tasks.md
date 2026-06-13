# Tasks: Get Renter Contact by ID (US 12.3)

**Input**: Design documents from `/specs/042-get-contact-by-id/`
**Branch**: `sprint/003`
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) | **Backlog**: [SPRINT-3-BACKLOG.md](../../SPRINT-3-BACKLOG.md#user-story-123)

## Format: `[ID] [P?] Description`

- All changes are additive to `apps/api/src/modules/contacts/` — no migration, no new DTOs

---

## Phase 1: Repository

- [ ] T001 Add `findById(id: string, tenantId: string): Promise<TenantContact | null>` to `TenantContactRepository` interface in `apps/api/src/modules/contacts/application/repositories/tenant-contact.repository.ts`
- [ ] T002 Implement `findById` in `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.ts` (use `prisma.tenantContact.findFirst` with `id`, `tenantFilter(tenantId)`, and `deletedAt: null`; return `null` when not found)

---

## Phase 2: Use Case & Presentation

- [ ] T003 [P] Create `apps/api/src/modules/contacts/application/use-cases/get-tenant-contact-by-id.use-case.ts` (`GetTenantContactByIdUseCase` with `execute({ id, tenantId })`: calls `findById`, throws `NotFoundException('Contact not found.')` if null, returns entity)
- [ ] T004 [P] Add `GET /:id` route to `apps/api/src/modules/contacts/presentation/contacts.controller.ts` (`@Get(':id') @HttpCode(200) @RequiresTenant()` with `@Param('id') id` and `@CurrentTenant() tenantId`; delegates to `GetTenantContactByIdUseCase`; returns `TenantContactResponseDto.fromDomain(contact)`; full Swagger: `@ApiParam`, `@ApiOkResponse`, `@ApiNotFoundResponse`)
- [ ] T005 Register `GetTenantContactByIdUseCase` in `apps/api/src/modules/contacts/contacts.module.ts`

---

## Phase 3: Tests

- [ ] T006 [P] Write unit tests in `apps/api/src/modules/contacts/application/use-cases/get-tenant-contact-by-id.use-case.spec.ts` (found → returns entity; not found → NotFoundException with message "Contact not found."; calls findById with correct id and tenantId)
- [ ] T007 [P] Extend `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.spec.ts` with `findById` tests (returns entity when found; returns null for unknown id; returns null for cross-tenant id; returns null for archived contact)
- [ ] T008 Extend `apps/api/test/contacts.e2e-spec.ts` with `GET /api/v1/contacts/:id` tests (200 with full contact; 404 for non-existent id; 404 for cross-tenant id; 404 for archived contact; 404 for malformed id)
- [ ] T009 Add `findById: jest.fn()` to existing mock repos in `create-tenant-contact.use-case.spec.ts` and `list-tenant-contacts.use-case.spec.ts`

---

## Dependencies

- T001 before T002 (implements the interface method)
- T001 before T003 (use case depends on interface)
- T003 + T004 can run in parallel after T001
- T005 after T003
- T006 after T003; T007 after T002; T008 after T004 + T005
- T009 is a quick fix — can run at any point during Phase 3
