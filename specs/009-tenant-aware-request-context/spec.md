# Feature Specification: Tenant-Aware Request Context

**Feature Branch**: `009-tenant-aware-request-context`
**Created**: 2026-05-03
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Authenticated Requests Carry Tenant Context (Priority: P1)

When a user belonging to a Clerk organization makes any authenticated API request, the backend extracts the organization ID from the verified JWT and attaches it as `tenantId` to the request context alongside the existing `userId`.

**Why this priority**: Without tenant context in the request, no multi-tenant data isolation is possible. This is the foundational capability for all future tenant-scoped features (Epic 3, Epic 4).

**Independent Test**: Send a valid Clerk JWT that contains an `org_id` claim to any protected endpoint. Verify that the response (or server logs) confirms both `userId` and `tenantId` are present on the request context.

**Acceptance Scenarios**:

1. **Given** a verified Clerk JWT containing an `org_id` claim, **When** the request reaches a protected endpoint, **Then** `request.user.userId` equals the JWT `sub` claim and `request.user.tenantId` equals the JWT `org_id` claim.
2. **Given** a verified Clerk JWT containing an `org_id` claim, **When** a controller method uses the `@CurrentUser()` decorator, **Then** it receives an object with both `userId` and `tenantId` populated.
3. **Given** a verified Clerk JWT containing an `org_id` claim, **When** a controller method uses the `@CurrentTenant()` decorator, **Then** it receives only the `tenantId` string.

---

### User Story 2 — Missing Tenant Context Is Rejected (Priority: P1)

When an authenticated user presents a valid Clerk JWT that does not contain an organization ID (e.g. the user has not joined an organization), requests to tenant-protected routes are rejected with an appropriate error.

**Why this priority**: Allowing tenant-unscoped requests through to business logic would violate data isolation guarantees. Failing fast at the guard layer prevents incorrect data access.

**Independent Test**: Obtain a Clerk JWT from a user who is not a member of any organization. Send it to the `GET /auth/me` endpoint. Verify `403 Forbidden` is returned.

**Acceptance Scenarios**:

1. **Given** a verified Clerk JWT with no `org_id` claim, **When** the request targets a tenant-required route, **Then** the response is `403 Forbidden` with a safe, non-leaking error message.
2. **Given** a verified Clerk JWT with no `org_id` claim, **When** the server processes the request, **Then** no internal JWT claims or token structure are included in the error response.

---

### User Story 3 — Public Routes Remain Unaffected (Priority: P1)

Routes decorated with `@Public()` continue to respond without requiring authentication or tenant context.

**Why this priority**: Breaking the health endpoint or Swagger docs would block all development and operational workflows.

**Independent Test**: Send `GET /health` with no `Authorization` header. Verify `200 OK` is returned.

**Acceptance Scenarios**:

1. **Given** no `Authorization` header on the request, **When** `GET /health` is called, **Then** the response is `200 OK` with `{ "status": "ok" }`.
2. **Given** a valid JWT with no `org_id`, **When** `GET /health` is called, **Then** the response is still `200 OK` (public routes bypass all auth checks).

---

### User Story 4 — Sample Endpoint Exposes User and Tenant Context (Priority: P2)

A `GET /auth/me` endpoint returns the verified `userId` and `tenantId` from the request context, enabling developers to confirm end-to-end context flow without any database lookup.

**Why this priority**: This is the primary developer verification tool for the request context implementation. It enables testing the full context flow before any Prisma or business logic is built.

**Independent Test**: Send a valid Clerk JWT with `org_id` to `GET /auth/me`. Verify the response body is `{ "userId": "user_...", "tenantId": "org_..." }`.

**Acceptance Scenarios**:

1. **Given** a valid JWT with both `sub` and `org_id` claims, **When** `GET /auth/me` is called, **Then** the response is `200 OK` with `{ "userId": "<sub>", "tenantId": "<org_id>" }`.
2. **Given** a valid JWT with `sub` but no `org_id`, **When** `GET /auth/me` is called, **Then** the response is `403 Forbidden`.
3. **Given** no JWT, **When** `GET /auth/me` is called, **Then** the response is `401 Unauthorized`.

---

### Edge Cases

- What happens when the JWT `org_id` claim is present but is an empty string? → Treated as absent; `403 Forbidden` returned.
- What happens when tenantId is passed in the request body or query params? → Ignored entirely; only the JWT-derived value is used.
- What happens if `@CurrentTenant()` is used on a public route (where `request.user` is undefined)? → Returns `undefined`; callers on public routes must not rely on tenant context.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The auth guard MUST extract the `org_id` claim from the verified Clerk JWT and attach it as `tenantId` to `request.user`.
- **FR-002**: The auth guard MUST set `request.user.tenantId` only from the verified JWT — never from request body, query params, or arbitrary headers.
- **FR-003**: Routes not decorated with `@Public()` that are accessed with a JWT missing `org_id` MUST return `403 Forbidden`.
- **FR-004**: The `IRequestContext` type MUST be updated to reflect that `tenantId` is `string | null`, where `null` indicates the JWT did not include an org claim.
- **FR-005**: A `@CurrentTenant()` parameter decorator MUST be created that reads `request.user.tenantId` from the execution context.
- **FR-006**: The existing `@CurrentUser()` decorator MUST return the full `IRequestContext` (including `tenantId`).
- **FR-007**: The `GET /auth/me` endpoint MUST return `{ userId, tenantId }` from the request context with no database lookup.
- **FR-008**: All error responses MUST omit raw JWT claims, token structures, and internal error details.
- **FR-009**: Future Prisma repositories MUST receive `tenantId` as an explicit parameter from use cases — not by parsing the HTTP request themselves.
- **FR-010**: Future BullMQ job payloads MUST include `{ userId, tenantId }` sourced from the request context at the time of job creation.

### Key Entities

- **IRequestContext**: The runtime-only object attached to `request.user` by the auth guard. Contains `userId: string`, `tenantId: string | null`, `role: string | null`. Not persisted.
- **ClerkJwtGuard**: The global NestJS guard that verifies the Clerk JWT and populates `IRequestContext` on every authenticated request.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `GET /auth/me` with a valid JWT containing `org_id` returns `200 OK` with correct `userId` and `tenantId` in under 500ms (excluding cold start).
- **SC-002**: `GET /auth/me` with a valid JWT missing `org_id` returns `403 Forbidden` 100% of the time.
- **SC-003**: `GET /health` with no token returns `200 OK` 100% of the time after this feature is implemented.
- **SC-004**: Zero requests with tenantId sourced from request body/query params reach business logic — enforced structurally, not by convention.
- **SC-005**: All TypeScript compilation checks pass with zero errors after implementation.

## Assumptions

- Clerk organizations are the multi-tenancy mechanism — each Clerk organization maps 1:1 to a `tenantId`.
- The Clerk JWT `org_id` claim is the canonical source of truth for tenant identity; no alternative claim (e.g. custom template) is used.
- A user without an active Clerk organization membership is not yet supported for tenant-scoped routes; this is by design for this feature.
- Clerk JWT verification (`@clerk/backend verifyToken`) is already implemented and working (Feature 008).
- No database lookup is required for tenant resolution at this stage — the JWT claim is sufficient.
- Role-based access control (RBAC) is out of scope for this feature; `role` remains `null`.
- Prisma is not yet installed; no ORM queries are part of this feature.
- BullMQ jobs are not yet implemented; no queue logic is part of this feature.
