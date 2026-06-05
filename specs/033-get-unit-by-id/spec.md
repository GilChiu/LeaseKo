# Feature Specification: Get Unit by ID

**Feature Branch**: `033-get-unit-by-id`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description: "As a landlord I want to view a single unit by its ID so I can inspect its details..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Retrieve a Unit by Its ID (Priority: P1)

A landlord already knows a specific unit's identifier (e.g. they clicked on a unit in a list and the client has its ID) and wants to load the full details for that unit — rent amount, floor area, status, description — so they can inspect or share it.

**Why this priority**: This is the sole capability of the feature. It is the fundamental "read a single record" operation that all unit detail views depend on.

**Independent Test**: Can be fully tested by requesting the endpoint with a valid unit ID that belongs to the current tenant and verifying HTTP 200 with a complete unit record containing all required fields.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord and a unit that belongs to their tenant, **When** they request the unit by its ID, **Then** the system returns HTTP 200 with the full unit record: id, tenantId, propertyId, unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent, description, createdAt, updatedAt.
2. **Given** an authenticated landlord requests a unit, **When** the response is returned, **Then** the tenantId on the record matches the landlord's tenant — it is never derived from or influenced by anything other than the stored unit record.
3. **Given** a unit with all optional fields populated (floorArea, bedrooms, bathrooms, monthlyRent, description), **When** it is retrieved, **Then** all fields appear in the response with their stored values.
4. **Given** a unit with only the required field (unitNumber) set and all optional fields absent, **When** it is retrieved, **Then** all optional fields appear as null in the response — not absent.

---

### User Story 2 - Reject Access to Inaccessible Units (Priority: P2)

A landlord attempts to retrieve a unit using an ID that either does not exist in the system or belongs to a different tenant. Both cases must return the same not-found response — the caller cannot determine which condition occurred.

**Why this priority**: Security and tenant isolation are non-negotiable. The system must never reveal whether a unit exists for another tenant.

**Independent Test**: Can be fully tested by sending requests with (a) a random UUID that does not exist and (b) a known unit ID from a different tenant's workspace, and verifying both return the same not-found response. Also test with a malformed ID string.

**Acceptance Scenarios**:

1. **Given** a landlord requests a unit ID that does not exist in the system, **When** the request is processed, **Then** the system returns a not-found response.
2. **Given** a landlord requests a unit ID that exists but belongs to a different tenant, **When** the request is processed, **Then** the system returns a not-found response — identical to the non-existent case, revealing nothing about the other tenant's data.
3. **Given** a landlord submits an invalid or malformed ID string in the URL path (e.g. a random string, special characters), **When** the request is processed, **Then** the system returns a not-found response — identical to the non-existent case.

---

### Edge Cases

- What happens if a unit belongs to an archived (soft-deleted) property? — The unit itself is not archived; units have no deletedAt field. The unit is returned normally regardless of its parent property's status. Property archiving does not cascade to unit visibility in the API.
- Can the tenant retrieve a unit using only the unit's ID without knowing the property? — Yes, this is the explicit design: `GET /units/:id` uses the globally unique unit ID; no propertyId is required or accepted.
- Is there any rate limiting or throttling on this endpoint? — Standard rate limiting applies via the existing infrastructure; no per-endpoint override is in scope.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose a `GET /units/:id` endpoint that returns the full unit record for the specified unit.
- **FR-002**: The unit lookup MUST be tenant-scoped: only units belonging to the authenticated tenant's workspace are accessible.
- **FR-003**: A unit that does not exist, belongs to a different tenant, or is requested with a malformed/invalid ID MUST return a not-found response. All three cases MUST be indistinguishable to the caller.
- **FR-004**: The response MUST include all unit fields: id, tenantId, propertyId, unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent, description, createdAt, updatedAt. Optional fields that have no stored value MUST appear as null — not absent.
- **FR-005**: The `tenantId` MUST come exclusively from the verified JWT — never from the request body, query string, or URL path.
- **FR-006**: The unit ID MUST come exclusively from the URL path parameter — never from the request body.
- **FR-007**: The endpoint MUST be served at `GET /units/:id` (flat path), not nested under `/properties/:propertyId/units/:id`. The caller is not required to know the propertyId.
- **FR-008**: Units have no soft-delete mechanism. There is no archived state for units; a unit is either present and accessible (subject to tenant scope) or it does not exist.

### Key Entities

- **Unit**: Represents a rentable space within a property. Fields returned by this endpoint: id, tenantId, propertyId, unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent, description, createdAt, updatedAt. Retrieved by its globally unique ID, scoped to the requesting tenant.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord can retrieve any unit in their workspace by its ID in a single request with no additional lookup steps.
- **SC-002**: All three test scenarios pass with correct responses: successful retrieval, non-existent unit (404), other-tenant unit (404, indistinguishable from non-existent).
- **SC-003**: Tenant isolation is complete — a landlord receives an identical not-found response whether the target unit belongs to another tenant or genuinely does not exist.
- **SC-004**: A malformed or invalid unit ID in the URL produces the same not-found response as any other inaccessible unit — no information about ID format validity is leaked.

## Assumptions

- Units have no soft-delete (deletedAt) field. A unit that exists in the system is always returned if it belongs to the requesting tenant, regardless of its parent property's archived status.
- The unit ID uses the same UUID format as all other entity IDs in this project; a non-UUID string in the path is treated as a non-existent ID and returns 404.
- The `UnitResponseDto` shape defined for the create-unit and list-units endpoints is reused for this endpoint — no new response DTO is required.
- The existing `UnitsController` (registered at `@Controller('properties/:propertyId/units')`) handles nested unit routes. A second controller registered at `@Controller('units')` handles the flat `GET /units/:id` route. Both controllers belong to the same `UnitsModule`.
- The `findById(id, tenantId)` method uses both `id` and `tenantId` in the query — it returns null for both non-existent and cross-tenant cases, making them indistinguishable.
