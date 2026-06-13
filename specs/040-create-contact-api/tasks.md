# Tasks: Create Renter Contact API (US 12.1)

**Input**: Design documents from `/specs/040-create-contact-api/`
**Branch**: `sprint/003`
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) | **Backlog**: [SPRINT-3-BACKLOG.md](../../SPRINT-3-BACKLOG.md#user-story-121)

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)

---

## Phase 1: Schema & Migration

- [x] T001 Add `TenantContact` model to `apps/api/prisma/schema.prisma` (fields: id, tenantId, firstName, lastName, email, phone, idNumber, notes, deletedAt, createdAt, updatedAt; `@@unique([tenantId, email])`, `@@index([tenantId])`, `@@index([tenantId, deletedAt])`; add `contacts TenantContact[]` relation to `Tenant` model)
- [x] T002 Run `pnpm db:migrate` and name the migration `create_tenant_contacts`

---

## Phase 2: Domain & Application Layer

- [x] T003 [P] Create `apps/api/src/modules/contacts/domain/entities/tenant-contact.entity.ts` (pure TS interface — no imports)
- [x] T004 [P] Create `apps/api/src/modules/contacts/application/types/tenant-contact-repository.types.ts` (`CreateTenantContactInput` interface)
- [x] T005 Create `apps/api/src/modules/contacts/application/repositories/tenant-contact.repository.ts` (`TENANT_CONTACT_REPOSITORY` symbol + `TenantContactRepository` interface with `create` and `findByEmail`)
- [x] T006 Create `apps/api/src/modules/contacts/application/use-cases/create-tenant-contact.use-case.ts` (normalize email to lowercase; call `findByEmail`; throw `ConflictException` on duplicate; call `create`; return entity)

---

## Phase 3: Infrastructure Layer

- [x] T007 Create `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.ts` (`PrismaTenantContactRepository` — `create` and `findByEmail` with `tenantFilter()` and `deletedAt: null`; `toEntity()` mapper)

---

## Phase 4: Presentation Layer

- [x] T008 [P] Create `apps/api/src/modules/contacts/presentation/dto/create-tenant-contact.dto.ts` (`@IsString @IsNotEmpty @MaxLength(100)` for firstName/lastName; `@IsEmail @MaxLength(255)` for email; `@IsOptional` for phone/idNumber/notes; no `tenantId` field; `@ApiProperty` decorators)
- [x] T009 [P] Create `apps/api/src/modules/contacts/presentation/dto/tenant-contact-response.dto.ts` (all fields except `deletedAt`; `static fromDomain()`; `@ApiProperty` decorators)
- [x] T010 Create `apps/api/src/modules/contacts/presentation/contacts.controller.ts` (`POST /contacts` with `@HttpCode(201) @RequiresTenant()`; `@CurrentTenant() tenantId`; delegates to use case; returns response DTO; full Swagger decorators)
- [x] T011 Create `apps/api/src/modules/contacts/contacts.module.ts` (bind `TENANT_CONTACT_REPOSITORY → PrismaTenantContactRepository`; provide `CreateTenantContactUseCase`; export `TENANT_CONTACT_REPOSITORY`)
- [x] T012 Register `ContactsModule` in `apps/api/src/app.module.ts`

---

## Phase 5: Tests

- [x] T013 [P] Write unit tests in `apps/api/src/modules/contacts/application/use-cases/create-tenant-contact.use-case.spec.ts` (happy path; duplicate email → ConflictException; email normalized to lowercase; tenantId never from body)
- [x] T014 [P] Write integration tests in `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.spec.ts` (create persists record; findByEmail returns contact; findByEmail returns null for unknown email; archived contact not returned)
- [x] T015 Write E2E tests in `apps/api/test/contacts.e2e-spec.ts` (201 happy path; 400 all required-field errors at once; 400 malformed email; 409 duplicate email; 409 case-insensitive duplicate; 201 same email different workspace; tenantId in body ignored)

---

## Dependencies

- T003 + T004 can run in parallel (no inter-dependency)
- T005 depends on T003 + T004
- T006 depends on T005
- T007 depends on T005 (implements the interface)
- T008 + T009 can run in parallel
- T010 depends on T008 + T009 + T006
- T011 depends on T010
- T012 depends on T011
- T013–T015 can begin once T006 + T007 + T010 are complete
