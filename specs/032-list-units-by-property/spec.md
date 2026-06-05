# Feature Specification: List Units by Property

**Feature Branch**: `032-list-units-by-property`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description: "As a landlord I want to view all units under one of my properties so I can see the rentable spaces for that building..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View All Units Under a Property (Priority: P1)

A landlord navigates to a specific property and wants to see all its rentable units — rooms, apartments, commercial spaces — so they can understand what spaces they have available and what their current status is.

**Why this priority**: This is the core capability of the feature. Without a working unit listing, no other sub-story is meaningful.

**Independent Test**: Can be fully tested by calling the list endpoint for a property that has two or more units and verifying the response contains all units with the correct fields, ordered by unit number ascending.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with an active property containing three units (e.g. "101", "102", "201"), **When** they request the unit list for that property, **Then** the system returns HTTP 200 with an array of all three unit records ordered by unit number ascending, a total count of 3, and all required fields for each unit (id, propertyId, tenantId, unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent, description, createdAt, updatedAt).
2. **Given** an authenticated landlord, **When** a unit list is returned, **Then** the tenantId on each unit record matches the property's tenantId, not any value from the request.
3. **Given** a property with more units than the default page size (50), **When** the landlord requests page 1 with the default limit, **Then** the system returns the first 50 units and a total count reflecting the full number of units, allowing the caller to detect further pages.
4. **Given** a property with 10 units, **When** the landlord requests page 1 with limit 5, **Then** the system returns exactly 5 units and a total count of 10.

---

### User Story 2 - View Empty Unit List for a Property With No Units (Priority: P2)

A landlord has just created a new property and has not added any units yet. Viewing the unit list should succeed with an empty result rather than an error — this is a valid state for a property.

**Why this priority**: An empty property is a normal, expected state. The response must be clearly distinguishable from an error. Landlords need confirmation that the property exists in their workspace even when it has no units yet.

**Independent Test**: Can be fully tested by calling the list endpoint for a property that exists and belongs to the tenant but has no units; verify HTTP 200 with an empty items array and a total of 0.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with a property that has no units, **When** they request the unit list for that property, **Then** the system returns HTTP 200 with an empty items array and total count of 0 — not a 404 or error response.

---

### User Story 3 - Reject Unit Listing Under Inaccessible Properties (Priority: P3)

A landlord attempts to list units under a property that either does not exist, belongs to a different tenant, or has been archived. All three cases must return 404 — identical responses that reveal nothing about the target property.

**Why this priority**: Security and tenant isolation are non-negotiable. The system must never reveal whether a property exists for another tenant or has been archived.

**IMPORTANT**: The system must check property existence and ownership **before** querying for units. Relying on an empty unit result set is not a valid substitute — a legitimately empty property and an inaccessible property would produce the same empty list, making tenant isolation impossible to enforce through unit query results alone.

**Independent Test**: Can be fully tested by sending unit list requests targeting a non-existent property ID, another tenant's property ID, and an archived property ID, and verifying all three return the same not-found response (identical status code and response shape).

**Acceptance Scenarios**:

1. **Given** a landlord requests units for a property ID that does not exist in the system, **When** the request is processed, **Then** the system returns a not-found response.
2. **Given** a landlord requests units for a property that belongs to a different tenant, **When** the request is processed, **Then** the system returns a not-found response — identical to the non-existent case, revealing nothing about the other tenant's property.
3. **Given** a landlord requests units for a property that has been archived (soft-deleted), **When** the request is processed, **Then** the system returns a not-found response — identical to the non-existent and cross-tenant cases.

---

### Edge Cases

- What happens when `page` or `limit` are provided as non-integer or negative values? — Rejected with a validation error (HTTP 400).
- What happens when `limit` is set to an unreasonably large number? — A maximum limit (e.g. 100) is enforced; requests exceeding it are rejected with a validation error.
- What happens when `page` is 2 but the property only has units on page 1? — Returns an empty items array with the correct total count (not a 404).
- What happens when the propertyId in the URL is not a valid identifier format? — Returns a not-found response, consistent with an unknown property.
- Does ordering by unit number handle mixed alphanumeric unit numbers (e.g. "1", "2", "10", "A", "B")? — Ordering is lexicographic (alphabetical string sort) by default; this is a display trade-off documented in Assumptions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose a `GET /properties/:propertyId/units` endpoint that returns a paginated list of units under the specified property.
- **FR-002**: The system MUST check that the property exists, belongs to the current tenant, and is not archived **before** querying for units. It MUST NOT use an empty unit result as a proxy for an inaccessible property.
- **FR-003**: A property that does not exist, belongs to a different tenant, or has been archived MUST return a not-found response. All three cases MUST be indistinguishable to the caller.
- **FR-004**: If the property is accessible and has no units, the system MUST return HTTP 200 with an empty items array and a total count of 0 — not an error.
- **FR-005**: Each unit record in the response MUST include: id, propertyId, tenantId, unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent, description, createdAt, updatedAt.
- **FR-006**: Results MUST be ordered by unit number ascending by default.
- **FR-007**: The endpoint MUST support optional `page` and `limit` query parameters. Defaults: `page = 1`, `limit = 50`. Maximum allowed `limit`: 100.
- **FR-008**: The response MUST include both the items array and a total count of all matching units, so callers can determine whether additional pages exist.
- **FR-009**: The `tenantId` MUST come exclusively from the verified JWT — never from the request body, query string, or URL path.
- **FR-010**: The `propertyId` MUST come exclusively from the URL path parameter — never from the request body.
- **FR-011**: Invalid `page` or `limit` values (non-integer, zero, negative, or exceeding maximum) MUST be rejected with a validation error.
- **FR-012**: Status-based filtering (e.g. `?status=AVAILABLE`) is explicitly out of scope for this feature.

### Key Entities

- **Unit**: Represents a rentable space within a property. Relevant fields for this feature: id, tenantId, propertyId, unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent, description, createdAt, updatedAt.
- **Property**: An existing entity that owns units. Relevant attributes: ID, tenantId, archived/soft-delete status. Used exclusively for the tenant-scoped existence check before the unit query.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord can retrieve all units under their property in a single request, with the correct total count included in the response.
- **SC-002**: All five test scenarios pass with correct responses: multi-unit listing, empty-property listing, non-existent property (404), other-tenant property (404), archived property (404).
- **SC-003**: An empty unit list and an inaccessible property always produce distinct, correct responses — HTTP 200 with empty array for the former, HTTP 404 for the latter. These two cases are never confused.
- **SC-004**: Tenant isolation is complete — a landlord receives an identical not-found response whether the target property belongs to another tenant or genuinely does not exist.
- **SC-005**: Pagination is correct — for a property with N units and a page limit of L, requesting page P returns exactly min(L, N − (P−1)×L) units and a total of N.

## Assumptions

- The authenticated user's tenantId is available from the verified JWT request context, consistent with all other endpoints in this project.
- Unit number ordering is lexicographic (string-based alphabetical). This means "10" sorts before "2" and "B" sorts before "a". Numeric-aware sorting is out of scope for this feature.
- The maximum allowed `limit` is 100. Requests above this cap are rejected with a validation error rather than silently clamped.
- Soft-deletion of properties is already implemented. This feature relies on that existing mechanism to determine if a property is archived.
- No status-based filtering is provided in this feature; all units belonging to the property are returned regardless of their status (AVAILABLE, OCCUPIED, MAINTENANCE).
- The `total` count in the response reflects all units for the property (not just the current page), enabling clients to calculate total page count.
- The response structure follows the same paginated envelope used by the existing list-properties endpoint in this project.
