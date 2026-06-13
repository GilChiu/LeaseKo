# Tasks: List Renter Contacts API (US 12.2)

**Input**: Design documents from `/specs/041-list-contacts-api/`
**Branch**: `sprint/003`
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) | **Backlog**: [SPRINT-3-BACKLOG.md](../../SPRINT-3-BACKLOG.md#user-story-122)

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- All changes are additive to `apps/api/src/modules/contacts/` — no new module, no migration

---

## Phase 1: Extend Types & Repository Interface

- [x] T001 Add `FindPagedByTenantOptions` and `PagedTenantContacts` interfaces to `apps/api/src/modules/contacts/application/types/tenant-contact-repository.types.ts` (import `TenantContact` from domain entity)
- [x] T002 Add `findPagedByTenant(tenantId: string, options: FindPagedByTenantOptions): Promise<PagedTenantContacts>` method to `TenantContactRepository` interface in `apps/api/src/modules/contacts/application/repositories/tenant-contact.repository.ts`

---

## Phase 2: Application & Infrastructure Layer

- [x] T003 [P] Create `apps/api/src/modules/contacts/application/use-cases/list-tenant-contacts.use-case.ts` (`ListTenantContactsUseCase` with `execute({ tenantId, page, limit })` delegating to `contacts.findPagedByTenant`)
- [x] T004 [P] Implement `findPagedByTenant` in `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.ts` (use `$transaction([findMany, count])` with `tenantFilter()`, `deletedAt: null`, `orderBy: { createdAt: 'desc' }`, offset-based skip/take)

---

## Phase 3: Presentation Layer

- [x] T005 [P] Create `apps/api/src/modules/contacts/presentation/dto/list-contacts-query.dto.ts` (`ListContactsQueryDto` with `page` default 1 min 1, `limit` default 20 min 1 max 100; `@Type(() => Number)` + `@IsInt` + `@Min`/`@Max`; `@ApiPropertyOptional` decorators)
- [x] T006 [P] Create `apps/api/src/modules/contacts/presentation/dto/paginated-tenant-contacts-response.dto.ts` (`PaginatedTenantContactsResponseDto` with `items: TenantContactResponseDto[]`, `total`, `page`, `limit`; `static fromDomain(result, page, limit)`; `@ApiProperty` decorators)
- [x] T007 Add `GET /` route to `apps/api/src/modules/contacts/presentation/contacts.controller.ts` (`@Get() @HttpCode(200) @RequiresTenant()` with `@CurrentTenant() tenantId` and `@Query() query: ListContactsQueryDto`; full Swagger decorators including `@ApiOkResponse`, `@ApiQuery` for page and limit; inject `ListTenantContactsUseCase` in constructor)
- [x] T008 Register `ListTenantContactsUseCase` as a provider in `apps/api/src/modules/contacts/contacts.module.ts`

---

## Phase 4: Tests

- [x] T009 [P] Write unit tests in `apps/api/src/modules/contacts/application/use-cases/list-tenant-contacts.use-case.spec.ts` (happy path returns paged result; delegates to `findPagedByTenant` with correct args; empty result returns `{ items: [], total: 0 }`; propagates repository errors)
- [x] T010 [P] Extend integration test file `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.spec.ts` with `findPagedByTenant` tests (returns items and correct total; excludes archived contacts; pagination offset is correct — page 2 skips page 1 items; empty workspace returns `{ items: [], total: 0 }`)
- [x] T011 Extend E2E test file `apps/api/test/contacts.e2e-spec.ts` with `GET /api/v1/contacts` tests (200 with items and total; empty workspace returns `{ items: [], total: 0 }`; page beyond last returns `{ items: [], total: N }`; archived contacts excluded from results and total; `?page=0` returns 400; `?limit=101` returns 400; `?tenantId=other` ignored — results scoped to session)

---

## Dependencies

- T001 must complete before T002 (interface uses the new types)
- T002 must complete before T003 and T004 (both depend on the updated interface)
- T003 + T004 can run in parallel after T002
- T005 + T006 can run in parallel (different files, no inter-dependency)
- T007 depends on T005 + T006 + T003 (controller imports all three)
- T008 depends on T003 (registers the use case)
- T009 can start once T003 is done
- T010 can start once T004 is done
- T011 requires T007 + T008 complete (tests the full endpoint)
