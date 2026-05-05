# Feature Specification: Repository Abstraction with Prisma Implementations

**Feature Branch**: `015-prisma-repository-abstraction`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Create repository abstraction for the NestJS backend so data access is clean, testable, tenant-safe, and isolated from business logic."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Uses Repository Interfaces in Use Cases (Priority: P1)

A backend developer writes a use case (e.g., `GetCurrentUserUseCase`) that retrieves user data. Instead of injecting `PrismaService` directly, the use case injects a `UserRepository` interface token. The use case has no knowledge of how data is fetched or stored — only that the interface contract is fulfilled.

**Why this priority**: This is the core outcome of the feature. All other stories build on the ability of application code to depend on abstractions, not concrete infrastructure.

**Independent Test**: Can be tested by creating a use case file, injecting the `USER_REPOSITORY` token, and verifying the TypeScript compiler resolves the type correctly from the interface — without any Prisma import in scope.

**Acceptance Scenarios**:

1. **Given** a use case class that injects `@Inject(USER_REPOSITORY) private readonly userRepo: UserRepository`, **When** TypeScript compiles the file, **Then** no Prisma types appear in the use case file and compilation succeeds.
2. **Given** a mock implementing `UserRepository`, **When** the use case is unit-tested, **Then** the use case runs without any Prisma dependency present.
3. **Given** a NestJS module that provides `USER_REPOSITORY` using `PrismaUserRepository`, **When** the application bootstraps, **Then** the DI container resolves the correct implementation without error.

---

### User Story 2 - Tenant-Safe Queries Are Enforced Through Repository Contracts (Priority: P1)

A developer queries tenant-owned data (e.g., future `PropertyRepository`). The repository method signature requires `tenantId` as a parameter. Calls without `tenantId` fail at compile time or are structurally impossible through the interface contract, preventing accidental cross-tenant data leakage.

**Why this priority**: Multi-tenant data isolation is a core system invariant. Repository method signatures must enforce this structurally, not through runtime checks alone.

**Independent Test**: Can be tested by reviewing the method signatures of repository interfaces. Any method operating on tenant-scoped data must require `tenantId` in its parameter signature. Compile-time enforcement can be validated via TypeScript.

**Acceptance Scenarios**:

1. **Given** a repository interface for a tenant-owned model, **When** a developer calls a `findById` method, **Then** the method signature requires both `id: string` and `tenantId: string`.
2. **Given** a Prisma repository implementation, **When** the implementation calls Prisma to query tenant-owned records, **Then** the query always includes a `tenantId` filter matching the provided parameter.
3. **Given** `UserRepository`, `TenantRepository`, and `TenantMembershipRepository` base identity interfaces, **When** reviewed against tenant-safe conventions, **Then** each method follows documented tenant-safety rules for identity data.

---

### User Story 3 - Prisma Remains Isolated to Infrastructure Repositories (Priority: P1)

A developer reviews the codebase and confirms that `PrismaService` and `PrismaClient` types do not appear in any controller, application use case, or domain file. Prisma is used only inside infrastructure repository implementations and infrastructure utilities.

**Why this priority**: Isolating Prisma prevents ORM coupling from spreading across the codebase. This makes future ORM replacement, testing, and architectural refactoring significantly simpler.

**Independent Test**: Can be tested with a grep or TypeScript import scan. Any file outside `infrastructure/repositories/` or `prisma/` that imports `PrismaService` or `@prisma/client` should return zero results.

**Acceptance Scenarios**:

1. **Given** the full `apps/api/src` source tree, **When** searched for `PrismaService` imports, **Then** only infrastructure repository files and `PrismaModule` contain such imports.
2. **Given** a controller or use case file, **When** reviewing its imports, **Then** no `@prisma/client` or `PrismaService` imports are present.
3. **Given** the refactoring of any existing services that previously used `PrismaService` directly, **When** the refactor is complete, **Then** those services inject repository tokens instead.

---

### User Story 4 - Developer Can Unit Test Use Cases Using Mock Repositories (Priority: P2)

A developer writes a unit test for `GetCurrentUserUseCase`. They create a plain JavaScript/TypeScript object implementing the `UserRepository` interface with mock return values. The use case is instantiated with the mock, and the test runs without any database connection, Prisma setup, or NestJS bootstrapping.

**Why this priority**: Testability is a key benefit of repository abstraction. This validates that the interface design enables fast, isolated unit tests.

**Independent Test**: Can be demonstrated with a single Jest unit test that creates a manual mock of `UserRepository`, passes it to a use case constructor or `useFactory`, and asserts the use case returns the expected output.

**Acceptance Scenarios**:

1. **Given** a `UserRepository` interface, **When** a developer creates an object implementing all interface methods with mock return values, **Then** TypeScript accepts the mock as a valid `UserRepository`.
2. **Given** a use case that depends on `UserRepository`, **When** a unit test provides a mock repository, **Then** the test does not require Prisma, a database, or NestJS module setup.
3. **Given** a mock `UserRepository.findByClerkUserId` returning a specific user object, **When** the use case is executed, **Then** the use case processes and returns the expected result.

---

### User Story 5 - Base Identity Use Case Demonstrates Full Abstraction (Priority: P2)

A developer references an example use case (e.g., `SyncUserFromClerkUseCase` or `GetCurrentUserUseCase`) to understand how to write application logic against repository interfaces. The example is minimal, imports no Prisma types, accepts `userId`/`tenantId` as input, and delegates data access entirely to repository interface methods.

**Why this priority**: An example use case serves as a template and validation of the full abstraction stack — from DI token to interface to Prisma implementation.

**Independent Test**: Can be independently tested by reviewing the use case file imports, running its unit test in isolation, and bootstrapping the NestJS module to verify DI resolution.

**Acceptance Scenarios**:

1. **Given** an example use case file, **When** its imports are reviewed, **Then** no `@prisma/client` or `PrismaService` imports exist.
2. **Given** the use case injected with a real `PrismaUserRepository` through DI, **When** the application starts, **Then** the DI container resolves the dependency without errors.
3. **Given** the example use case, **When** executed with valid input, **Then** it returns domain-friendly data types (not raw Prisma model types).

---

### Edge Cases

- What happens when a repository method receives a `userId` that does not exist in the database?
- What happens when the Prisma client throws a unique constraint violation (e.g., duplicate `clerkUserId`)?
- What happens when a tenant-scoped method receives an empty or null `tenantId`?
- What happens if `PrismaService` is not initialized before a repository method is called?
- How are Prisma-specific error codes (e.g., P2002 unique violation, P2025 record not found) normalized for the application layer?

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST define a `UserRepository` interface in the application layer with no Prisma imports.
- **FR-002**: System MUST define a `TenantRepository` interface in the application layer with no Prisma imports.
- **FR-003**: System MUST define a `TenantMembershipRepository` interface in the application layer with no Prisma imports.
- **FR-004**: System MUST provide a `PrismaUserRepository` class in the infrastructure layer that implements `UserRepository`.
- **FR-005**: System MUST provide a `PrismaTenantRepository` class in the infrastructure layer that implements `TenantRepository`.
- **FR-006**: System MUST provide a `PrismaTenantMembershipRepository` class in the infrastructure layer that implements `TenantMembershipRepository`.
- **FR-007**: System MUST define explicit NestJS dependency injection tokens (`USER_REPOSITORY`, `TENANT_REPOSITORY`, `TENANT_MEMBERSHIP_REPOSITORY`) using `Symbol`.
- **FR-008**: System MUST wire repository tokens to Prisma implementations via NestJS module providers.
- **FR-009**: System MUST ensure `PrismaService` is injected only into infrastructure repository files and `PrismaModule`; all other use of `PrismaService` is forbidden.
- **FR-010**: System MUST provide at least one minimal example use case in the application layer (e.g., `GetCurrentUserUseCase`) that uses a repository token and imports no Prisma types.
- **FR-011**: System MUST document tenant-safe repository method conventions covering how `tenantId` is required for tenant-owned data queries, updates, and deletions.
- **FR-012**: System MUST NOT allow controllers to inject `PrismaService` directly.
- **FR-013**: System MUST NOT allow application use cases to import or inject `PrismaService`.
- **FR-014**: Repository interfaces MUST use domain-friendly types for all method signatures; raw Prisma model types must not appear in interface definitions.
- **FR-015**: Known Prisma errors (record not found, unique constraint violations) MUST be normalized within infrastructure repositories so the application layer receives clean, predictable responses.

### Key Entities

- **UserRepository**: Interface defining data access operations for the `User` domain entity. Supports lookup by Clerk user ID, creation from Clerk data, and basic profile updates.
- **TenantRepository**: Interface defining data access operations for the `Tenant` domain entity. Supports lookup by Clerk organization ID, lookup by internal ID, and creation from Clerk org data.
- **TenantMembershipRepository**: Interface defining data access operations for `TenantMembership` records. Supports membership lookup, creation, and retrieval of user-tenant relationships.
- **PrismaUserRepository**: Infrastructure-layer implementation of `UserRepository` using `PrismaService`. Encapsulates all Prisma query logic for the `User` model.
- **PrismaTenantRepository**: Infrastructure-layer implementation of `TenantRepository` using `PrismaService`. Encapsulates all Prisma query logic for the `Tenant` model.
- **PrismaTenantMembershipRepository**: Infrastructure-layer implementation of `TenantMembershipRepository` using `PrismaService`.
- **DI Token**: A `Symbol`-based NestJS injection token used to bind a repository interface to its implementation without creating a compile-time dependency on the concrete class.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All use cases in `apps/api/src` that access user, tenant, or membership data do so through repository interface tokens; zero direct `PrismaService` injections exist outside infrastructure.
- **SC-002**: A developer can write a unit test for any use case using a mock object implementing the repository interface, with zero database or Prisma setup required.
- **SC-003**: The TypeScript compiler reports zero errors across `apps/api/src` after repository abstraction is implemented.
- **SC-004**: The NestJS application bootstraps successfully with all repository tokens resolved in the DI container.
- **SC-005**: A search for `PrismaService` across `apps/api/src` returns results only in infrastructure repository files and the `PrismaModule` file; zero matches in controllers, use cases, or domain files.
- **SC-006**: All tenant-scoped repository method signatures include `tenantId` as a required parameter, enforced at compile time.
- **SC-007**: Documentation covering repository architecture, layer boundaries, and tenant-safe conventions is available and accurate.

---

## Assumptions

- Prisma ORM is already installed and configured in `apps/api` with a working `PrismaService` and `PrismaModule`.
- The initial Prisma migration has been completed and the `User`, `Tenant`, and `TenantMembership` models exist in the schema.
- NestJS module structure for `users` and `tenants` already exists or will be created as part of this feature.
- Clerk authentication is already integrated; `request.user` provides `{ userId, tenantId }` via the tenant-aware request context.
- No `PropertyRepository`, `UnitRepository`, `LeaseRepository`, or `PaymentRepository` are in scope for this feature; only base identity models are covered.
- An error normalization approach will map known Prisma error codes to clean application responses; a full custom error class system is out of scope unless already present.
- Module structure follows the pattern `modules/{domain}/{layer}/` within `apps/api/src`.
- The project uses TypeScript strict mode; all interfaces and implementations must compile without type errors.
- Testing infrastructure (Jest) is already configured in `apps/api`.
- No business logic (property management features) will be added as part of this feature.
