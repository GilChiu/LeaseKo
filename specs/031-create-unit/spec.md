# Feature Specification: Create Unit

**Feature Branch**: `031-create-unit`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description: "As a landlord I want to create rentable units under one of my properties so I can manage individual spaces within a building..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Rentable Unit Under a Property (Priority: P1)

A landlord wants to add a rentable unit (e.g. apartment "101", suite "A", or "Penthouse") to one of their properties so they can track and manage individual spaces within a building.

**Why this priority**: This is the core capability of the feature. All other stories depend on a successful creation path existing first.

**Independent Test**: Can be fully tested by submitting a valid unit creation request for an existing property and verifying the returned unit record contains all provided fields, the generated ID, the property's tenant, and an AVAILABLE status.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with an existing active property, **When** they submit a unit creation request with a valid unit number and all optional fields, **Then** the system returns the newly created unit record with its generated ID, the propertyId, the tenantId (inherited from the property), AVAILABLE status, all provided fields, and timestamps.
2. **Given** an authenticated landlord with an existing active property, **When** they submit a unit creation request with only the required unit number (no optional fields), **Then** the system returns the newly created unit record with the generated ID, AVAILABLE status, null/absent optional fields, and timestamps.
3. **Given** an authenticated landlord, **When** the system creates the unit, **Then** the tenantId on the unit record is always the tenantId of the referenced property — it is never taken from the request body, query string, or URL path.

---

### User Story 2 - Reject Duplicate Unit Number Within a Property (Priority: P2)

A landlord attempts to add a second unit with a unit number that already exists under the same property. The system must reject this to preserve the uniqueness of unit identifiers within a building.

**Why this priority**: Data integrity within a property depends on unique unit numbers. This is a core constraint that must be enforced before the feature is usable in production.

**Independent Test**: Can be fully tested by creating one unit successfully, then submitting a second creation request with the same unit number under the same property and verifying a conflict error is returned.

**Acceptance Scenarios**:

1. **Given** a property that already has a unit with number "101", **When** a landlord submits a request to create another unit with number "101" under the same property, **Then** the system rejects the request with a conflict error.
2. **Given** a property that already has unit "101", **When** a landlord creates a unit with number "101" under a *different* property, **Then** the system accepts the request (uniqueness is scoped per property).

---

### User Story 3 - Reject Unit Creation Under Inaccessible Properties (Priority: P3)

A landlord attempts to create a unit under a property that either does not exist, belongs to a different tenant, or has been archived (soft-deleted). All three cases must be indistinguishable — the system returns a not-found response in each scenario.

**Why this priority**: Security and tenant isolation are non-negotiable. The system must never reveal whether a property exists for another tenant or is archived.

**Independent Test**: Can be fully tested by sending unit creation requests targeting a non-existent ID, another tenant's property ID, and an archived property ID, and verifying all three return the same not-found response.

**Acceptance Scenarios**:

1. **Given** a landlord requests unit creation under a property ID that does not exist in the system, **When** the request is processed, **Then** the system returns a not-found response.
2. **Given** a landlord requests unit creation under a property that belongs to a different tenant, **When** the request is processed, **Then** the system returns a not-found response — identical to the non-existent case, revealing no information about the other tenant's property.
3. **Given** a landlord requests unit creation under a property that has been archived (soft-deleted), **When** the request is processed, **Then** the system returns a not-found response.

---

### Edge Cases

- What happens when the unit number contains special characters (e.g. spaces, slashes, unicode)? — The unit number is treated as a string; no format restriction is applied beyond non-empty and reasonable max length.
- What happens when optional numeric fields (floor area, rent) are provided as zero or negative values? — Zero and negative values are rejected; fields must be positive numbers if provided.
- What happens when the propertyId in the URL is not a valid identifier format? — The system returns a not-found response consistent with an unknown property.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose a `POST /properties/:propertyId/units` endpoint that creates a unit under the specified property.
- **FR-002**: The system MUST require a unit number as a non-empty string field; all other unit fields are optional.
- **FR-003**: The system MUST default a newly created unit's status to AVAILABLE.
- **FR-004**: The system MUST enforce uniqueness of the unit number within a single property; duplicate unit numbers under the same property MUST be rejected with a conflict error.
- **FR-005**: The system MUST scope the property lookup to the current tenant — a property belonging to another tenant MUST return a not-found response, indistinguishable from a non-existent property.
- **FR-006**: The system MUST return a not-found response when attempting to create a unit under an archived (soft-deleted) property.
- **FR-007**: The system MUST derive the `tenantId` for the created unit from the property's `tenantId` — it MUST NOT be accepted from the request body, query string, or URL path.
- **FR-008**: The system MUST take the `propertyId` exclusively from the URL path parameter — it MUST NOT be accepted from the request body.
- **FR-009**: A successfully created unit response MUST include: generated ID, propertyId, tenantId, unit number, status, all provided optional fields, and timestamps.
- **FR-010**: Optional numeric fields (floor area, monthly rent, bedrooms, bathrooms) MUST be positive when provided; zero and negative values MUST be rejected.

### Key Entities

- **Unit**: Represents a rentable space within a property. Key attributes: generated ID, unit number (string, unique per property), status (AVAILABLE by default), floor area (optional positive number), bedrooms (optional positive integer), bathrooms (optional positive number), monthly rent amount (optional positive number), description (optional string), propertyId (reference to parent property), tenantId (inherited from property), created-at timestamp, updated-at timestamp.
- **Property**: An existing entity that owns units. Relevant attributes for this feature: ID, tenantId, archived/soft-delete status.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord can create a unit under their property in a single request with no additional steps required.
- **SC-002**: All five test scenarios (successful creation, duplicate unit number conflict, non-existent property, other tenant's property, archived property) pass with the correct responses.
- **SC-003**: The unit number uniqueness constraint is enforced at the data level — concurrent duplicate submissions for the same property cannot both succeed.
- **SC-004**: Tenant isolation is complete — a landlord receives an identical not-found response whether the target property belongs to another tenant or genuinely does not exist.
- **SC-005**: No unit creation request can result in a unit whose tenantId differs from the property's tenantId.

## Assumptions

- The authenticated user's tenantId is available from the verified JWT request context and is already extracted by existing infrastructure (consistent with how other endpoints in this project operate).
- Unit numbers are treated as arbitrary non-empty strings with no enforced format — landlords define their own numbering scheme (numeric, alphanumeric, descriptive names).
- The `AVAILABLE` status is the only valid initial status for a newly created unit; other statuses (e.g. OCCUPIED, MAINTENANCE) are managed through separate workflows outside this feature's scope.
- Floor area is stored as a decimal number without a specific unit system (e.g. sq ft vs sq m) — the unit system is a display concern outside this feature's scope.
- Soft-deletion of properties is already implemented (archive feature exists); this feature relies on that existing mechanism to determine if a property is archived.
- The propertyId path parameter uses the same identifier format as the existing property endpoints in this project.
