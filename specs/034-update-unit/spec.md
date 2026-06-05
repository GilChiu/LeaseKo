# Feature Specification: Update Unit

**Feature Branch**: `034-update-unit`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description: "As a landlord I want to update a unit's details so I can keep rent information and unit attributes current..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Update One or More Unit Fields (Priority: P1)

A landlord wants to change details on an existing unit — for example, raising the monthly rent, correcting a floor area measurement, or updating a description — without having to delete and recreate the unit. Only the fields they explicitly provide in the request are changed; everything else stays the same.

**Why this priority**: This is the core capability of the feature. All other scenarios test constraints on this same flow.

**Independent Test**: Can be fully tested by sending a PATCH request with two or three fields (e.g. `monthlyRent` and `description`) for a unit belonging to the tenant, and verifying the response contains the updated values while all unchanged fields retain their original values.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord and a unit that belongs to their tenant, **When** they submit a PATCH request with one or more valid fields, **Then** the system returns HTTP 200 with the full updated unit record — only the provided fields have changed; all omitted fields retain their previous values.
2. **Given** a landlord updates a unit, **When** the update succeeds, **Then** the response includes all unit fields: id, tenantId, propertyId, unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent, description, createdAt, and an updated updatedAt timestamp.
3. **Given** a unit with optional fields previously set (e.g. floorArea = 75), **When** a landlord submits a PATCH request with `"floorArea": null`, **Then** the system clears that field (stores null) and returns it as null in the response — this is an intentional null-clearing operation, not a validation error.
4. **Given** a landlord submits a PATCH request updating the unit's `status` to `OCCUPIED`, **When** the update is processed, **Then** the status is changed and any valid status value (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`) may be set freely without transition restrictions.

---

### User Story 2 - Reject Invalid or Empty Updates (Priority: P2)

A landlord submits an invalid PATCH request: either an empty payload with no fields, or fields with values that fail validation (e.g. a negative rent amount, a blank unit number, a status string that is not a valid option).

**Why this priority**: Data integrity depends on the same validation rules enforced during creation. These must be equally enforced on update.

**Independent Test**: Can be fully tested by sending requests with (a) an empty body `{}`, (b) `monthlyRent: -500`, (c) `unitNumber: ""`, (d) `status: "RENTED"` — each must be rejected with a 400 validation error.

**Acceptance Scenarios**:

1. **Given** a landlord submits a PATCH request with an empty body (`{}`), **When** the request is processed, **Then** the system rejects it with a validation error — at least one field must be provided.
2. **Given** a landlord submits a `monthlyRent` of zero or a negative value, **When** the request is processed, **Then** the system rejects it with a validation error.
3. **Given** a landlord submits a `bedrooms` value of zero or a negative integer, **When** the request is processed, **Then** the system rejects it with a validation error.
4. **Given** a landlord submits `floorArea` or `bathrooms` of zero or a negative value, **When** the request is processed, **Then** the system rejects it with a validation error.
5. **Given** a landlord submits `unitNumber` as an empty string or a string exceeding 50 characters, **When** the request is processed, **Then** the system rejects it with a validation error.
6. **Given** a landlord submits a `status` value that is not one of `AVAILABLE`, `OCCUPIED`, or `MAINTENANCE`, **When** the request is processed, **Then** the system rejects it with a validation error.
7. **Given** a landlord submits `description` exceeding 1000 characters, **When** the request is processed, **Then** the system rejects it with a validation error.

---

### User Story 3 - Reject Duplicate Unit Number on Update (Priority: P3)

A landlord tries to change a unit's number to one that is already in use by another unit under the same property. The uniqueness constraint must be enforced on updates just as on creation.

**Why this priority**: Data integrity within a property requires that unit numbers remain unique. A conflict on update must be rejected explicitly.

**Independent Test**: Can be fully tested by creating two units ("101" and "102") under the same property, then sending a PATCH request on the "102" unit with `unitNumber: "101"` and verifying a conflict error is returned.

**Acceptance Scenarios**:

1. **Given** a property has units "101" and "102", **When** a landlord submits a PATCH to rename unit "102" to "101", **Then** the system rejects the request with a conflict error.
2. **Given** a unit already has number "101", **When** a landlord submits a PATCH with `unitNumber: "101"` (same value, no change), **Then** the system accepts the request — updating a unit number to its current value is not a conflict.

---

### User Story 4 - Reject Update of Inaccessible Units (Priority: P4)

A landlord attempts to update a unit that either does not exist or belongs to a different tenant. Both cases must return the same not-found response — indistinguishable to the caller.

**Why this priority**: Tenant isolation must be enforced on updates as strictly as on reads.

**Independent Test**: Can be fully tested by sending PATCH requests targeting a random UUID and a known other-tenant unit ID, verifying both return 404.

**Acceptance Scenarios**:

1. **Given** a landlord submits a PATCH request for a unit ID that does not exist, **When** the request is processed, **Then** the system returns a not-found response.
2. **Given** a landlord submits a PATCH request for a unit that belongs to a different tenant, **When** the request is processed, **Then** the system returns a not-found response — identical to the non-existent case.

---

### Edge Cases

- What happens if a landlord submits `null` for `unitNumber`? — Rejected with a validation error; `unitNumber` is a required field and cannot be null.
- What happens if a landlord submits `null` for `status`? — Rejected with a validation error; `status` must be a valid enum value if provided and cannot be set to null.
- What happens if a landlord submits `null` for `bedrooms`? — Accepted; `bedrooms` is optional and null-clearing is allowed for optional numeric fields.
- Can a landlord update `tenantId`, `propertyId`, or `id`? — No; these fields are immutable. Any attempt to include them in the request body must be rejected (via the global strict-validation mode that forbids non-whitelisted fields).
- What happens if only `updatedAt` changes and no other fields are modified (e.g. same values as existing)? — The update succeeds and the response is returned with the refreshed `updatedAt`.
- Are status-transition rules enforced (e.g. cannot go from OCCUPIED to AVAILABLE)? — No; status-transition business rules are explicitly out of scope for this feature. Any valid status may be set freely.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose a `PATCH /units/:id` endpoint that updates one or more fields on the specified unit.
- **FR-002**: The update MUST be tenant-scoped: only units belonging to the authenticated tenant may be updated.
- **FR-003**: All update fields MUST be optional in the request payload; omitted fields MUST retain their existing values (partial update semantics).
- **FR-004**: At least one field MUST be provided in the request payload; an empty object must be rejected with a validation error.
- **FR-005**: Updatable fields are: `unitNumber`, `floorArea`, `bedrooms`, `bathrooms`, `monthlyRent`, `description`, `status`.
- **FR-006**: The following fields are immutable and MUST NOT be accepted in the request body: `id`, `tenantId`, `propertyId`. The system MUST reject requests containing these fields.
- **FR-007**: `unitNumber` MUST NOT be null if provided; it MUST be a non-empty string of max 50 characters.
- **FR-008**: `floorArea`, `bathrooms`, and `monthlyRent` MUST be positive (> 0) if a non-null value is provided; they MAY be explicitly set to null to clear the field.
- **FR-009**: `bedrooms` MUST be a positive integer (minimum 1) if a non-null value is provided; it MAY be explicitly set to null to clear the field.
- **FR-010**: `description` MUST be max 1000 characters if a non-null value is provided; it MAY be explicitly set to null to clear the field.
- **FR-011**: `status` MUST be one of `AVAILABLE`, `OCCUPIED`, or `MAINTENANCE` if provided; it MUST NOT be null.
- **FR-012**: If a `unitNumber` update would create a duplicate unit number under the same property, the request MUST be rejected with a conflict error. Updating a unit number to its current (unchanged) value MUST NOT produce a conflict.
- **FR-013**: A unit that does not exist or belongs to a different tenant MUST return a not-found response. Both cases MUST be indistinguishable.
- **FR-014**: A successfully updated unit MUST return the full unit record with all fields and the updated `updatedAt` timestamp.
- **FR-015**: The `tenantId` MUST come exclusively from the verified JWT. The unit `id` MUST come exclusively from the URL path parameter — neither may come from the request body.
- **FR-016**: Status-transition business rules (restricting which transitions are allowed) are explicitly out of scope; any valid status value may be set freely.

### Key Entities

- **Unit**: The entity being updated. Mutable fields: `unitNumber`, `floorArea`, `bedrooms`, `bathrooms`, `monthlyRent`, `description`, `status`. Immutable fields: `id`, `tenantId`, `propertyId`, `createdAt`. Auto-updated field: `updatedAt`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord can update any combination of updatable fields on a unit in a single request.
- **SC-002**: All six required test scenarios pass: successful partial update, null-clearing, empty payload rejection, duplicate unit number conflict, non-existent unit (404), cross-tenant unit (404).
- **SC-003**: Null-clearing is reliable — a landlord can explicitly remove any optional field value by submitting `null` for that field, and the response confirms the null value.
- **SC-004**: Tenant isolation is complete — a landlord receives an identical not-found response whether the target unit belongs to another tenant or genuinely does not exist.
- **SC-005**: The uniqueness invariant is maintained — after any update, no two units under the same property share the same unit number.

## Assumptions

- "Updating a unit number to its current value" is not a conflict. The uniqueness check compares against other units, not the unit itself. This is handled at the database level via the existing `@@unique([propertyId, unitNumber])` constraint (which permits an update that sets the same value).
- Explicitly passing `null` for `floorArea`, `bedrooms`, `bathrooms`, `monthlyRent`, or `description` is a valid null-clearing operation — not a validation error.
- Passing `null` for `unitNumber` or `status` is a validation error — these fields cannot be nulled.
- The `updatedAt` field is always refreshed by the storage layer on any successful update, regardless of which fields changed.
- The existing `UnitResponseDto` shape is reused for the response — no new response DTO is needed.
- Status-transition rules (e.g. a checkout process when changing from OCCUPIED to AVAILABLE) are managed by a future feature (User Story 9.5). This feature sets status freely.
