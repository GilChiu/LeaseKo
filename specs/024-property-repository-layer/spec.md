# Feature Specification: Property Domain & Repository Layer

**Feature Branch**: `024-property-repository-layer`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Create the Property domain and repository layer for the NestJS backend, covering: Property domain entity, Property repository interface, and PrismaPropertyRepository implementation, while preserving Clean Architecture, repository abstraction, and tenant-safe query rules."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Application Code Can Read and Create Properties via a Typed Interface (Priority: P1)

A use case (e.g., CreateProperty) needs to create a property record and associate it with the current tenant. A list use case needs to retrieve all active properties for the current tenant. Both use cases must depend on an abstract repository interface — not on Prisma — so they can be tested in isolation without a real database.

**Why this priority**: Without the repository interface and implementation, no use case can persist or retrieve Property data. All Property API features depend on this foundation.

**Independent Test**: The repository interface can be mocked and injected into a use case in a unit test. The `PrismaPropertyRepository` can be manually wired to a test database and verified to create and return tenant-scoped records.

**Acceptance Scenarios**:

1. **Given** the `PropertyRepository` interface is defined, **When** a use case injects `PROPERTY_REPOSITORY`, **Then** it receives a typed interface with no Prisma types visible
2. **Given** `PrismaPropertyRepository.create()` is called with a valid input including `tenantId`, **When** the result is returned, **Then** the result conforms to the `Property` domain entity shape and includes the same `tenantId`
3. **Given** `PrismaPropertyRepository.findManyByTenant()` is called with a `tenantId`, **When** the result is returned, **Then** only properties belonging to that tenant are returned, and properties with `deletedAt` set are excluded
4. **Given** the NestJS application module is started, **When** a use case requests `PROPERTY_REPOSITORY` via DI, **Then** it receives a `PrismaPropertyRepository` instance

---

### User Story 2 - Property Data Access is Tenant-Safe by Default (Priority: P2)

Every repository method that reads, creates, or mutates a property must require and apply a `tenantId`. No method may return or modify a property without confirming it belongs to the correct tenant. This isolation must be enforced at the data access layer, independently of application logic.

**Why this priority**: Tenant isolation is the most critical data correctness property of the system. Repository-level enforcement ensures isolation even if a future use case has a bug.

**Independent Test**: Call `findById(id, wrongTenantId)` where the property exists but under a different tenant. Confirm the method returns `null` — not the property.

**Acceptance Scenarios**:

1. **Given** a property exists under `tenantId = "A"`, **When** `findById(propertyId, "B")` is called, **Then** the repository returns `null`
2. **Given** a property exists under `tenantId = "A"`, **When** `findManyByTenant("B")` is called, **Then** the repository returns an empty array
3. **Given** `tenantFilter()` is used in every repository query, **When** the Prisma where clause is inspected, **Then** `tenantId` is always part of the where condition

---

### User Story 3 - Soft-Deleted Properties Are Excluded from Normal Reads (Priority: P3)

Properties that have been soft-deleted (i.e., `deletedAt` is not null) must not appear in normal list or findById results. This filtering must happen in the repository, not the use case.

**Why this priority**: Soft-delete filtering in the repository ensures it is never accidentally omitted by a future use case author. It is a data access concern, not a business logic concern.

**Independent Test**: Set `deletedAt` on a property record directly in the database. Call `findManyByTenant(tenantId)`. Confirm the soft-deleted property does not appear in results.

**Acceptance Scenarios**:

1. **Given** a property has `deletedAt` set to a non-null timestamp, **When** `findManyByTenant(tenantId)` is called, **Then** that property is not in the returned list
2. **Given** a property has `deletedAt` set, **When** `findById(id, tenantId)` is called, **Then** the method returns `null` as if the property does not exist
3. **Given** a property has `deletedAt = null`, **When** `findManyByTenant(tenantId)` is called, **Then** that property is included in the returned list

---

### Edge Cases

- What happens when `create()` is called and the `tenantId` does not exist in the `tenants` table? → PostgreSQL foreign key constraint violation; the Prisma repository should allow the error to propagate as-is (FK constraint errors are not caught and silenced)
- What happens when `findById()` is called with an `id` that does not exist? → Returns `null` — same result as a record belonging to a different tenant (intentionally indistinguishable)
- What happens when `tenantFilter()` receives an empty `tenantId`? → `tenantFilter()` throws at runtime, preventing the query from executing without a valid tenant scope

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST have a `Property` domain entity in `apps/api/src/modules/properties/domain/entities/property.entity.ts` that does not import Prisma types or NestJS decorators
- **FR-002**: The system MUST have a `PropertyRepository` interface in the application layer that does not import Prisma types
- **FR-003**: The `PropertyRepository` interface MUST include `create`, `findManyByTenant`, and `findById` methods as a minimum
- **FR-004**: A `PROPERTY_REPOSITORY` DI token MUST exist so use cases can inject the repository without depending on the concrete Prisma implementation
- **FR-005**: A `PrismaPropertyRepository` MUST exist in the infrastructure layer that implements `PropertyRepository` and uses `PrismaService`
- **FR-006**: `PrismaPropertyRepository` MUST use `tenantFilter()` from `tenant-filter.util.ts` in every tenant-scoped query
- **FR-007**: `PrismaPropertyRepository.findManyByTenant()` MUST exclude records where `deletedAt` is not null
- **FR-008**: `PrismaPropertyRepository.findById()` MUST exclude records where `deletedAt` is not null
- **FR-009**: No repository method MAY query, update, or delete a Property by `id` alone without also filtering by `tenantId`
- **FR-010**: `PropertiesModule` MUST wire `PROPERTY_REPOSITORY` to `PrismaPropertyRepository` via NestJS provider binding
- **FR-011**: The application and domain layers MUST NOT import from `@prisma/client` or `PrismaService`
- **FR-012**: No Property controller or API endpoint MAY be introduced in this task
- **FR-013**: No `CreateProperty` use case or DTO MAY be introduced in this task
- **FR-014**: The `PropertyRepository` interface SHOULD follow the pattern established by the existing `ITenantScopedRepository` and `UserRepository` in the codebase
- **FR-015**: Input types for repository methods MUST be defined as plain TypeScript types or interfaces (no Prisma types)

### Key Entities

- **Property** (domain entity): Represents a physical property record within a tenant workspace. Fields: id, tenantId, name, addressLine1, addressLine2?, city, state?, postalCode?, country, propertyType, description?, createdAt, updatedAt, deletedAt?. Must be free of Prisma and NestJS dependencies.
- **PropertyRepository** (application interface): Contract for all Property data access. Methods return `Property` domain entity instances. Injected via `PROPERTY_REPOSITORY` symbol token.
- **PrismaPropertyRepository** (infrastructure class): Concrete implementation. Converts Prisma results to `Property` domain entity shape. Applies `tenantFilter()` and `deletedAt: null` filters in all read operations.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm --filter @leaseKo/api build` exits with code 0 after all files are created — TypeScript compiles without errors
- **SC-002**: `pnpm --filter @leaseKo/api test` exits with code 0 — all 37 existing tests continue to pass
- **SC-003**: A grep/search for `@prisma/client` in `domain/` and `application/` folders returns zero matches
- **SC-004**: The NestJS DI container successfully resolves `PROPERTY_REPOSITORY` when the application starts — no `UnknownDependenciesException` at startup
- **SC-005**: `findById(id, differentTenantId)` returns `null` for a record belonging to another tenant — cross-tenant data leakage is prevented at the repository level
- **SC-006**: `findManyByTenant(tenantId)` returns an empty array when all matching properties have `deletedAt` set — soft-deleted records are invisible by default

## Assumptions

- The `Property` Prisma model and migration already exist (created in feature 023) — this task builds the application code on top
- `PrismaService` is globally provided via `DatabaseModule` (as per existing pattern in `UsersModule`) — `PropertiesModule` does not need to import a database module explicitly
- The existing `ITenantScopedRepository<T>` interface and `tenantFilter()` utility will be followed as established patterns
- The existing `UserRepository` and `PrismaUserRepository` in the `users` module serve as direct implementation patterns for this feature
- `update` and `softDelete` (archive) methods on the repository will be added in a later task when the corresponding use cases are implemented; only `create`, `findManyByTenant`, and `findById` are required now
- `PropertiesModule` will export `PROPERTY_REPOSITORY` so future use cases registered in the same module can consume it
- No `AppModule` changes are needed if `PropertiesModule` is not yet registered — it will be registered when the first endpoint is introduced
