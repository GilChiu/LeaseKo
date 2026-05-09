# Feature Specification: CreateProperty Use Case Unit Tests

**Feature Branch**: `026-create-property-tests`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Create unit tests for the CreateProperty use case in the NestJS backend. Tests must verify property creation via the repository abstraction, tenantId forwarding, and repository error propagation — without Prisma, real database, or Clerk."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Verifies CreatePropertyUseCase Creates via Repository (Priority: P1)

A developer runs the test suite and can confirm that `CreatePropertyUseCase.execute()` correctly delegates property creation to the injected `PropertyRepository` abstraction, passing all required fields and returning the created `Property` entity.

**Why this priority**: This is the core behavior of the use case. Without a test proving the repository is called with the correct input and the use case returns the repository's result, there is no confidence that the application layer works correctly.

**Independent Test**: Run `npx jest create-property.use-case.spec.ts`. The test for successful property creation passes. The test asserts that `repository.create` was called exactly once with the full input (including `tenantId`) and that the use case returned the property from the mock.

**Acceptance Scenarios**:

1. **Given** a mocked `PropertyRepository` whose `create` resolves to a valid `Property` object, **When** `CreatePropertyUseCase.execute(input)` is called with a full valid input, **Then** the use case resolves with the same `Property` object returned by the mock
2. **Given** a valid input, **When** `execute()` is called, **Then** `repository.create` is called exactly once
3. **Given** a valid input, **When** `execute()` is called, **Then** `repository.create` receives the exact same input object that was passed to `execute()`

---

### User Story 2 - Developer Confirms tenantId Is Forwarded, Not Generated (Priority: P2)

A developer runs the test suite and can confirm that `CreatePropertyUseCase` receives `tenantId` as part of its input and forwards it as-is to the repository — it does not generate, modify, or default the `tenantId`.

**Why this priority**: Tenant isolation is a non-negotiable security requirement. A test proving `tenantId` forwarding is correct prevents accidental cross-tenant writes.

**Independent Test**: Run the test file and observe that the `repository.create` call received `tenantId: "tenant_test_123"` — the exact value supplied in the use case input.

**Acceptance Scenarios**:

1. **Given** an input with `tenantId: "tenant_test_123"`, **When** `execute()` is called, **Then** `repository.create` is called with an object containing `tenantId: "tenant_test_123"`
2. **Given** the use case implementation, **When** inspecting imports, **Then** it does not import `PrismaService`, `@prisma/client`, or any HTTP/request context utilities

---

### User Story 3 - Developer Confirms Repository Errors Are Propagated (Priority: P3)

A developer runs the test suite and can confirm that when `PropertyRepository.create` rejects, `CreatePropertyUseCase.execute()` propagates the rejection without swallowing or wrapping the error.

**Why this priority**: Silent error swallowing would make failures invisible. The use case must remain transparent about failures so higher layers (controllers, filters) can handle them appropriately.

**Independent Test**: Mock `repository.create` to reject with `new Error("Repository failure")`. Call `execute()` and assert the promise rejects with the same error.

**Acceptance Scenarios**:

1. **Given** a mocked `repository.create` that rejects with `new Error("Repository failure")`, **When** `execute()` is called, **Then** the promise returned by `execute()` rejects with the same error
2. **Given** a repository failure, **When** `execute()` rejects, **Then** no fake success response is returned

---

### Edge Cases

- What happens when `repository.create` rejects with a non-Error value (e.g., a string)? — The use case propagates whatever the repository rejects with.
- What if `tenantId` is an empty string? — The use case passes it to the repository as-is; input validation is the controller's responsibility via `@RequiresTenant()` and `CreatePropertyDto`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The test file MUST exist at `apps/api/src/modules/properties/application/use-cases/create-property.use-case.spec.ts`
- **FR-002**: The test suite MUST mock `PropertyRepository` using Jest mock functions — no real Prisma, database, or network calls
- **FR-003**: The test suite MUST assert that `repository.create` is called with the exact `CreatePropertyInput` supplied to `execute()`
- **FR-004**: The test suite MUST assert that `execute()` resolves with the `Property` returned by the mocked repository
- **FR-005**: The test suite MUST assert that `tenantId` from the use case input is forwarded to `repository.create`
- **FR-006**: The test suite MUST assert that when `repository.create` rejects, `execute()` also rejects with the same error
- **FR-007**: The test file MUST NOT import `PrismaService` or `@prisma/client`
- **FR-008**: The test file MUST NOT import `PropertiesController`, `CreatePropertyDto`, or `PropertyResponseDto`
- **FR-009**: The use case under test MUST be instantiated directly (not via NestJS `TestingModule`) unless project convention requires DI testing
- **FR-010**: All existing 37 tests MUST continue to pass after the new tests are added
- **FR-011**: Sprint 2 backlog MUST be updated to mark `[ ] Add unit tests for CreateProperty use case` as `[x]` after tests pass

### Key Entities

- **`CreatePropertyUseCase`**: The application-layer class under test — `apps/api/src/modules/properties/application/use-cases/create-property.use-case.ts`
- **`PropertyRepository`** (interface): The abstraction injected into the use case — `apps/api/src/modules/properties/application/repositories/property.repository.ts`
- **`CreatePropertyInput`**: Input type for `repository.create` — `apps/api/src/modules/properties/application/types/property-repository.types.ts`
- **`Property`** (entity): Domain entity returned by the use case — `apps/api/src/modules/properties/domain/entities/property.entity.ts`

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `npx jest create-property.use-case.spec.ts` exits 0 with all new tests passing
- **SC-002**: `npx jest` exits 0 with all 37 pre-existing tests plus all new tests passing (no regressions)
- **SC-003**: `nest build` exits 0 after the spec file is added
- **SC-004**: No external services (PostgreSQL, Redis, Clerk, Docker) are needed to run the tests — all pass offline
- **SC-005**: `SPRINT-2-BACKLOG.md` is updated: `[x] Add unit tests for CreateProperty use case` checked off
- **SC-006**: The spec file contains a minimum of 4 distinct test cases (successful create, tenantId forwarding, repository call count assertion, repository error propagation)

## Assumptions

- `CreatePropertyUseCase.execute()` has no branching business logic — it is a thin delegator to the repository. Therefore, the tests focus on delegation correctness, not business rule coverage.
- Input validation (`@IsString`, `@IsNotEmpty`, etc.) is enforced by `CreatePropertyDto` and the global `ValidationPipe` before the use case runs. The use case assumes already-validated input.
- `tenantId` is enforced non-null by `@RequiresTenant()` before the controller calls the use case. The use case spec does not need to test missing-`tenantId` behavior because that guard is external.
- The project uses Jest 29 with `ts-jest`, which is already configured in `apps/api/jest.config.ts`. No new Jest configuration is needed.
- The NestJS `TestingModule` is not required for this thin use case — direct class instantiation is the preferred approach, matching the style in `get-current-user.use-case.spec.ts`.

## Dependencies _(optional)_

- **Feature 025** (Create Property Endpoint) MUST be complete — `CreatePropertyUseCase` and `PropertyRepository` must already exist
- **Feature 021** (Jest Testing Infrastructure) — Jest + ts-jest already configured; no new setup needed
