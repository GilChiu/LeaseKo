# Feature Specification: Property Data Model & Prisma Migration

**Feature Branch**: `023-property-data-model`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Create the Property Prisma model and migration for the Property Management SaaS, introducing the first tenant-owned business model while preserving multi-tenant, Clean Architecture, and Prisma migration standards."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Data Layer Supports Property Persistence (Priority: P1)

A landlord's tenant workspace needs a persistent storage model for properties. The system must be able to record, retrieve, and later query property records in a way that is always scoped to the owning tenant. This story covers adding the Property schema model and database table so downstream use cases can be built on top.

**Why this priority**: Without the schema model and migration, no property can be stored or retrieved. All higher-level features (create, list, update, delete property) depend on this foundation.

**Independent Test**: The migration can be applied to a fresh PostgreSQL database and the resulting `properties` table can be verified to contain all required columns, foreign key constraints, and indexes.

**Acceptance Scenarios**:

1. **Given** the Property model is added to the Prisma schema, **When** `prisma validate` is run, **Then** validation succeeds with no errors
2. **Given** the migration is created and applied, **When** the `properties` table is inspected, **Then** it has columns for id, tenant_id, name, address fields, property_type, description, created_at, updated_at, deleted_at
3. **Given** a record is inserted into `properties` with a valid `tenant_id`, **When** the foreign key is checked, **Then** it references the `tenants` table and cascades on delete
4. **Given** a query runs against `properties` filtered by `tenant_id`, **When** the query plan is inspected, **Then** the `tenant_id` index is used

---

### User Story 2 - Tenant Isolation Guaranteed at Schema Level (Priority: P2)

Every property must be owned by exactly one tenant. The data model must enforce this at the database level so no property can exist without a tenant, and no property can accidentally appear in another tenant's result set.

**Why this priority**: Tenant isolation is a core product guarantee. Schema-level enforcement prevents incorrect data access before any application logic is written.

**Independent Test**: Attempting to insert a property record with a non-existent or null tenant_id must fail at the database constraint level.

**Acceptance Scenarios**:

1. **Given** an attempt to insert a property with a null `tenant_id`, **When** the insert is executed, **Then** the database rejects it with a NOT NULL constraint violation
2. **Given** an attempt to insert a property with a `tenant_id` that does not exist in `tenants`, **When** the insert is executed, **Then** the database rejects it with a foreign key constraint violation
3. **Given** a tenant is deleted, **When** the cascade rule is evaluated, **Then** all properties belonging to that tenant are also deleted

---

### User Story 3 - Soft Delete Readiness for Property Records (Priority: P3)

Property records may need to be archived without permanent deletion. The schema must include a `deleted_at` timestamp field so soft delete behavior can be implemented in a later user story without requiring a schema migration at that time.

**Why this priority**: Adding the field now avoids a future schema migration when soft delete behavior is implemented. It does not require any delete logic in this task.

**Independent Test**: A property record can have `deleted_at` set to a timestamp value or left as NULL. No application-level behavior is required in this task.

**Acceptance Scenarios**:

1. **Given** a property record is inserted without a `deleted_at` value, **When** the record is retrieved, **Then** `deleted_at` is NULL
2. **Given** a property record is updated to set `deleted_at` to a timestamp, **When** the record is retrieved, **Then** `deleted_at` reflects the set value
3. **Given** the composite index on `[tenantId, deletedAt]` exists, **When** a future query filters by `tenantId` and `deletedAt IS NULL`, **Then** the index is available to optimize that query

---

### Edge Cases

- What happens when a property is inserted with a `tenant_id` referencing a non-existent tenant? → Foreign key constraint violation at the database level
- What happens when the `properties` table is queried without a `tenantId` filter? → Returns all properties; application code must always add tenantId filter (enforced in future repository)
- What happens when `propertyType` receives an unexpected string value? → Accepted without error; validation will be enforced at the application layer when the API is implemented

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST include a `Property` model in the Prisma schema with all required fields
- **FR-002**: The `Property` model MUST include a `tenantId` field that references `Tenant.id`
- **FR-003**: The `Tenant` model MUST be updated to include a `properties Property[]` reverse relation
- **FR-004**: The `Property` model MUST have `@@index([tenantId])` for tenant-scoped query performance
- **FR-005**: The `Property` model MUST have `@@index([tenantId, deletedAt])` for future soft-delete filtering
- **FR-006**: The `Property` model MUST include a `deletedAt DateTime?` field for soft-delete readiness
- **FR-007**: The `propertyType` field MUST be stored as a plain string for MVP simplicity
- **FR-008**: A Prisma migration named `add_property_model` MUST be created under `apps/api/prisma/migrations/`
- **FR-009**: The migration MUST be applied to the local PostgreSQL database
- **FR-010**: The Prisma client MUST be regenerated after the migration is applied
- **FR-011**: The schema MUST pass `prisma validate` without errors
- **FR-012**: No `Unit`, `Lease`, or `Payment` models may be introduced in this task
- **FR-013**: No Property controller, repository, use case, DTO, or API endpoint may be introduced in this task

### Key Entities

- **Property**: Represents a physical property managed by a landlord within a tenant workspace. Key attributes: id (UUID), tenantId (FK → Tenant), name, full address (addressLine1, addressLine2, city, state, postalCode, country), propertyType (string), description, createdAt, updatedAt, deletedAt (soft delete timestamp)
- **Tenant**: Existing model. Gains a reverse relation `properties Property[]` to represent all properties owned by the tenant

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `prisma validate` exits with success code and no error messages after schema changes
- **SC-002**: `prisma migrate status` reports "Database schema is up to date" after migration is applied
- **SC-003**: `prisma generate` completes successfully and produces a Prisma Client that includes the `Property` type
- **SC-004**: The full existing test suite (37 tests) continues to pass without modification after the schema and migration changes
- **SC-005**: The `properties` table exists in the local database with all expected columns, the `tenant_id` foreign key, and both indexes
- **SC-006**: No existing models (`User`, `Tenant`, `TenantMembership`) are altered beyond adding the `properties` reverse relation to `Tenant`

## Assumptions

- The project uses PostgreSQL via Prisma and the local database is reachable at the URL defined in `apps/api/.env`
- `propertyType` will be validated at the application layer (not via database enum) to allow flexibility during the MVP phase
- Soft delete logic (filtering out `deletedAt IS NOT NULL` records) will be implemented in a future repository task; this task only adds the column
- The `Tenant.id` (internal UUID) is used as the foreign key for `Property.tenantId`, not `Tenant.clerkOrgId`
- The implementation stays within the `apps/api` workspace; no frontend or shared package changes are needed
- All existing tests remain passing and no existing module is modified
