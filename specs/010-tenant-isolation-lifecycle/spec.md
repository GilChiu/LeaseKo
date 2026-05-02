# Feature Specification: Tenant Isolation Request Lifecycle Enforcement

**Feature Branch**: `010-tenant-isolation-lifecycle`
**Created**: 2026-05-03
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Tenant-Scoped Route Rejects Missing Tenant Context (Priority: P1)

A caller holding a valid, authenticated JWT but with no active Clerk organization session attempts to access a tenant-scoped business endpoint. The system must reject the request with `403 Forbidden` before any business logic runs.

**Why this priority**: This is the core safety guarantee of the feature. Without it, tenant data can leak across organizations. Every subsequent story depends on this boundary being enforced first.

**Independent Test**: `curl POST /api/v1/properties` (or any business route) with a valid JWT that has no `o.id` claim → `403 Forbidden`. No database access, no business logic executes.

**Acceptance Scenarios**:

1. **Given** a valid Clerk JWT with no active organization, **When** the request reaches a tenant-scoped route, **Then** the system returns `403 Forbidden` with no internal detail exposed.
2. **Given** a request with no `Authorization` header to a protected route, **When** the guard processes it, **Then** the system returns `401 Unauthorized`.
3. **Given** a request with a tampered or expired JWT, **When** the guard processes it, **Then** the system returns `401 Unauthorized`.

---

### User Story 2 — Authenticated User Can Access User-Only Routes Without Tenant (Priority: P2)

Some protected routes — such as organization selection or initial onboarding — require a valid authenticated user but must not require an active tenant context. A user that has just signed in but not yet joined an organization must be able to reach these routes.

**Why this priority**: Without user-only route support, the onboarding and org-selection screens cannot function for new users. It unblocks all pre-tenant flows without compromising tenant isolation.

**Independent Test**: `GET /api/v1/auth/me` (or an equivalent `@UserOnly()` route) with a valid JWT and no org context → `200` with `{ userId }`. No `tenantId` in the response.

**Acceptance Scenarios**:

1. **Given** a valid JWT with `userId` but no `tenantId`, **When** the request hits a `@UserOnly()` decorated route, **Then** the system returns `200` with user context.
2. **Given** a valid JWT with both `userId` and `tenantId`, **When** the request hits a `@UserOnly()` route, **Then** the system still returns `200` (tenant context is accepted but not required).
3. **Given** no `Authorization` header, **When** the request hits a `@UserOnly()` route, **Then** `401 Unauthorized` is returned.

---

### User Story 3 — Public Routes Remain Accessible Without Any Token (Priority: P2)

System endpoints decorated with `@Public()` — such as `GET /health` — must continue to work without any `Authorization` header and without any user or tenant context.

**Why this priority**: Public routes are foundational for infrastructure health checks, CI pipelines, and Swagger. Breaking them would block deployment pipelines and observability.

**Independent Test**: `curl http://localhost:3001/api/v1/health` with no headers → `200 { status: "ok" }`. No token or tenant context involved.

**Acceptance Scenarios**:

1. **Given** a request to `GET /health` with no `Authorization` header, **When** the guard evaluates it, **Then** `200` is returned immediately.
2. **Given** a request to `GET /health` with a valid JWT, **When** the guard evaluates it, **Then** `200` is returned (token is ignored, not validated).

---

### User Story 4 — Sample Tenant-Protected Endpoint Returns Tenant Context (Priority: P3)

A developer or tester with a valid JWT and an active Clerk organization session calls `GET /tenant-context`. The system returns `{ tenantId }` from the request context — no database queries, no business logic.

**Why this priority**: This is a verification endpoint for the tenant isolation system itself. It enables end-to-end testing of the full enforcement chain without coupling to business features.

**Independent Test**: `curl GET /api/v1/tenant-context -H "Authorization: Bearer <jwt-with-org>"` → `200 { "tenantId": "org_..." }`.

**Acceptance Scenarios**:

1. **Given** a valid JWT with active org, **When** `GET /tenant-context` is called, **Then** `200 { tenantId: "org_..." }` is returned.
2. **Given** a valid JWT without active org, **When** `GET /tenant-context` is called, **Then** `403 Forbidden` is returned.
3. **Given** no token, **When** `GET /tenant-context` is called, **Then** `401 Unauthorized` is returned.

---

### Edge Cases

- What happens when the JWT is valid but the Clerk organization has been deleted? The token still contains `o.id` — system will treat `tenantId` as valid until the token expires; revocation is not in scope.
- What happens when a route is decorated with both `@Public()` and `@RequiresTenant()`? `@Public()` must win — the guard exits before tenant checks.
- What happens when `tenantId` is present in the request body as well as the JWT? The body value is ignored entirely; only the JWT-derived `tenantId` is used.
- What happens if `@CurrentTenant()` is used on a `@UserOnly()` route? Returns `null` — callers must handle this.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST define `tenantId` as the verified Clerk organization ID extracted exclusively from the `o.id` claim in the verified Clerk JWT.
- **FR-002**: The system MUST reject any request to a tenant-scoped route where `tenantId` is absent with `403 Forbidden` before any application logic executes.
- **FR-003**: The system MUST reject any request to a protected route (tenant or user-only) with no or invalid JWT with `401 Unauthorized`.
- **FR-004**: The system MUST provide a `@RequiresTenant()` decorator that marks routes as requiring active tenant context.
- **FR-005**: The system MUST provide a `@UserOnly()` decorator that marks routes as requiring authentication but not tenant context.
- **FR-006**: The system MUST provide a `@Public()` decorator that marks routes as requiring no authentication or tenant context.
- **FR-007**: The system MUST provide a `@CurrentTenant()` parameter decorator that returns `tenantId` from the request context — never from JWT, body, query, or headers.
- **FR-008**: `tenantId` MUST NOT be accepted from request body, query parameters, or any request header other than the verified `Authorization: Bearer` token.
- **FR-009**: The system MUST expose a `GET /tenant-context` endpoint that returns `{ tenantId }` for valid tenant-authenticated requests, returning `403` when tenant context is absent.
- **FR-010**: Error responses for missing tenant context MUST NOT expose raw JWT claims, Clerk internals, or the specific missing claim name.
- **FR-011**: All existing `@Public()` routes (e.g., `GET /health`) MUST continue to function without any token.
- **FR-012**: The enforcement mechanism MUST execute before controllers or use-case handlers receive control.

### Tenant ID Strategy (Normative)

| Property | Value |
| -------- | ----- |
| Source | Clerk JWT claim `o.id` (v2 compact format) |
| Type | `string \| null` |
| Normalization | No transformation — used as-is from verified JWT |
| Scope | Per HTTP request — re-derived on every request |
| Trust boundary | Verified JWT only — never from body / query / header |
| Absence behavior | `null` in `request.user.tenantId`; `403` on tenant-required routes |

### Key Entities

- **`IRequestContext`**: `{ userId: string; tenantId: string | null; role: string | null }` — the typed shape of `request.user` set by the global guard on every authenticated request.
- **Tenant Route**: Any business route decorated with `@RequiresTenant()` — requires `tenantId !== null` to proceed.
- **User-Only Route**: Any protected route decorated with `@UserOnly()` — requires `userId` but allows `tenantId === null`.
- **Public Route**: Any route decorated with `@Public()` — no authentication or tenant context required.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of requests to tenant-scoped routes with a missing `tenantId` receive `403 Forbidden` — verified by automated or manual tests covering all three decorator types.
- **SC-002**: 0 controllers or use cases manually parse the `Authorization` header or inspect JWT claims — enforced by code review against the clean architecture rule.
- **SC-003**: Public routes (`GET /health`) respond in under 50 ms with no token — no guard overhead for explicitly public endpoints.
- **SC-004**: The `GET /tenant-context` endpoint correctly returns `{ tenantId }` for org-authenticated requests and `403` for non-org requests — verified end-to-end with a live Clerk JWT.
- **SC-005**: `@CurrentTenant()` returns `null` on user-only routes and a non-null `string` on tenant routes — verified by unit or integration test.

---

## Assumptions

- The Clerk JWT verification infrastructure (`verifyToken`, `ClerkJwtGuard`, `IRequestContext`) from Features 008 and 009 is already in place and functioning.
- `@RequiresTenant()`, `IS_TENANT_REQUIRED_KEY`, `@CurrentTenant()`, and `@CurrentUser()` decorators from Feature 009 are already created and will be extended or referenced, not recreated.
- Prisma is not yet integrated — no database queries are required or expected in this feature.
- RBAC (role-based access control) is out of scope; the `role` field in `IRequestContext` remains `null`.
- BullMQ job creation is out of scope; `tenantId` propagation to jobs is documented as a future rule only.
- The `@UserOnly()` decorator is new — it does not currently exist in the codebase.
- All new routes live within `apps/api`; no frontend changes are required.
- Tenant context is per-request only — there is no persistent session or in-memory tenant state.
