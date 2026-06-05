# Feature Specification: List Properties

**Feature Branch**: `027-list-properties`
**Created**: 2026-06-01
**Status**: Draft
**Input**: User description: "As a landlord I want to view all properties in my tenant workspace so I can manage my portfolio. The system should expose a GET /properties endpoint that returns a paginated list of properties scoped strictly to the current tenant. The tenant context must come from the verified JWT — never from the request body or query string. Properties belonging to other tenants must never appear in the response. The feature requires a ListProperties use case, a tenant-scoped findMany on the Property repository, Swagger/OpenAPI documentation for the endpoint, and unit tests that verify tenant isolation including a test confirming cross-tenant properties are not returned."

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Landlord Views Property List (Priority: P1)

An authenticated landlord opens their property management workspace and retrieves the full list of properties they manage. The list shows all properties associated with their account and no one else's.

**Why this priority**: This is the core read capability of the property management feature — without it, landlords cannot navigate or manage their portfolio. Everything else (updating, archiving, unit management) depends on being able to see what exists.

**Independent Test**: Can be fully tested by making an authenticated request and verifying the returned list contains only the requesting landlord's properties, and delivers a usable property list view.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with three properties in their workspace, **When** they request their property list, **Then** they receive all three properties and no others.
2. **Given** an authenticated landlord, **When** they request their property list, **Then** the response includes a total count and is structured for pagination.
3. **Given** an unauthenticated request, **When** the property list is requested, **Then** the request is rejected with an authentication error.

---

### User Story 2 - Empty Workspace (Priority: P2)

A newly registered landlord who has not yet created any properties views their property list.

**Why this priority**: A new user's first interaction with the list should be a clean empty state, not an error. Getting this right prevents support issues and sets the right expectation for onboarding.

**Independent Test**: Can be fully tested by requesting the property list for a tenant with zero properties and verifying an empty list is returned without error.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with no properties, **When** they request their property list, **Then** they receive an empty list with a total count of zero — not an error.

---

### User Story 3 - Tenant Isolation Enforcement (Priority: P1)

Two landlords from different organisations both have properties in the system. Each can only see their own.

**Why this priority**: Tenant isolation is a security-critical requirement. Any failure here is a data breach. It must be verified as an explicit, independently testable behaviour.

**Independent Test**: Can be fully tested by creating properties under two separate tenant workspaces and confirming that each tenant's request returns only their own properties.

**Acceptance Scenarios**:

1. **Given** Tenant A has 2 properties and Tenant B has 3 properties, **When** Tenant A requests their property list, **Then** Tenant A receives exactly 2 properties — none belonging to Tenant B.
2. **Given** a request that attempts to supply a different tenant identifier via query string or request body, **When** the server processes the request, **Then** the server ignores the supplied identifier and uses only the authenticated session's tenant context.

---

### User Story 4 - Pagination Navigation (Priority: P3)

A landlord with a large property portfolio navigates through multiple pages of results.

**Why this priority**: Pagination is necessary for usability at scale, but a landlord with a small portfolio can still get full value from the feature without it being perfect on day one. The structure must be present; full navigation UX can be iterated.

**Independent Test**: Can be fully tested by requesting different pages and verifying result counts, page metadata, and that all properties are retrievable across pages without duplication or omission.

**Acceptance Scenarios**:

1. **Given** a landlord with 50 properties and a default page size of 20, **When** they request page 1, **Then** they receive 20 properties and a total count of 50.
2. **Given** the same landlord, **When** they request page 3, **Then** they receive the remaining 10 properties.

---

### Edge Cases

- What happens when the pagination parameters exceed the total number of properties? → Return an empty list for that page, not an error.
- How does the system behave if the authentication token has expired? → Reject the request with an authentication error before any data is accessed.
- What if a page size larger than the system maximum is requested? → Cap the page size at the system maximum and return results accordingly.
- What if properties are created or deleted between pagination requests? → Each page request is a fresh snapshot; no guarantee of consistency across pages is required.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow authenticated tenant users to retrieve a list of properties belonging to their workspace.
- **FR-002**: System MUST return only properties whose tenant ownership matches the authenticated user's tenant — no other properties may appear in any response.
- **FR-003**: System MUST derive the tenant context exclusively from the authenticated session. Tenant identity supplied via query string, request body, or any header other than the authentication credential MUST be ignored.
- **FR-004**: System MUST reject requests from unauthenticated users with an appropriate authentication failure response.
- **FR-005**: System MUST return an empty list (not an error) when an authenticated tenant has no properties.
- **FR-006**: System MUST structure the response to support pagination, including at minimum: the list of properties for the requested page, the total count of matching properties, and the current page information.
- **FR-007**: System MUST expose the property list endpoint in the API reference so developers and integrators can discover, inspect, and test it.
- **FR-008**: System MUST include automated test coverage that verifies tenant isolation — specifically that properties from a different tenant workspace are never returned.

### Key Entities

- **Property**: A real estate asset managed within a tenant workspace. Key attributes: unique identifier, name or address, property type, creation date, associated tenant workspace.
- **Tenant Workspace**: The isolated data environment belonging to a single organisation or landlord. All property queries are scoped to this boundary.
- **Paginated Property List**: The response envelope containing the properties for a given page, the total count of all matching properties, and page-level metadata.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authenticated landlord can retrieve their complete property list within a single request, with no manual filtering required on the client side.
- **SC-002**: Zero properties from other tenant workspaces appear in any property list response — verified by automated tests covering cross-tenant scenarios.
- **SC-003**: A landlord with no properties receives an empty list and a total count of zero, with no error state triggered.
- **SC-004**: The property list for a workspace with up to 500 properties is returned in under 2 seconds under normal operating conditions.
- **SC-005**: All unauthenticated requests to the property list are rejected — no data is returned without a valid authenticated session.
- **SC-006**: The property list endpoint is visible and testable in the API reference, with documented request parameters and response structure.

---

## Assumptions

- Users are already authenticated via the existing session mechanism before accessing this endpoint; this feature does not add or modify authentication flows.
- The property data model and creation capability are already implemented (delivered in the prior sprint).
- Default page size is 20 properties when no size is specified by the caller.
- Properties are returned in descending order of creation date (newest first) when no sort order is specified.
- The maximum allowable page size is 100 properties per request.
- Soft-deleted or archived properties (if that concept exists) are excluded from the default list results; this feature covers active properties only.
- The tenant context resolution mechanism (reading from the authenticated session) is already in place as part of the existing infrastructure.
