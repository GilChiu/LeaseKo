# Feature Specification: Swagger (OpenAPI) Integration

**Feature Branch**: `002-swagger-integration`
**Created**: 2026-05-02
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 - API Documentation Available to Developers (Priority: P1)

A backend developer or frontend developer opens a browser, navigates to the API documentation URL, and sees a fully organised, interactive API reference. They can read each endpoint's purpose, its expected inputs, its response shape, and the possible error responses — all without reading source code.

**Why this priority**: API documentation is the contract between the backend and every consumer (frontend, QA, external integrators). Without it, frontend development is blocked and integration testing is guesswork.

**Independent Test**: Can be fully tested by starting the NestJS API and navigating to `/api/docs` in a browser. Confirms the Swagger UI loads, endpoints are grouped by module tag, and each endpoint shows a description, request schema, and response schema.

**Acceptance Scenarios**:

1. **Given** the NestJS API is running, **When** a developer navigates to `/api/docs`, **Then** the Swagger UI renders with the API title, version, and description visible.
2. **Given** the Swagger UI is open, **When** a developer expands an endpoint, **Then** they see the HTTP method, path, description, request body schema (if applicable), and all possible response codes with their schemas.
3. **Given** multiple modules exist, **When** viewing the Swagger UI, **Then** endpoints are grouped into labelled sections (tags) that correspond to their module (e.g., System, Auth).
4. **Given** a DTO has required and optional fields, **When** viewing the request schema in Swagger, **Then** required fields are marked as required and optional fields show a default or description.

---

### User Story 2 - Authenticated API Testing in Swagger UI (Priority: P1)

A developer needs to test a protected endpoint. They paste their Clerk JWT into the Swagger UI, click Authorize, and can then call authenticated endpoints directly from the browser — seeing real responses without needing a separate HTTP client.

**Why this priority**: Without authentication support in Swagger UI, all protected endpoints are untestable from the docs. This blocks QA, frontend validation, and developer iteration.

**Independent Test**: Can be fully tested by obtaining a valid Clerk JWT, entering it in the Swagger UI Authorize dialog, and successfully calling the `GET /me` endpoint — confirming the response returns the caller's identity context.

**Acceptance Scenarios**:

1. **Given** the Swagger UI is open, **When** a developer clicks the Authorize button, **Then** a dialog appears prompting for a Bearer JWT token.
2. **Given** a valid Clerk JWT is entered, **When** the developer calls a protected endpoint, **Then** the request includes the Authorization header and the API returns a successful response.
3. **Given** no token is entered or an invalid token is provided, **When** the developer calls a protected endpoint, **Then** the API returns a 401 Unauthorized response and Swagger UI displays the error body.
4. **Given** the developer clicks Logout in the Authorize dialog, **When** they call a protected endpoint again, **Then** the request is made without the Authorization header and returns 401.

---

### User Story 3 - Public Endpoint Accessible Without Authentication (Priority: P2)

A monitoring system or developer checks whether the API is live by calling the health endpoint. The endpoint returns a success response without requiring any credentials.

**Why this priority**: Health monitoring is a cross-cutting operational concern. It must be publicly accessible so infrastructure probes and uptime monitors work without token management.

**Independent Test**: Can be fully tested by calling `GET /health` without any Authorization header — either from Swagger UI or a plain HTTP request — and confirming a `200 OK` response with a status field.

**Acceptance Scenarios**:

1. **Given** the API is running, **When** `GET /health` is called with no Authorization header, **Then** the response is `200 OK` with body `{ "status": "ok", "timestamp": "<ISO string>" }`.
2. **Given** the Swagger UI is open, **When** the health endpoint is called from Swagger UI without providing a token, **Then** the call succeeds and the response body is visible.
3. **Given** the health endpoint, **When** it is viewed in Swagger UI, **Then** it is tagged as "System" and marked as a public endpoint in its description.

---

### User Story 4 - Consistent Response and Error Contracts Visible in Docs (Priority: P2)

A frontend developer reading the API docs can predict exactly what a success response and an error response will look like for every endpoint — the shape is standardized and documented, not endpoint-by-endpoint ad hoc.

**Why this priority**: Inconsistent response formats force frontend code to handle each endpoint differently. A documented standard eliminates that fragility and enables generated API clients.

**Independent Test**: Can be tested by inspecting multiple endpoints in Swagger UI and confirming the response schema follows a consistent envelope structure, and that error responses (400, 401, 404) share a common shape with `statusCode`, `message`, and `error` fields.

**Acceptance Scenarios**:

1. **Given** any endpoint in Swagger UI, **When** the response schemas are inspected, **Then** all success responses conform to the same structure for their HTTP status codes.
2. **Given** an endpoint that can return errors, **When** its error response schemas are inspected, **Then** 400, 401, and 404 responses all share the same error envelope shape.
3. **Given** the `GET /me` endpoint, **When** a developer reads the Swagger response schema, **Then** they can see the exact fields that will be returned without running the API.

---

### Edge Cases

- What happens when the Swagger UI is accessed in a production environment? The documentation endpoint must be conditionally disabled or access-restricted in non-development environments to prevent API surface exposure.
- What happens when a developer enters an expired JWT in the Authorize dialog? The API returns a 401 with a clear error message; Swagger UI displays the error body.
- What happens when an endpoint is added without Swagger decorators? The spec must treat this as a build-time/review violation — no undocumented endpoints are allowed.
- What happens when a DTO field has no Swagger decorator? The field will be missing from the schema; DTOs must have complete decorator coverage.
- What happens if `/api/docs` is hit while the app is still starting? The request returns a 503 or connection refused — not an application concern; handled by infrastructure.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose an interactive API documentation UI at a configurable path (default: `/api/docs`).
- **FR-002**: The API documentation MUST include the API title, version number, and a brief description.
- **FR-003**: All API endpoints MUST be visible in the documentation — no endpoint may exist without documentation.
- **FR-004**: Endpoints MUST be grouped by module using tags (e.g., System, Auth, Tenants).
- **FR-005**: The documentation MUST support entering a Bearer JWT token to authorize requests directly from the UI.
- **FR-006**: All request body DTOs MUST have schema documentation including field names, types, required/optional status, descriptions, and example values.
- **FR-007**: All response DTOs MUST have schema documentation matching the actual response shape.
- **FR-008**: All endpoints MUST document every possible HTTP response status code they can return, including error responses.
- **FR-009**: Error responses MUST follow a consistent shape across all endpoints: `{ statusCode, message, error }`.
- **FR-010**: The `GET /health` endpoint MUST be public — accessible without authentication — and documented as such.
- **FR-011**: The `GET /me` endpoint MUST require a valid JWT and return the authenticated user's context (user ID and tenant ID derived from the token).
- **FR-012**: The documentation UI MUST NOT be accessible in production environments (controlled by environment variable).
- **FR-013**: Tenant context (tenant ID) MUST NOT be exposed as a manual input field in the documentation UI — it is always derived from the JWT.
- **FR-014**: DTOs used for request validation MUST use validation decorators aligned with their schema documentation decorators to prevent schema drift.

### Key Entities

- **API Documentation**: The rendered interactive reference for all API endpoints; includes metadata, endpoint descriptions, schemas, and auth configuration. Consumed by developers and QA.
- **Endpoint Contract**: The defined shape of a single API operation — HTTP method, path, request schema, response schemas, and authentication requirement. Owned by the controller's presentation layer.
- **Request DTO**: A typed, validated, and documented object representing the body or query of an incoming request. Carries both validation rules and schema documentation.
- **Response DTO**: A typed and documented object representing the shape of a successful or error response. Ensures consistent output structure.
- **Error Envelope**: The standardized shape of all error responses: `{ statusCode: number, message: string, error: string }`. Applied consistently across all modules.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The API documentation UI loads in under 3 seconds on a standard developer machine with the API running locally.
- **SC-002**: 100% of API endpoints are visible and documented in the UI — zero undocumented routes.
- **SC-003**: A developer with a valid Clerk JWT can successfully call a protected endpoint from the Swagger UI within 2 minutes of first opening the docs.
- **SC-004**: All error responses across all documented endpoints share an identical shape — zero inconsistencies detectable by inspecting the Swagger schema.
- **SC-005**: Adding a new module and controller following the established pattern results in its endpoints appearing in the documentation with zero changes to the Swagger bootstrap configuration.
- **SC-006**: The documentation endpoint returns a non-200 response or is unreachable when `NODE_ENV=production`.

---

## Assumptions

- The NestJS monorepo foundation (feature 001) is complete and the API app is running.
- Clerk authentication is configured in the backend for future features — this feature documents the auth pattern and demonstrates it on the `GET /me` endpoint, but does not implement full Clerk JWT verification (that is Epic 2). The `/me` endpoint returns a placeholder response until Epic 2 is complete.
- The `GET /me` endpoint uses a stub guard in this phase that accepts any Bearer token and returns mock identity data — the real Clerk guard will replace it in Epic 2.
- API versioning (`/api/v1`) is handled via a global prefix set in `main.ts`; the Swagger base path reflects this prefix.
- The documentation is intended for internal developer use only — not a publicly hosted developer portal.
- Both the `/health` and `/me` endpoints are located in the NestJS `apps/api` app established in feature 001.
- DTOs will use `class-validator` for runtime validation and `@nestjs/swagger` decorators for schema documentation; both are applied to the same DTO class.
