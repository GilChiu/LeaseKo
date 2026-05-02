# Feature Specification: Clerk JWT Verification — NestJS Backend

**Feature Branch**: `008-clerk-jwt-nestjs`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Implement Clerk JWT verification in the NestJS backend so protected API requests are securely authenticated. Setup Clerk JWT verification in NestJS, implement Auth Guard, extract userId from token."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Protected Routes Reject Invalid Requests (Priority: P1)

As the NestJS backend, I must verify every incoming request's Clerk JWT so that only authenticated users can access protected API endpoints.

**Why this priority**: This is the foundational security gate. Without it, the frontend route protection is the only barrier — which is a critical vulnerability. All future features (properties, leases, payments) depend on this guard being in place.

**Independent Test**: Send a `GET /api/v1/me` request (a) with no `Authorization` header — expect `401 Unauthorized`. (b) with `Authorization: Bearer invalid-token` — expect `401 Unauthorized`. (c) with a valid Clerk-issued JWT — expect `200 OK` with `{ "userId": "user_..." }`. No database or Prisma is required for this test.

**Acceptance Scenarios**:

1. **Given** a request to a protected endpoint with no `Authorization` header, **When** the guard processes the request, **Then** the backend returns `401 Unauthorized`.
2. **Given** a request to a protected endpoint with `Authorization: Bearer <malformed>`, **When** the guard verifies the token, **Then** the backend returns `401 Unauthorized`.
3. **Given** a request to a protected endpoint with `Authorization: Bearer <expired-clerk-jwt>`, **When** the guard verifies the token, **Then** the backend returns `401 Unauthorized`.
4. **Given** a request to a protected endpoint with `Authorization: Bearer <valid-clerk-jwt>`, **When** the guard verifies the token, **Then** the request is allowed through and `request.user.userId` is set to the Clerk user ID.

---

### User Story 2 — Public Routes Bypass Authentication (Priority: P1)

As a developer, I want to mark certain routes as public using a `@Public()` decorator so health checks and other unauthenticated endpoints continue to work when the global guard is active.

**Why this priority**: The `/health` endpoint is required for infrastructure monitoring and must remain publicly accessible. Without a public-route mechanism, enabling the global guard would break all existing routes.

**Independent Test**: Send a `GET /api/v1/health` request with no `Authorization` header — expect `200 OK`. Confirm the health response body is returned, not a `401`.

**Acceptance Scenarios**:

1. **Given** an endpoint decorated with `@Public()`, **When** a request arrives with no `Authorization` header`, **Then** the guard allows the request through without any token verification.
2. **Given** the `GET /api/v1/health` endpoint is marked `@Public()`, **When** a monitoring system polls it with no credentials, **Then** it returns `200 OK`.
3. **Given** an endpoint is NOT decorated with `@Public()`, **When** a request arrives with no token, **Then** the guard returns `401 Unauthorized`.

---

### User Story 3 — Authenticated User Context in Controllers (Priority: P1)

As a developer, I want to access the authenticated user's ID in controllers using a `@CurrentUser()` parameter decorator, so controllers can reference the verified `userId` without reading raw request objects.

**Why this priority**: The `userId` from the verified JWT is the canonical identity for all future business logic (properties, leases, tenant lookups). Establishing the pattern now prevents unsafe workarounds in later features.

**Independent Test**: Call `GET /api/v1/me` with a valid Clerk JWT. The response body must be `{ "userId": "user_xxxx" }` where `user_xxxx` is the Clerk user ID from the token — not from a database, not from a request body field.

**Acceptance Scenarios**:

1. **Given** a controller method annotated with `@CurrentUser() user: RequestUser`, **When** a valid JWT is provided, **Then** `user.userId` contains the Clerk user ID extracted from the verified token.
2. **Given** the `GET /api/v1/me` endpoint, **When** called with a valid token, **Then** it returns `{ "userId": "user_..." }` with the correct Clerk ID.
3. **Given** the `userId` on the request context, **When** the token is verified, **Then** the `userId` comes exclusively from the JWT `sub` claim — never from request body, query params, or cookies.

---

### User Story 4 — Swagger Bearer Auth Documentation (Priority: P2)

As a developer, I want Swagger to show Bearer token auth on protected endpoints so I can test authenticated requests from the Swagger UI without needing a separate tool.

**Why this priority**: Swagger is already set up on this project. Adding Bearer auth documentation is low effort and significantly improves developer experience for all future API development. It does not block P1 stories.

**Independent Test**: Open `http://localhost:3001/api/docs`. Click "Authorize" and paste a valid Clerk JWT. Call `GET /me` from the Swagger UI and confirm a `200` response with `{ "userId": "..." }`.

**Acceptance Scenarios**:

1. **Given** the Swagger UI is open, **When** a developer clicks "Authorize" and provides a Bearer token, **Then** subsequent requests from Swagger include the `Authorization: Bearer <token>` header.
2. **Given** a protected endpoint in the Swagger UI, **When** the endpoint is viewed, **Then** it shows a lock icon indicating authentication is required and documents a `401 Unauthorized` response.
3. **Given** the public `/health` endpoint in Swagger, **When** a developer views it, **Then** no lock icon is shown (or it is clearly marked as public).

---

### Edge Cases

- What happens when the Clerk JWKS endpoint is temporarily unavailable? The token verifier should fail closed — return `401` rather than allowing requests through. Log the JWKS fetch failure as a warning.
- What happens when `CLERK_SECRET_KEY` is missing at startup? The NestJS app must fail fast with a clear error message rather than starting with auth disabled.
- What happens when the `Authorization` header is present but not in `Bearer <token>` format (e.g., `Basic ...` or just a raw token)? The guard should return `401` — only `Bearer` scheme is accepted.
- What happens when the JWT payload has no `sub` claim? Token verification should fail with `401` — the `userId` must come from a verified, non-empty `sub` claim.
- What happens if a token is valid but was issued for a different Clerk application? Clerk's verification library checks the issuer and audience — these mismatches result in `401`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The NestJS backend MUST install and use a Clerk-compatible JWT verification library (`@clerk/backend` or `@clerk/express`) to verify tokens from the `Authorization: Bearer <token>` header.
- **FR-002**: A global `AuthGuard` MUST be applied to all routes by default. Routes without explicit `@Public()` decoration are protected.
- **FR-003**: The `AuthGuard` MUST extract the `Authorization` header, validate the `Bearer` scheme, and pass the raw token to the verification service.
- **FR-004**: The token verification service MUST validate: token signature, expiry, and that the token was issued by the configured Clerk instance. Tokens failing any check MUST be rejected with `401`.
- **FR-005**: After successful verification, `request.user` MUST be set to `{ userId: string }` where `userId` is the value of the JWT `sub` claim.
- **FR-006**: A `@Public()` decorator MUST exist. When applied to a route or controller, the `AuthGuard` MUST skip token verification for that route.
- **FR-007**: A `@CurrentUser()` parameter decorator MUST exist. When used in a controller method parameter, it MUST return the `request.user` object typed as `RequestUser`.
- **FR-008**: A `GET /api/v1/me` endpoint MUST exist, be protected by the auth guard, and return `{ "userId": string }` from the verified token. No database lookup is required.
- **FR-009**: The existing `GET /api/v1/health` endpoint MUST be marked `@Public()` and continue to respond `200 OK` without a token.
- **FR-010**: `CLERK_SECRET_KEY` and `CLERK_JWKS_URL` MUST be added to `apps/api/.env.example` as documented placeholders. The Joi validation schema MUST require `CLERK_SECRET_KEY` at startup.
- **FR-011**: No Clerk secret key MUST appear in any committed file. All secrets come from environment variables only.
- **FR-012**: If Swagger is configured, it MUST be updated to include Bearer authentication (`addBearerAuth`) so developers can authenticate via the Swagger UI.
- **FR-013**: All `401` error responses MUST follow the project's existing `GlobalExceptionFilter` format — no implementation details leaked in the error body.
- **FR-014**: The auth module MUST follow Clean Architecture boundaries: token verification logic in the infrastructure layer, the use-case wrapper in application layer, guard and decorators in common infrastructure.

### Key Entities

- **RequestUser**: Represents the authenticated user context attached to every verified request. Contains `userId: string` (Clerk user ID from JWT `sub` claim). No roles, no tenant ID, no database fields — those are future features.
- **ClerkTokenVerifier**: The infrastructure service that calls Clerk's verification API. Responsible for all cryptographic and claims validation.
- **AuthGuard**: The NestJS guard that reads the `Authorization` header, delegates to `ClerkTokenVerifier`, and sets `request.user`. It also checks for the `@Public()` metadata to bypass auth.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `GET /api/v1/me` with no token returns `401` in under 50ms.
- **SC-002**: `GET /api/v1/me` with a valid Clerk JWT returns `200` with `{ "userId": "user_..." }`.
- **SC-003**: `GET /api/v1/health` returns `200` with no token (public route bypass confirmed).
- **SC-004**: NestJS startup fails immediately with a clear error if `CLERK_SECRET_KEY` is not set in the environment.
- **SC-005**: All three token failure cases (missing, malformed, expired) consistently return `401` with no details about the failure reason exposed in the response body.
- **SC-006**: Swagger UI "Authorize" dialog accepts a Bearer token and passes it to protected endpoints successfully.

## Assumptions

- `@clerk/backend` (or equivalent) is used for server-side JWT verification — it handles JWKS fetching, caching, and signature validation.
- The Clerk issuer is automatically derived from `CLERK_SECRET_KEY` when using the official SDK — `CLERK_JWKS_URL` is documented as optional fallback.
- The `GlobalExceptionFilter` already formats `UnauthorizedException` correctly — the guard only needs to throw it.
- Swagger is already configured on this project (confirmed in Feature 002/004) — only bearer auth metadata needs to be added.
- The auth module follows the existing NestJS module structure in `apps/api/src/modules/`.
- No Prisma user sync is in scope — `userId` from the token is the sole user identifier for this feature.
- No role or permission logic is in scope — only identity verification.
- No tenant/org extraction is in scope — that is Feature 009 (User Story 2.3 in the backlog).
