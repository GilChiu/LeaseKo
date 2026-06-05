# Feature Specification: Get Property by ID

**Feature Branch**: `028-get-property-by-id`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description: "As a landlord I want to view a single property by its ID so I can inspect its full details. The system should expose a GET /properties/:id endpoint that returns the property if it belongs to the current tenant, or a 404 if it does not exist or belongs to a different tenant. These two cases must be indistinguishable to the caller — the response must never reveal whether a property exists under a different tenant. The tenant context must come from the verified JWT only. The feature requires a GetPropertyById use case, a GET /properties/:id endpoint, Swagger/OpenAPI documentation, and unit tests covering the found case, the not-found case, and the cross-tenant case where a property that exists under another tenant returns 404."

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Landlord Views Property Details (Priority: P1)

An authenticated landlord selects a property from their list and views its full details — address, type, description, and metadata — in a single request using the property's unique identifier.

**Why this priority**: Property detail retrieval is the foundation for every downstream interaction with a property (editing, archiving, assigning units). Without it, no other property management workflow can function correctly.

**Independent Test**: Can be fully tested by authenticating as a landlord, retrieving the ID of a known property, and calling the detail endpoint — confirming the correct property data is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord and a property ID that belongs to their workspace, **When** they request the property details, **Then** they receive the full property record with all its fields.
2. **Given** an authenticated landlord, **When** they request a property ID that does not exist anywhere in the system, **Then** they receive a not-found response.
3. **Given** an unauthenticated request, **When** the property detail endpoint is called, **Then** the request is rejected with an authentication error.

---

### User Story 2 — Tenant Isolation: Cross-Tenant ID Lookup (Priority: P1)

A landlord attempts to access a property that exists in the system but belongs to a different tenant. The system must deny access in a way that reveals nothing about the other tenant's data — the response must be identical to the case where the property simply does not exist.

**Why this priority**: Tenant isolation on individual record access is a security-critical requirement equal in importance to the happy path. Leaking the existence of another tenant's records through a different status code (e.g., 403 vs 404) is itself a data breach.

**Independent Test**: Can be fully tested by attempting to retrieve a property ID that belongs to a different tenant's workspace — confirming the response is identical to requesting a non-existent ID.

**Acceptance Scenarios**:

1. **Given** a landlord authenticated as Tenant A and a valid property ID that belongs to Tenant B, **When** they request the property details, **Then** they receive a not-found response — identical to if the property did not exist at all.
2. **Given** any authenticated request for a property from a different tenant, **When** the response is compared to the response for a genuinely non-existent ID, **Then** the status code, response shape, and any error message are identical — no information about the other tenant's data is disclosed.

---

### Edge Cases

- What happens if the property ID format is invalid (e.g., not a valid identifier)? → Return a not-found response; the system treats any unresolvable ID as not found within the tenant's scope.
- What if the property exists but has been soft-deleted (archived)? → Return a not-found response — archived properties are not accessible via this endpoint.
- What if the authentication token has expired? → Reject the request with an authentication error before any lookup occurs.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow an authenticated tenant user to retrieve the full details of a property by its unique identifier.
- **FR-002**: System MUST return a not-found response when the requested property does not belong to the requesting user's tenant — regardless of whether the property exists in the system under a different tenant.
- **FR-003**: System MUST return a not-found response when the requested property does not exist anywhere in the system.
- **FR-004**: The response for FR-002 and FR-003 MUST be identical in status code, shape, and content — the system must not disclose the existence of records belonging to other tenants.
- **FR-005**: System MUST derive the tenant context exclusively from the authenticated session. Tenant identity supplied via request path, query string, or body has no effect on the lookup scope.
- **FR-006**: System MUST reject unauthenticated requests before any data lookup is attempted.
- **FR-007**: Soft-deleted (archived) properties MUST NOT be returned by this endpoint — they are treated as not found.
- **FR-008**: The endpoint MUST be documented in the API reference with its request format, success response, and not-found error response.
- **FR-009**: System MUST include automated test coverage verifying the found case, the not-found case, and the cross-tenant case (where a property belonging to another tenant returns the same not-found response as a genuinely absent record).

### Key Entities

- **Property**: A real estate asset managed within a tenant workspace. Retrieved in full on success: unique identifier, name, address, type, description, and timestamps.
- **Tenant Workspace**: The isolated data boundary belonging to a single organisation. All property lookups are scoped to this boundary — a property outside it is treated as non-existent.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authenticated landlord can retrieve the complete details of any property in their workspace using its unique identifier in a single request.
- **SC-002**: A request for a property belonging to a different tenant returns a not-found response 100% of the time — zero cross-tenant data disclosures.
- **SC-003**: The not-found response for a cross-tenant ID and the not-found response for a genuinely absent ID are byte-for-byte identical in status code and error shape — verified by automated tests.
- **SC-004**: Property detail retrieval is completed in under 1 second under normal operating conditions.
- **SC-005**: All unauthenticated requests to the property detail endpoint are rejected before any data access occurs.
- **SC-006**: The endpoint is visible and testable in the API reference with documented success and not-found responses.

---

## Assumptions

- Users are already authenticated before accessing this endpoint; this feature does not modify authentication flows.
- The property data model and the list properties capability are already implemented and in production.
- The unique identifier format follows the existing property ID convention established in the data model.
- Soft-deleted properties are treated identically to non-existent properties — no special "deleted" status is returned.
- No role-based access distinction is required beyond confirming the property belongs to the requesting tenant — any authenticated member of the tenant can retrieve any property within that tenant's workspace.
