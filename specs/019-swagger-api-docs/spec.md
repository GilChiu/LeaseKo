# Feature Specification: Swagger API Documentation Setup

**Feature Branch**: `019-swagger-api-docs`
**Created**: 2026-05-06
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer inspects and tests all available API endpoints through a browser-based documentation interface (Priority: P1)

A frontend developer needs to know what endpoints the backend exposes, what data they return, and how to authenticate. They open the API documentation URL in their browser and see a list of all current endpoints — health check, current user, tenant context — with descriptions, expected response shapes, and example values. They can paste a JWT token once and test any protected endpoint directly from the browser without writing any code or using an external tool.

**Why this priority**: Without discoverable, interactive documentation, every frontend–backend integration requires manual coordination. A browser-accessible contract is the minimum viable API communication layer.

**Independent Test**: Start the backend server. Open the documentation UI in a browser. Verify that all existing endpoints (`GET /health`, `GET /me`, `GET /tenant-context`) appear with their descriptions, response schemas, and authentication requirements.

**Acceptance Scenarios**:

1. **Given** the backend is running in development mode, **When** a developer opens the documentation UI URL in a browser, **Then** an interactive API documentation page is displayed listing all current endpoints.
2. **Given** the documentation UI is open, **When** the developer locates the `GET /health` endpoint, **Then** it shows: it is public (no auth required), its response shape with `status`, `service`, and `timestamp` fields, and an example response.
3. **Given** the documentation UI is open, **When** the developer locates `GET /me`, **Then** it shows: it requires Bearer authentication, its response shape with `userId` field, and a documented `401 Unauthorized` response.
4. **Given** the documentation UI is open, **When** the developer locates `GET /tenant-context`, **Then** it shows: it requires Bearer authentication, an active organization context, its response with `tenantId`, and documented `401` and `403` responses.
5. **Given** the documentation UI is open, **When** the developer inputs a valid Bearer JWT using the authorization control, **Then** they can execute authenticated requests to protected endpoints directly from the UI.
6. **Given** the backend is running in production mode, **When** a request is made to the documentation UI URL, **Then** the documentation UI is not accessible (it is disabled in production).

---

### User Story 2 — Frontend developer reads consistent, predictable error response shapes from the documentation before writing any client-side error handling (Priority: P1)

A frontend developer is building the error-handling utility for the web application. Before writing any code, they check the API documentation and find every error response documented with the same standard shape: `success`, `error.code`, `error.message`, `error.statusCode`, `error.timestamp`, and `error.path`. They write a single error parser that works for all endpoints.

**Why this priority**: Inconsistent or absent error documentation causes the frontend to guess. Since a standard error shape was established in the previous feature, documenting it correctly is equally critical.

**Independent Test**: Open the documentation UI. Inspect the `401 Unauthorized` and `403 Forbidden` responses on any protected endpoint. Verify both use the same standard error schema with `success: false` and nested `error` object.

**Acceptance Scenarios**:

1. **Given** the documentation UI is open, **When** the developer inspects any protected endpoint's error responses, **Then** the `401` and `403` responses show the standard error schema with `success`, `error.code`, `error.message`, `error.statusCode`, `error.timestamp`, and `error.path`.
2. **Given** the documentation UI is open, **When** the developer compares the error schema across multiple endpoints, **Then** all endpoints use the same shared error response definition — not duplicated inline schemas.
3. **Given** any endpoint that performs input validation, **When** the documentation shows the `400` error response, **Then** it includes the optional `error.details.fields` structure for field-level validation messages.

---

### User Story 3 — Backend developer adds a new endpoint and follows an established documentation pattern without guessing how to format Swagger decorators (Priority: P2)

A backend developer is implementing a new `CreateProperty` endpoint for the next sprint. They look at the documentation setup for the existing `GET /me` and `GET /tenant-context` endpoints as a reference. They see a consistent pattern for tagging, auth requirements, response schemas, and error responses. They follow the same pattern and their new endpoint appears correctly in the documentation without any additional setup.

**Why this priority**: A documented, consistent pattern multiplies the value of the documentation setup as the codebase grows. Without an established pattern, each developer invents their own approach.

**Independent Test**: Open the docs reference file and find a clear, copy-pasteable pattern for documenting a new endpoint (auth required, 200 response, 401/403 errors). Follow the pattern and confirm the new endpoint appears in the documentation UI.

**Acceptance Scenarios**:

1. **Given** a developer reference document exists, **When** a backend developer needs to document a new endpoint, **Then** they can find the exact decorator pattern to use for public endpoints, user-protected endpoints, and tenant-protected endpoints.
2. **Given** the reference document exists, **When** a developer creates a new response DTO, **Then** the document explains which property annotation decorators to use and where to place response DTOs.
3. **Given** the documented pattern is followed for a new endpoint, **When** the backend is restarted, **Then** the new endpoint appears in the documentation UI automatically — no changes to bootstrap configuration are needed.

---

### Edge Cases

- What if the server is in production mode when a developer tries to access the docs? → Documentation is not served; the route returns a 404 or equivalent. This is intentional and must not be changed.
- What if a developer adds a Swagger decorator to a domain entity or application use case? → The documentation reference must explicitly state this is not allowed and show the correct presentation-layer-only placement.
- What if an endpoint does not yet have Swagger decorators? → It will still appear in the documentation but without descriptions or typed schemas — this is acceptable for undocumented endpoints; they should be progressively decorated.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The API documentation interface MUST be accessible via a browser at a fixed URL when the server is running in development mode.
- **FR-002**: The documentation interface MUST NOT be accessible when the server is running in production mode.
- **FR-003**: The documentation interface MUST support Bearer JWT input so developers can authorize and execute requests directly from the UI.
- **FR-004**: All three current system endpoints (`GET /health`, `GET /me`, `GET /tenant-context`) MUST appear in the documentation with operation summaries and response schemas.
- **FR-005**: The `GET /health` endpoint MUST be documented as publicly accessible (no authentication required).
- **FR-006**: The `GET /me` endpoint MUST be documented as requiring Bearer authentication and MUST show a `401` error response using the standard error schema.
- **FR-007**: The `GET /tenant-context` endpoint MUST be documented as requiring Bearer authentication and an active organization context, and MUST show both `401` and `403` error responses using the standard error schema.
- **FR-008**: All error responses across all endpoints MUST reference the same shared standard error schema — no inline-duplicated error shapes.
- **FR-009**: The standard error schema MUST include `success`, `error.code`, `error.message`, `error.statusCode`, `error.timestamp`, `error.path`, and optional `error.details`.
- **FR-010**: All response DTOs for documented endpoints MUST include property descriptions and example values visible in the documentation UI.
- **FR-011**: A developer reference document MUST exist explaining how to access the documentation UI, how to authorize in the UI, and how to document a new endpoint following the established pattern.
- **FR-012**: Swagger decorators MUST only appear in the presentation layer — controllers and presentation-layer DTOs. They MUST NOT appear in domain entities, application use cases, or infrastructure repositories.

### Key Entities

- **API Endpoint Documentation**: A machine-readable and human-browsable description of an HTTP endpoint — its method, path, auth requirement, request shape, and response shapes (success and error).
- **Standard Error Schema**: The shared error response definition referenced by all endpoints — `{ success: false, error: { code, message, statusCode, timestamp, path, details? } }`.
- **Response DTO**: A presentation-layer data transfer object that defines the shape of a response body and its property metadata (descriptions, examples).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer can open the documentation UI in a browser within 30 seconds of the server starting, with no additional configuration.
- **SC-002**: All three current system endpoints are visible and fully described in the documentation UI — 100% coverage of existing endpoints.
- **SC-003**: A developer can authorize using a Bearer JWT and successfully execute a protected endpoint request entirely within the documentation UI — without using any external tool.
- **SC-004**: All error response schemas across all documented endpoints reference the same shared definition — zero duplicated inline error schema definitions.
- **SC-005**: A new backend developer can find the documentation pattern and document a new endpoint correctly within 5 minutes of reading the reference document.
- **SC-006**: The documentation UI is not accessible from a production deployment — confirmed by the server returning a non-200 status for the documentation URL in production mode.

---

## Assumptions

- The backend server is always started in development mode for local documentation access; production deployments never expose the documentation UI.
- Swagger decorators are already partially present on some existing controllers from earlier features — this feature ensures complete and consistent coverage across all current endpoints.
- The standard error response shape (`{ success: false, error: { ... } }`) was established in the previous feature and must not be redefined here; this feature only ensures it is correctly referenced in Swagger documentation.
- The documentation reference will live in `docs/` alongside other architecture documentation already present in the project.
- No new business endpoints are added as part of this feature — documentation covers only the three existing system endpoints.
- The Bearer auth token format is a Clerk-issued JWT; the documentation UI must allow manual token input but must not persist or display token values.
