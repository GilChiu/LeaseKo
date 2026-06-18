# 🧾 PRODUCT BACKLOG — PROPERTY MANAGEMENT SAAS

---

# 🏁 SPRINT 3 — TENANT CRM & LEASE MANAGEMENT

## 🎯 Sprint Goal

Allow landlords to manage tenants, assign tenants to units, create leases, and track occupancy through lease lifecycles while maintaining strict tenant isolation.

---

# 🔵 EPIC 12: Tenant CRM

## User Story 12.1 ✅

As a landlord, I want to create tenant records so that I can manage people renting my units.

**Spec**: [`specs/040-create-contact-api/spec.md`](specs/040-create-contact-api/spec.md)
**Completed**: 2026-06-05 | lint ✅ typecheck ✅ build ✅ tests ✅ (134/134)

### Tasks

- [x] Create TenantContact Prisma model (firstName, lastName, email, phone, idNumber, notes, tenantId FK, deletedAt, createdAt, updatedAt)
- [x] Add unique index on (tenantId, email) for per-workspace email uniqueness
- [x] Add index on tenantId
- [x] Create Prisma migration
- [x] Define TenantContact domain entity
- [x] Define TenantContact repository interface with TENANT_CONTACT_REPOSITORY DI token
- [x] Implement PrismaTenantContactRepository (create, findByEmail, findById, findManyByTenant)
- [x] Create CreateTenantContact use case (verify no duplicate email, create, return entity)
- [x] Create CreateTenantContactDto with class-validator (firstName, lastName required; email required + @IsEmail; max lengths; tenantId MUST NOT be in DTO)
- [x] Create ContactResponseDto with @ApiProperty decorators
- [x] Create POST /api/v1/contacts endpoint (@RequiresTenant, @ApiTags('Contacts'), full Swagger)
- [x] Add unit tests: happy path, duplicate email conflict, cross-tenant isolation, tenantId injection prevention

### Acceptance Criteria

- User can create renter contact records via API
- Contact records are scoped to the authenticated session's workspace
- Email uniqueness is enforced per workspace (case-insensitive); same email allowed across workspaces
- All three required fields (firstName, lastName, email) validated simultaneously
- Malformed emails rejected with a format error
- Fields exceeding max lengths rejected
- tenantId sourced from JWT only — never from request body, query, or header

---

## User Story 12.2 ✅

As a landlord, I want to view tenant records so that I can manage renters.

**Spec**: [`specs/041-list-contacts-api/spec.md`](specs/041-list-contacts-api/spec.md)
**Completed**: 2026-06-05 | lint ✅ typecheck ✅ build ✅ tests ✅ (145/145)

### Tasks

- [x] Create ListTenantContacts use case
- [x] Implement tenant-scoped repository query (findPagedByTenant with $transaction)
- [x] Create GET /api/v1/contacts endpoint
- [x] Add pagination support (page + limit, default 1/20, max limit 100)
- [x] Add Swagger documentation
- [x] Add unit tests, integration tests, and E2E tests

### Acceptance Criteria

- User sees only tenant records from their workspace
- Results are tenant-scoped
- No cross-tenant leakage

---

## User Story 12.3 ✅

As a landlord, I want to view a tenant profile so that I can inspect renter details.

**Spec**: [`specs/042-get-contact-by-id/spec.md`](specs/042-get-contact-by-id/spec.md)
**Completed**: 2026-06-05 | lint ✅ typecheck ✅ build ✅ tests ✅ (156/156)

### Tasks

- [x] Create GetTenantContactById use case
- [x] Implement tenant-scoped findById (filters by id + tenantId + deletedAt: null)
- [x] Create GET /api/v1/contacts/:id endpoint
- [x] Add Swagger documentation
- [x] Add unit tests, integration tests, and E2E tests

### Acceptance Criteria

- User can view tenant profile
- Tenant lookup includes tenantId
- Foreign tenant records return 404 (indistinguishable from missing/archived)

---

## User Story 12.4 ✅

As a landlord, I want to update tenant information so that records stay current.

**Spec**: [`specs/043-update-contact-api/spec.md`](specs/043-update-contact-api/spec.md)
**Completed**: 2026-06-05 | lint ✅ typecheck ✅ build ✅ tests ✅ (171/171)

### Tasks

- [x] Create UpdateTenantContact use case (partial update; empty-body check; self-email allowed; email uniqueness enforced)
- [x] Create UpdateTenantContactDto (all fields optional, same validators as create)
- [x] Implement tenant-scoped update (compound WHERE { id, tenantId }; P2025 → null)
- [x] Create PATCH /api/v1/contacts/:id endpoint
- [x] Add validation (empty body → 400; blank names → 400; duplicate email → 409)
- [x] Add Swagger documentation
- [x] Add unit tests, integration tests, and E2E tests

### Acceptance Criteria

- User can update tenant details
- Cross-tenant updates are impossible

---

## User Story 12.5

As a landlord, I want to archive tenant records so that old renters do not clutter active data.

### Tasks

- [x] Add soft delete support
- [x] Create ArchiveTenantContact use case
- [x] Implement tenant-scoped archive
- [x] Create DELETE /tenants/:id endpoint
- [x] Add Swagger documentation
- [x] Add unit tests

### Acceptance Criteria

- Tenant archive is tenant-scoped
- Archived tenants do not appear in normal lists

---

# 🔵 EPIC 13: Lease Management

## User Story 13.1

As a landlord, I want to create leases so that I can formally assign tenants to units.

### Tasks

- [x] Create Lease Prisma model
- [x] Add tenantId relation
- [x] Add propertyId relation
- [x] Add unitId relation
- [x] Add tenantContactId relation
- [x] Create LeaseStatus enum
- [x] Add indexes
- [x] Create Prisma migration
- [x] Define Lease domain entity
- [x] Define Lease repository interface
- [x] Implement PrismaLeaseRepository
- [x] Create CreateLease use case
- [x] Create CreateLease DTO
- [x] Create POST /leases endpoint
- [x] Add Swagger documentation
- [x] Add validation rules
- [x] Add unit tests

### Lease Fields

- id
- tenantId
- propertyId
- unitId
- tenantContactId
- startDate
- endDate
- monthlyRent
- securityDeposit
- status
- notes
- createdAt
- updatedAt

### LeaseStatus

- DRAFT
- ACTIVE
- EXPIRED
- TERMINATED

### Acceptance Criteria

- Lease can only be created for units belonging to current tenant
- Lease can only reference tenant contacts in current tenant
- Lease is tenant-scoped
- Lease start date must be before end date

---

## User Story 13.2

As a landlord, I want to view leases so that I can manage active rental agreements.

### Tasks

- [x] Create ListLeases use case
- [x] Create GET /leases endpoint
- [x] Add filtering structure
- [x] Add Swagger documentation
- [x] Add unit tests

### Acceptance Criteria

- User sees only leases from current tenant

---

## User Story 13.3

As a landlord, I want to view a lease so that I can inspect contract details.

### Tasks

- [x] Create GetLeaseById use case
- [x] Create GET /leases/:id endpoint
- [x] Add Swagger documentation
- [x] Add unit tests

### Acceptance Criteria

- Lease lookup is tenant-scoped

---

## User Story 13.4

As a landlord, I want to activate a lease so that occupancy begins.

### Tasks

- [x] Create ActivateLease use case
- [x] Validate lease dates
- [x] Transition DRAFT → ACTIVE
- [x] Mark unit as OCCUPIED
- [x] Add transition tests
- [x] Create PATCH /leases/:id/activate endpoint
- [x] Add Swagger documentation

### Acceptance Criteria

- Unit automatically becomes OCCUPIED
- Only valid leases can activate

---

## User Story 13.5

As a landlord, I want lease expiration handling so that occupancy status remains accurate.

### Tasks

- [x] Create ExpireLease use case
- [x] Create TerminateLease use case
- [x] Add lease status transition rules
- [x] Update unit occupancy when lease ends
- [x] Add transition tests

### Acceptance Criteria

- Expired lease updates status correctly
- Unit becomes AVAILABLE when appropriate

---

# 🔵 EPIC 14: Occupancy & Assignment Rules

## User Story 14.1

As a system, I want occupancy validation so that units cannot have multiple active leases.

### Tasks

- [x] Prevent multiple ACTIVE leases per unit
- [x] Add repository validation
- [x] Add use case validation
- [x] Add unit tests

### Acceptance Criteria

- Unit cannot have more than one ACTIVE lease

---

## User Story 14.2

As a system, I want tenant-safe lease queries so that lease data is isolated.

### Tasks

- [x] Implement tenant-scoped lease queries
- [x] Add helper utilities
- [x] Add tests for cross-tenant access

### Acceptance Criteria

- No cross-tenant lease access is possible

---

# 🔵 EPIC 15: Frontend Tenant & Lease Screens

## User Story 15.1

As a landlord, I want to manage tenant records from the UI.

### Tasks

- [x] Create tenant list page
- [x] Create create-tenant page
- [x] Connect to backend APIs
- [x] Add loading states
- [x] Add empty states
- [x] Add error states

---

## User Story 15.2

As a landlord, I want to create leases from the UI.

### Tasks

- [x] Create lease creation page
- [x] Tenant selector
- [x] Property selector
- [x] Unit selector
- [x] Lease form
- [x] Validation handling
- [x] API integration

---

## User Story 15.3

As a landlord, I want to view leases from the dashboard.

### Tasks

- [x] Create lease list page
- [x] Create lease detail page
- [x] Add status badges
- [x] Add filtering UI

---

# 🔵 EPIC 16: Sprint 3 Documentation & Testing

## User Story 16.1

As a developer, I want Lease and Tenant APIs documented.

### Tasks

- [x] Swagger tags for Tenant Contacts
- [x] Swagger tags for Leases
- [x] Document DTOs
- [x] Document responses
- [x] Document errors

---

## User Story 16.2

As a developer, I want tenant and lease logic tested.

### Tasks

- [x] TenantContact use case tests
- [x] Lease use case tests
- [x] Lease activation tests
- [x] Lease expiration tests
- [x] Occupancy validation tests
- [x] Cross-tenant access tests

---

# ✅ SPRINT 3 DEFINITION OF DONE

- [x] Tenant CRM CRUD implemented
- [x] Lease CRUD implemented
- [x] Tenant assignment to units implemented
- [x] Lease activation implemented
- [x] Lease expiration implemented
- [x] Unit occupancy updates automatically
- [x] Multiple active leases prevented
- [x] Lease queries tenant-scoped
- [x] Tenant queries tenant-scoped
- [x] Swagger documentation updated
- [x] Frontend tenant screens working
- [x] Frontend lease screens working
- [x] Tests cover lease lifecycle and tenant isolation
- [x] Lint, typecheck, build, and tests pass

---

# 🧭 NEXT SPRINT PREVIEW (SPRINT 4)

## Epics

- Payments & Rent Collection
- Maintenance Requests
- Dashboard Analytics

## Features

- Rent invoices
- Payment tracking
- Maintenance tickets
- Occupancy metrics
- Revenue dashboard