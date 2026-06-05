# Feature Specification: Update Property

**Feature Branch**: `029-update-property`
**Created**: 2026-06-04
**Status**: Draft
**Input**: User description: "As a landlord I want to update a property so I can correct or maintain its information. The system should expose a PATCH /properties/:id endpoint that accepts a partial update payload — any combination of name, address, property type, or description — and applies the changes to the property if it belongs to the current tenant. Attempting to update a property that belongs to a different tenant must return 404, identical to the response for a non-existent property. An empty payload with no fields must be rejected with a validation error. The tenant context must come from the verified JWT only — tenantId must never be updatable by the caller. The feature requires an UpdateProperty use case, an UpdateProperty DTO with all fields optional and at least one required, a PATCH /properties/:id endpoint, Swagger documentation, and unit tests covering the successful update, the not-found case, the cross-tenant 404 case, and rejection of an empty payload."

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Landlord Corrects Property Information (Priority: P1)

An authenticated landlord realises that a property record contains a mistake — an incorrect address, the wrong property type, or an outdated name — and corrects one or more fields in a single request. The system applies the changes and returns the updated property record.

**Why this priority**: Property information accuracy is fundamental to every downstream workflow — leases, unit assignments, and billing all depend on correct property data. The ability to correct mistakes is a prerequisite for reliable operations.

**Independent Test**: Can be fully tested by creating a property, sending a partial update with one changed field, and verifying the response reflects the updated value.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord and a property they own, **When** they submit a valid update with one or more changed fields, **Then** the system applies the changes and returns the complete updated property record.
2. **Given** an authenticated landlord, **When** they update only the property name while leaving all other fields unchanged, **Then** only the name is updated — all other fields remain as they were.
3. **Given** an unauthenticated request, **When** the update endpoint is called, **Then** the request is rejected before any data is accessed.

---

### User Story 2 — Tenant Isolation: Cross-Tenant Update Attempt (Priority: P1)

A landlord attempts to update a property that belongs to a different tenant. The system must deny this silently — returning the same not-found response as for a non-existent property, revealing nothing about the other tenant's data.

**Why this priority**: Preventing cross-tenant data mutation is a security-critical requirement on par with the happy path. A successful cross-tenant update is a data breach; a revealing error response is an information leak.

**Independent Test**: Can be fully tested by attempting to update a property ID that belongs to a different tenant and confirming the response is identical to updating a non-existent ID.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord and a property ID belonging to a different tenant, **When** they submit an update request, **Then** they receive a not-found response — identical to if the property did not exist.
2. **Given** a valid update payload and a cross-tenant property ID, **When** the request is processed, **Then** no changes are made to any data, and the response reveals no information about the other tenant's workspace.

---

### User Story 3 — Empty Payload Rejection (Priority: P2)

A landlord accidentally submits an update request with no fields in the body. The system rejects it with a clear validation error rather than silently accepting a no-op update.

**Why this priority**: Accepting empty updates would mask client-side bugs and create confusion when nothing changes. Explicit rejection gives clients immediate, actionable feedback.

**Independent Test**: Can be fully tested by sending an update request with an empty body and confirming a validation error response is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord, **When** they submit a PATCH request with no fields in the body, **Then** the system rejects the request with a validation error before attempting any data lookup.
2. **Given** a request body containing only fields that are not part of the property update schema (e.g., `tenantId`), **When** the request is processed, **Then** the system rejects it — `tenantId` and other protected fields are never accepted as update inputs.

---

### Edge Cases

- What if the update payload contains only the same values already stored? → The update is accepted and processed; the system does not detect or short-circuit no-op updates.
- What if the property has been soft-deleted? → Return a not-found response — archived properties cannot be updated.
- What if a partial address is provided (e.g., only city, no street)? → Each address field is updated independently; only the supplied fields change.
- What if `tenantId` is included in the request body? → The field is ignored entirely — tenant ownership is immutable and cannot be changed through this endpoint.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow an authenticated tenant user to update one or more fields of a property they own using a partial update.
- **FR-002**: The following fields MUST be individually updatable: property name, address line 1, address line 2, city, state, postal code, country, property type, and description.
- **FR-003**: All updatable fields MUST be optional in the request payload, but at least one must be present — an empty payload MUST be rejected with a validation error.
- **FR-004**: System MUST return a not-found response when the requested property does not belong to the requesting user's tenant, regardless of whether the property exists under a different tenant.
- **FR-005**: The response for a cross-tenant update attempt MUST be identical in status code, shape, and content to the response for a non-existent property — no information about other tenants' data may be disclosed.
- **FR-006**: The `tenantId` field MUST NOT be accepted as part of the update payload — tenant ownership is immutable.
- **FR-007**: System MUST derive the tenant context exclusively from the authenticated session. Tenant identity supplied via request path, body, or query string has no effect.
- **FR-008**: System MUST return the complete updated property record on success.
- **FR-009**: The endpoint MUST be documented in the API reference with request format, success response, validation error response, and not-found response.
- **FR-010**: System MUST include automated test coverage for: successful update, not-found case, cross-tenant 404 case, and empty payload rejection.

### Key Entities

- **Property**: The mutable record being updated. Updatable attributes: name, addressLine1, addressLine2, city, state, postalCode, country, propertyType, description. Immutable: id, tenantId, createdAt.
- **Partial Update Payload**: A subset of the property's updatable fields — at minimum one field must be present.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authenticated landlord can update one or more property fields and receive the complete updated record in a single request.
- **SC-002**: A request for cross-tenant update returns a not-found response 100% of the time — zero cross-tenant data mutations or disclosures.
- **SC-003**: An empty update payload is rejected with a validation error 100% of the time — no silent no-op updates are accepted.
- **SC-004**: `tenantId` cannot be modified through the update endpoint — any attempt to supply it in the request body has no effect, verified by automated test.
- **SC-005**: Property updates are applied and the updated record is retrievable in under 1 second under normal operating conditions.
- **SC-006**: The update endpoint is visible and testable in the API reference with documented success, validation error, and not-found responses.

---

## Assumptions

- Users are already authenticated before accessing this endpoint; this feature does not modify authentication flows.
- The property data model, create, list, and get-by-ID capabilities are already in production.
- Partial updates are applied field-by-field — only the fields present in the request body are changed; absent fields are left unchanged.
- There is no field-level permission system within a tenant — any authenticated member of the tenant may update any property in their workspace.
- Soft-deleted (archived) properties cannot be updated and return a not-found response.
- There is no audit log or change history requirement for this feature; that is a future concern.
