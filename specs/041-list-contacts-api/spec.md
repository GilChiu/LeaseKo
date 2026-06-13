# Feature Specification: List Renter Contacts

**Feature Branch**: `sprint/003`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User Description: "As a landlord, I want to list all renter contacts in my workspace via the API so that I can view and manage the people renting my units."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — List Renter Contacts with Pagination (Priority: P1)

A landlord requests their workspace's renter contacts. The system returns a paginated list of active contacts scoped to the authenticated session's workspace, ordered newest-first, with a total count and pagination metadata.

**Why this priority**: This is the entire purpose of the feature. Without a working list endpoint, landlords cannot browse or manage their renter contacts at all.

**Independent Test**: With at least one active contact in the workspace, call the endpoint with no query parameters. Verify a 200 response containing an `items` array with the correct contacts, a `total` count matching the number of active contacts in the workspace, `page: 1`, and `limit: 20`.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with 3 active contacts, **When** they call `GET /contacts` with no query params, **Then** all 3 contacts are returned in `items`, `total` is 3, `page` is 1, and `limit` is 20.
2. **Given** a landlord with 25 active contacts, **When** they call `GET /contacts?page=1&limit=20`, **Then** 20 contacts are returned and `total` is 25.
3. **Given** a landlord with 25 active contacts, **When** they call `GET /contacts?page=2&limit=20`, **Then** 5 contacts are returned and `total` is 25.
4. **Given** a landlord with 5 active contacts, **When** they call `GET /contacts?limit=100`, **Then** all 5 contacts are returned — a limit of 100 is accepted.
5. **Given** contacts in the workspace, **When** the list is returned, **Then** contacts are ordered by creation date descending (newest first).
6. **Given** contacts exist, **When** the response is returned, **Then** each contact item includes: `id`, `tenantId`, `firstName`, `lastName`, `email`, `phone`, `idNumber`, `notes`, `createdAt`, `updatedAt`.

---

### User Story 2 — Empty and Out-of-Range Pages (Priority: P2)

The system gracefully handles workspaces with no contacts and requests for pages beyond the last page, returning an empty list rather than an error.

**Why this priority**: A new workspace has no contacts. Returning 200 with an empty array rather than 404 allows clients to treat list endpoints uniformly without special-casing empty states.

**Independent Test**: Call the endpoint on a workspace with zero contacts. Verify a 200 response with an empty `items` array and `total: 0`. Then create 1 contact and call with `page=99`. Verify 200 with empty `items` and `total: 1`.

**Acceptance Scenarios**:

1. **Given** a workspace with no contacts, **When** `GET /contacts` is called, **Then** the response is 200 with `items: []` and `total: 0`.
2. **Given** a workspace with 5 contacts, **When** `GET /contacts?page=99` is called, **Then** the response is 200 with `items: []` and `total: 5` — not a 404.
3. **Given** a workspace with only archived (soft-deleted) contacts, **When** `GET /contacts` is called, **Then** the response is 200 with `items: []` and `total: 0` — archived contacts are excluded.

---

### User Story 3 — Pagination Validation (Priority: P3)

The system rejects invalid pagination parameters with a descriptive validation error before attempting any data access.

**Why this priority**: Without validation, invalid inputs (page=0, limit=999) can cause unpredictable behaviour or unnecessary database load.

**Independent Test**: Call `GET /contacts?page=0`. Verify a 400 response with a validation error for `page`. Call `GET /contacts?limit=101`. Verify a 400 response with a validation error for `limit`.

**Acceptance Scenarios**:

1. **Given** a request with `page=0`, **When** submitted, **Then** a 400 validation error is returned for `page` — page must be at least 1.
2. **Given** a request with `page=-5`, **When** submitted, **Then** a 400 validation error is returned for `page`.
3. **Given** a request with `page=abc` (non-integer), **When** submitted, **Then** a 400 validation error is returned for `page`.
4. **Given** a request with `limit=0`, **When** submitted, **Then** a 400 validation error is returned for `limit` — limit must be at least 1.
5. **Given** a request with `limit=101`, **When** submitted, **Then** a 400 validation error is returned for `limit` — limit must not exceed 100.
6. **Given** a request with `limit=abc` (non-integer), **When** submitted, **Then** a 400 validation error is returned for `limit`.
7. **Given** both `page` and `limit` are invalid, **When** submitted, **Then** both errors are returned in a single response.

---

### User Story 4 — Workspace Isolation and Authentication (Priority: P4)

The workspace that scopes the results is always derived from the authenticated session — it can never be supplied by the caller. Unauthenticated requests and requests without an active workspace are rejected.

**Why this priority**: Without strict workspace isolation, a landlord could retrieve another landlord's contacts — a critical data privacy failure.

**Independent Test**: Call without an `Authorization` header. Verify 401. Call with a valid JWT that has no active organization. Verify 403. Call with `?tenantId=other-workspace` in the query string. Verify the results are still scoped to the session workspace.

**Acceptance Scenarios**:

1. **Given** no `Authorization` header, **When** `GET /contacts` is called, **Then** 401 is returned.
2. **Given** a valid JWT with no active organization, **When** `GET /contacts` is called, **Then** 403 is returned.
3. **Given** workspace A and workspace B both have contacts with the same email, **When** a landlord in workspace A calls `GET /contacts`, **Then** only workspace A's contacts are returned — workspace B's contacts are never visible.
4. **Given** a request with `?tenantId=workspace-b-id` in the query string, **When** processed, **Then** the results are scoped to the session workspace — the query-string value is ignored.

---

### Edge Cases

- **Empty workspace**: Returns 200 with `items: []` and `total: 0` — not 404.
- **Page beyond last**: `page=99` on a 5-contact workspace returns 200 with `items: []` and `total: 5`.
- **Archived contacts**: Contacts with a deletion date set are excluded from all results and from the total count.
- **Exactly 100 limit**: `limit=100` is accepted; `limit=101` returns a validation error.
- **Non-integer page/limit**: `page=1.5` or `limit=abc` returns a 400 validation error.
- **Workspace ID in query string**: `?tenantId=x` or `?workspaceId=x` are silently stripped — results always reflect the session workspace.
- **Single contact workspace**: Returns 200 with 1 item, `total: 1`, on page 1.
- **Exactly limit-many contacts**: e.g., exactly 20 contacts with `limit=20` → 20 items, `total: 20`, on page 1; page 2 returns empty items.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an endpoint that returns a paginated list of renter contacts scoped to the authenticated session's workspace.
- **FR-002**: The endpoint MUST only return active contacts — contacts with a deletion date set MUST be excluded from results and from the total count.
- **FR-003**: Results MUST be ordered by creation date descending (newest contact first).
- **FR-004**: The response MUST include: an `items` array of contacts, a `total` count of all matching active contacts (ignoring pagination), a `page` number, and a `limit` value.
- **FR-005**: The `page` query parameter MUST default to 1 when not supplied. It MUST be a positive integer (minimum 1). Invalid values MUST be rejected with a validation error.
- **FR-006**: The `limit` query parameter MUST default to 20 when not supplied. It MUST be an integer between 1 and 100 inclusive. Invalid values MUST be rejected with a validation error.
- **FR-007**: When the requested page exceeds the available data, the system MUST return a 200 response with an empty `items` array and the correct `total` — it MUST NOT return 404.
- **FR-008**: The workspace that scopes the results MUST be derived exclusively from the authenticated session — it MUST NOT be accepted from the query string, request body, or header.
- **FR-009**: An unauthenticated request MUST be rejected with an authentication error.
- **FR-010**: A request from an authenticated user with no active workspace MUST be rejected with a workspace-context error.
- **FR-011**: Each contact in the `items` array MUST include all stored fields: `id`, `tenantId`, `firstName`, `lastName`, `email`, `phone`, `idNumber`, `notes`, `createdAt`, `updatedAt`. Archived contacts' `deletedAt` MUST NOT be exposed.
- **FR-012**: All validation errors for a single request MUST be returned together in one response — not sequentially.

### Key Entities

- **RenterContact** (read-only in this feature): A person record belonging to a workspace. Fields: id, first name, last name, email, phone, ID number, notes, creation timestamp, update timestamp. Called `TenantContact` in the data model.
- **Paginated Contact List**: The response envelope — contains `items` (array of contacts), `total` (integer), `page` (integer), `limit` (integer).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord with a valid session can retrieve their contact list in under 2 seconds end-to-end.
- **SC-002**: 100% of responses for page-beyond-last requests return 200 with an empty items array — 0% return 404.
- **SC-003**: 100% of requests with invalid `page` or `limit` values are rejected with a validation error in a single response — 0% cause unhandled errors.
- **SC-004**: 0% of responses include contacts from a workspace other than the authenticated session's workspace — cross-workspace leakage is impossible.
- **SC-005**: 100% of requests with `tenantId` or `workspaceId` in the query string are scoped to the session workspace — client-supplied workspace values are never honoured.

## Assumptions

- The endpoint path is `GET /api/v1/contacts`, reusing the same route prefix established by the create contact endpoint (US 12.1).
- Default sort order is creation date descending (newest first) — this matches the pattern established by the properties and units list endpoints.
- The `total` field in the response reflects only active contacts (those without a deletion date). Archived contacts are excluded from both `items` and `total`.
- Pagination is offset-based (page + limit), consistent with the existing `ListPropertiesUseCase` pattern.
- No search or filtering by name, email, or other fields is required for this feature — that is deferred to a future story.
- The `deletedAt` field is excluded from each contact in the response — clients never need it.
- This feature covers the backend API only — the UI for listing contacts is a separate story.
- The `tenantId` field is included in each contact response item so clients can confirm workspace scope.
