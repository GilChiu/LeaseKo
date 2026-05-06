# Feature Specification: Auth Guard and Request Context Tests

**Feature Branch**: `022-auth-guard-request-context-tests`
**Created**: 2026-05-06
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer verifies the auth guard correctly enforces authentication on protected routes (Priority: P1)

A backend developer has written the `ClerkJwtGuard` and wants to be confident it behaves correctly: public routes pass through without a token, protected routes reject missing or invalid tokens with `401 Unauthorized`, and valid tokens result in `request.user` being populated with `userId` and `tenantId`. The developer runs `pnpm --filter @leaseKo/api test` and sees the guard spec passing with all happy and unhappy paths covered. No real Clerk API is called — the `VerifyClerkTokenUseCase` is mocked.

**Why this priority**: The auth guard is the security boundary for the entire API. If it silently passes invalid tokens or fails to attach user context, all protected business logic is exposed. These tests are the highest-value safeguard against auth regressions.

**Independent Test**: Run `pnpm --filter @leaseKo/api test` — the `clerk-jwt.guard.spec.ts` suite passes with all test cases. No real Clerk credentials needed; no database required.

**Acceptance Scenarios**:

1. **Given** a handler decorated with `@Public()`, **When** `ClerkJwtGuard.canActivate()` is called with no `Authorization` header, **Then** it returns `true` without calling the token verifier.
2. **Given** a protected handler, **When** the request has no `Authorization` header, **Then** `canActivate()` throws `UnauthorizedException`.
3. **Given** a protected handler, **When** the `Authorization` header is `"token123"` (no "Bearer " prefix), **Then** `canActivate()` throws `UnauthorizedException`.
4. **Given** a protected handler, **When** the `Authorization` header is `"Bearer "` (empty token after prefix), **Then** `canActivate()` throws `UnauthorizedException`.
5. **Given** a protected handler, **When** the `Authorization` header is `"Bearer invalid-token"` and the verifier throws `UnauthorizedException`, **Then** `canActivate()` propagates `UnauthorizedException`.
6. **Given** a protected handler, **When** the token is valid and the verifier returns `{ userId: "user_test_123", tenantId: "org_test_123" }`, **Then** `canActivate()` returns `true` and `request.user` equals `{ userId: "user_test_123", tenantId: "org_test_123", role: null }`.
7. **Given** a `@UserOnly()` handler, **When** the token is valid but `tenantId` is `null`, **Then** `canActivate()` returns `true` (tenant is not required for user-only routes).
8. **Given** a `@RequiresTenant()` handler, **When** the token is valid but `tenantId` is `null`, **Then** `canActivate()` throws `ForbiddenException`.
9. **Given** a `@RequiresTenant()` handler, **When** the token is valid and `tenantId` is `"org_test_123"`, **Then** `canActivate()` returns `true`.

---

### User Story 2 — Developer verifies `tenantId` is sourced exclusively from the verified JWT and never from the HTTP request (Priority: P2)

A developer wants to confirm that a malicious client cannot inject a `tenantId` by putting it in the request body, query parameters, or custom headers. After valid token verification, `request.user.tenantId` must always equal what the Clerk JWT claims contain — never what was passed in the HTTP request. The developer runs the spec and sees assertions confirming `request.user.tenantId` matches the mock verifier output, not any injected request value.

**Why this priority**: Tenant data isolation is a non-negotiable architectural invariant. If `tenantId` could be injected by the client, any tenant's data would be accessible to any authenticated user. These tests document and enforce the trust boundary.

**Independent Test**: Run guard spec with mock verifier returning `tenantId: "org_test_123"` regardless of any `tenantId` value in the request body or query. Assert `request.user.tenantId === "org_test_123"`.

**Acceptance Scenarios**:

1. **Given** a valid token that yields `tenantId: "org_test_123"` from the verifier, **And** the request body contains `{ tenantId: "org_evil_456" }`, **When** the guard runs, **Then** `request.user.tenantId` is `"org_test_123"` (JWT value), not `"org_evil_456"`.
2. **Given** a valid token that yields `tenantId: "org_test_123"`, **And** the request has a query param `?tenantId=org_evil_456`, **When** the guard runs, **Then** `request.user.tenantId` is `"org_test_123"`.
3. **Given** a valid token that yields `tenantId: "org_test_123"`, **And** the request has a header `x-tenant-id: org_evil_456`, **When** the guard runs, **Then** `request.user.tenantId` is `"org_test_123"`.

---

### User Story 3 — Developer verifies decorators correctly read the normalized request context (Priority: P3)

A developer who uses `@CurrentUser()` and `@CurrentTenant()` in controllers wants to confirm these decorators correctly read `request.user` after the guard has run. They run decorator tests that simulate a populated `request.user` on an `ExecutionContext` and assert the decorators return the expected values. These are simple, fast unit tests with no NestJS app bootstrapping needed.

**Why this priority**: Decorators are thin data-access wrappers. If they silently return `undefined` instead of the user context, controller actions will fail in production. The tests are low-effort and add high confidence.

**Independent Test**: Run `current-user.decorator.spec.ts` and `current-tenant.decorator.spec.ts` — both pass. No NestJS app needed; mock `ExecutionContext` via `jest.fn()`.

**Acceptance Scenarios**:

1. **Given** a mock `ExecutionContext` where `request.user = { userId: "user_test_123", tenantId: "org_test_123", role: null }`, **When** `CurrentUser` is invoked, **Then** it returns the full `IRequestContext` object.
2. **Given** a mock `ExecutionContext` where `request.user = { userId: "user_test_123", tenantId: "org_test_123", role: null }`, **When** `CurrentTenant` is invoked, **Then** it returns `"org_test_123"`.
3. **Given** a mock `ExecutionContext` where `request.user = { userId: "user_test_123", tenantId: null, role: null }`, **When** `CurrentTenant` is invoked, **Then** it returns `null`.
4. **Given** the `Public()` decorator is applied to a handler, **When** `Reflector.getAllAndOverride(IS_PUBLIC_KEY, ...)` is called, **Then** it returns `true`.

---

### Edge Cases

- What if `Authorization: Bearer ` (space after "Bearer " with nothing following)? → `extractBearerToken` returns an empty string `""`, which is falsy — the guard throws `UnauthorizedException`. Test must confirm this.
- What if the verifier returns `tenantId: null` on a route with no `@RequiresTenant()` and no `@UserOnly()`? → Default behavior: the guard returns `true` because neither explicit decorator demands tenant presence. `request.user.tenantId` will be `null`. Downstream repositories are responsible for enforcing tenant scoping.
- What if both `@UserOnly()` and `@RequiresTenant()` are applied? → `@UserOnly()` is checked first in the guard and short-circuits to `true` — `@RequiresTenant()` is not evaluated. Tests should document this precedence.
- What if `request.user` is already set before the guard runs (e.g., a previous middleware)? → The guard unconditionally overwrites `request.user` with the verified JWT claims. It never reads a pre-existing `request.user` value.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `ClerkJwtGuard` MUST have a unit test file at `apps/api/src/common/guards/clerk-jwt.guard.spec.ts`.
- **FR-002**: The spec MUST cover: public route bypass, missing token (401), no-prefix header (401), empty-after-prefix token (401), invalid token (401), valid token with tenantId (200 + `request.user`), `@UserOnly()` with null tenantId (200), `@RequiresTenant()` with null tenantId (403), `@RequiresTenant()` with valid tenantId (200).
- **FR-003**: `VerifyClerkTokenUseCase` MUST be mocked — no real Clerk API calls in the guard spec.
- **FR-004**: The spec MUST assert that `request.user.tenantId` is always sourced from the mock verifier output, not from any HTTP request field.
- **FR-005**: `@CurrentUser()` decorator MUST have a unit test confirming it returns `request.user` from the `ExecutionContext`.
- **FR-006**: `@CurrentTenant()` decorator MUST have a unit test confirming it returns `request.user.tenantId` (or `null` when absent).
- **FR-007**: All test files MUST follow the colocated convention: `*.spec.ts` next to the file under test in `src/`.
- **FR-008**: Tests MUST NOT import real `PrismaClient`, call `new PrismaClient()`, or require a database connection.
- **FR-009**: Tests MUST NOT import or call `verifyToken` from `@clerk/backend` — only the `VerifyClerkTokenUseCase` mock is used.
- **FR-010**: All tests MUST pass via `pnpm --filter @leaseKo/api test` without any running Docker containers.

### Key Entities

- **ClerkJwtGuard**: The global `APP_GUARD` that verifies Clerk JWTs, attaches `request.user`, and enforces `@Public()`, `@UserOnly()`, and `@RequiresTenant()` metadata.
- **VerifyClerkTokenUseCase**: The application-layer use case that delegates to `ClerkTokenVerifierService`. Mocked at this boundary in guard unit tests.
- **IRequestContext**: `{ userId: string; tenantId: string | null; role: string | null }` — the verified, normalized identity attached to `request.user`.
- **Mock ExecutionContext**: A `jest.fn()`-based factory that simulates NestJS's `ExecutionContext` with a configurable `request` object for unit tests.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm --filter @leaseKo/api test` passes with all new guard and decorator spec files — zero test failures, zero `MODULE_NOT_FOUND` errors.
- **SC-002**: `clerk-jwt.guard.spec.ts` covers all 9 acceptance scenarios from US1 — 9+ test cases passing.
- **SC-003**: US2 tenant injection scenarios are covered — at least 3 assertions confirming `request.user.tenantId` equals the JWT claim, not any HTTP request field.
- **SC-004**: Decorator specs (`current-user.decorator.spec.ts`, `current-tenant.decorator.spec.ts`) pass with at least 4 test cases total.
- **SC-005**: No test file contains a `CLERK_SECRET_KEY` value, a real JWT string, or a real org/user ID.
- **SC-006**: `pnpm --filter @leaseKo/api build` continues to exit 0 — no regression to the build pipeline.

---

## Assumptions

- `ClerkJwtGuard`, `VerifyClerkTokenUseCase`, `IRequestContext`, `@Public()`, `@UserOnly()`, `@RequiresTenant()`, `@CurrentUser()`, and `@CurrentTenant()` all exist in the codebase — confirmed by codebase exploration.
- The colocated `*.spec.ts` naming convention is already established (feature 021) — test files are placed next to the files they test.
- `VerifyClerkTokenUseCase` is the correct mock boundary: it is the application-layer entry point the guard calls, and it is already injected via constructor DI in `ClerkJwtGuard`.
- `Reflector` from `@nestjs/core` must be provided in the test module or mocked directly — `ClerkJwtGuard` depends on it for reading route metadata.
- Since `@CurrentUser()` and `@CurrentTenant()` are `createParamDecorator` factories (not standard decorators), testing them requires calling the inner factory function directly with a mock `ExecutionContext`, not using `@nestjs/testing`.
- `@Public()` is a `SetMetadata` call — it can be tested by asserting the metadata constant `IS_PUBLIC_KEY` is set correctly on the handler, not by running the guard.
- Tests for request context sourcing (US2) are assertions on `request.user` after `canActivate()` resolves — they do not require spinning up an HTTP server.
