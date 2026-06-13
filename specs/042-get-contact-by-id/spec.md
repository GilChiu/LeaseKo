# Feature Specification: Get Renter Contact by ID

**Feature Branch**: `sprint/003`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User Description: "As a landlord, I want to retrieve a single renter contact by ID via the API so that I can inspect their full profile and details."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Successfully Retrieve a Renter Contact (Priority: P1)

A landlord requests a specific renter contact by ID. The system verifies the contact exists and belongs to the landlord's workspace, then returns the full contact record.

**Why this priority**: This is the entire purpose of the feature. Without a working single-record retrieval path, landlords cannot view a specific contact's details.

**Independent Test**: Create a contact in the authenticated workspace. Call `GET /contacts/{id}` with that contact's ID. Verify a 200 response containing all stored fields — `id`, `tenantId`, `firstName`, `lastName`, `email`, `phone`, `idNumber`, `notes`, `createdAt`, `updatedAt` — and confirm `deletedAt` is not present in the response.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with an active workspace, **When** they request a contact by its ID that exists in their workspace, **Then** a 200 response is returned with the complete contact record.
2. **Given** a contact that has optional fields set to null, **When** the contact is retrieved, **Then** those fields are returned as null — not absent.
3. **Given** a contact record, **When** retrieved, **Then** the response includes `tenantId` confirming the workspace scope, but does not include `deletedAt`.

---

### User Story 2 — Contact Not Found (Priority: P2)

Any ID that does not resolve to an active contact in the authenticated workspace — whether non-existent, cross-tenant, or archived — returns a 404. These cases are intentionally indistinguishable to prevent information leakage about other workspaces' data.

**Why this priority**: Correct not-found handling is a data privacy requirement. A different status code for cross-tenant vs. missing records would reveal the existence of data in other workspaces.

**Independent Test**: Call `GET /contacts/{id}` with a random UUID that does not exist. Verify 404. Call with the ID of a contact from a different workspace. Verify 404 — identical to not-found. Call with the ID of an archived contact in the same workspace. Verify 404.

**Acceptance Scenarios**:

1. **Given** an ID that does not exist in the database at all, **When** a landlord requests it, **Then** a 404 is returned.
2. **Given** an ID of a contact that belongs to workspace B, **When** a landlord in workspace A requests it, **Then** a 404 is returned — indistinguishable from scenario 1.
3. **Given** an ID of a contact in the current workspace that has been archived (soft-deleted), **When** requested, **Then** a 404 is returned — archived contacts are treated as non-existent.
4. **Given** a malformed ID (random string, special characters, empty-like value), **When** submitted as the path parameter, **Then** a 404 is returned — no format validation is applied to the ID; a lookup is attempted and fails to find a record.

---

### User Story 3 — Workspace Isolation and Authentication (Priority: P3)

The workspace that scopes the lookup is always derived from the authenticated session. Unauthenticated requests and requests without an active workspace are rejected before any data access occurs.

**Why this priority**: Authentication and workspace isolation are security requirements. Without them, any caller could retrieve any contact.

**Independent Test**: Call without an `Authorization` header — verify 401. Call with a valid JWT but no active organization — verify 403. Call with a valid ID and a `tenantId` in the query string pointing to a different workspace — verify the response is scoped to the session workspace, not the query-string value.

**Acceptance Scenarios**:

1. **Given** no `Authorization` header, **When** `GET /contacts/{id}` is called, **Then** a 401 is returned.
2. **Given** a valid JWT with no active organization, **When** called, **Then** a 403 is returned.
3. **Given** a contact in workspace A and a `?tenantId=workspace-b` in the query string, **When** called by a landlord in workspace A, **Then** the lookup is scoped to workspace A — the query-string value is ignored.

---

### Edge Cases

- **Archived contact**: Returns 404 — identical to not-found. No distinction is made.
- **Cross-tenant ID**: Returns 404 — identical to not-found. The existence of data in other workspaces is never revealed.
- **Malformed ID** (e.g., `"not-a-uuid"`, `"123"`, `"../etc/passwd"`): Returns 404 — the system attempts the lookup, finds nothing, and returns not-found. No special validation error for the path parameter.
- **`deletedAt` in response**: Never included — clients do not need archival timestamps.
- **`tenantId` in query string or body**: Silently ignored; lookup always uses the session workspace.
- **Contact with all optional fields null**: Returns 200 with all optional fields present as null — not absent.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an endpoint that retrieves a single renter contact by ID, scoped to the authenticated session's workspace.
- **FR-002**: The endpoint MUST return the full contact record on success: `id`, `tenantId`, `firstName`, `lastName`, `email`, `phone`, `idNumber`, `notes`, `createdAt`, `updatedAt`. The `deletedAt` field MUST NOT be included in the response.
- **FR-003**: If the contact ID does not exist in the current workspace, the endpoint MUST return a not-found error. This applies to all three cases: ID never existed, ID belongs to another workspace, ID is for an archived contact.
- **FR-004**: The three not-found cases (non-existent, cross-tenant, archived) MUST return an identical response — they MUST be indistinguishable to the caller to prevent information leakage.
- **FR-005**: No format validation MUST be applied to the ID path parameter. If the ID matches no active contact in the workspace, 404 is returned regardless of the ID's format.
- **FR-006**: The workspace that scopes the lookup MUST be derived exclusively from the authenticated session — it MUST NOT be accepted from the query string, request body, or header.
- **FR-007**: An unauthenticated request MUST be rejected with an authentication error.
- **FR-008**: A request from an authenticated user with no active workspace MUST be rejected with a workspace-context error.

### Key Entities

- **RenterContact** (read-only in this feature): A person record belonging to a workspace. Fields: id, first name, last name, email, phone, ID number, notes, creation timestamp, update timestamp. Called `TenantContact` in the data model.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord with a valid session can retrieve a contact by ID in under 2 seconds end-to-end.
- **SC-002**: 100% of requests for IDs not in the authenticated workspace return 404 — 0% reveal cross-tenant data.
- **SC-003**: 100% of requests for archived contacts return 404 — archived contacts are fully invisible via this endpoint.
- **SC-004**: 0% of responses include the `deletedAt` field — archival state is never exposed to callers.
- **SC-005**: 100% of requests with `tenantId` in the query string are scoped to the session workspace — client-supplied workspace identifiers are never honoured.

## Assumptions

- The endpoint path is `GET /api/v1/contacts/:id`, extending the existing `/contacts` route prefix established by US 12.1 and US 12.2.
- No format validation is applied to the `:id` path parameter — the system performs a lookup and returns 404 if nothing is found, regardless of the ID's shape.
- The response shape reuses `TenantContactResponseDto` from US 12.1 — no new response structure is needed.
- The `findById(id, tenantId)` repository method filters by both `id` and `tenantId` and excludes archived records (`deletedAt IS NULL`), making cross-tenant and archived cases return the same null as not-found.
- This feature covers the backend API only — the UI for viewing a contact profile is a separate story.
