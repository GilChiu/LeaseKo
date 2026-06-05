# Feature Specification: Manage Unit Status Lifecycle

**Feature Branch**: `feature/manage-unit-status`  
**Created**: 2026-06-04  
**Status**: Draft  
**Input**: User description: "As a landlord, I want to manage a unit's occupancy status so that I can accurately track the lifecycle of each unit across available, occupied, maintenance, and inactive states."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Valid Status Transition (Priority: P1)

A landlord updates a unit's status to a valid next state in its lifecycle. The change is saved and the full updated unit record is returned.

**Why this priority**: Core feature — without the ability to move units through their lifecycle, the status field has no operational value.

**Independent Test**: Update a unit from AVAILABLE to OCCUPIED. Verify the response reflects the new status and all other unit fields are unchanged.

**Acceptance Scenarios**:

1. **Given** a unit in AVAILABLE status, **When** the landlord sets it to OCCUPIED, **Then** the system returns 200 with the unit showing status OCCUPIED.
2. **Given** a unit in AVAILABLE status, **When** the landlord sets it to MAINTENANCE, **Then** the system returns 200 with the unit showing status MAINTENANCE.
3. **Given** a unit in AVAILABLE status, **When** the landlord sets it to INACTIVE, **Then** the system returns 200 with the unit showing status INACTIVE.
4. **Given** a unit in OCCUPIED status, **When** the landlord sets it to AVAILABLE (tenant vacates), **Then** the system returns 200 with the unit showing status AVAILABLE.
5. **Given** a unit in OCCUPIED status, **When** the landlord sets it to MAINTENANCE (urgent repairs), **Then** the system returns 200 with the unit showing status MAINTENANCE.
6. **Given** a unit in MAINTENANCE status, **When** the landlord sets it to AVAILABLE (repairs complete), **Then** the system returns 200 with the unit showing status AVAILABLE.
7. **Given** a unit in MAINTENANCE status, **When** the landlord sets it to INACTIVE (decommission), **Then** the system returns 200 with the unit showing status INACTIVE.

---

### User Story 2 — Reject Invalid Transition (Priority: P2)

A landlord attempts a status change that is not permitted by the lifecycle rules. The system rejects the request with a clear error explaining the current status and which transitions are allowed.

**Why this priority**: Prevents data integrity issues — an OCCUPIED unit jumping directly to INACTIVE would bypass the vacate step and corrupt lease tracking downstream.

**Independent Test**: Attempt to update an OCCUPIED unit directly to INACTIVE. Verify the system returns a non-2xx error with a message indicating the transition is not allowed.

**Acceptance Scenarios**:

1. **Given** a unit in OCCUPIED status, **When** the landlord sets it to INACTIVE directly, **Then** the system rejects the request with a business rule violation error (not 400 validation — the status value itself is valid).
2. **Given** a unit in MAINTENANCE status, **When** the landlord sets it to OCCUPIED directly, **Then** the system rejects the request with a transition error.
3. **Given** a unit in INACTIVE status, **When** the landlord attempts any status change, **Then** the system rejects the request — INACTIVE is a terminal state with no allowed transitions.
4. **Given** a unit in INACTIVE status, **When** the landlord sets it to AVAILABLE, **Then** the system rejects with an error stating the unit is permanently decommissioned and cannot be reactivated.

---

### User Story 3 — Reject Invalid Status Values (Priority: P3)

A landlord submits an unrecognised status string. The system rejects the request with a 400 validation error before any business logic runs.

**Why this priority**: Input validation must run before transition checks; invalid strings are a simpler gate than transition rules.

**Independent Test**: Submit `{ "status": "RENTED" }` to the update unit endpoint. Verify 400 with a validation error listing the accepted values.

**Acceptance Scenarios**:

1. **Given** any unit, **When** the landlord submits an unknown status string (e.g., `"RENTED"`, `"INACTIVE_SOON"`), **Then** the system returns 400 with accepted status values listed.
2. **Given** any unit, **When** the landlord submits a status of `null`, **Then** the system rejects the request — status is not a clearable field.
3. **Given** any unit, **When** the landlord submits an empty object `{}`, **Then** the system rejects with a 400 indicating at least one field must be provided.

---

### User Story 4 — Reject Access to Inaccessible Units (Priority: P4)

A landlord attempts to update the status of a unit they do not own. The system returns 404 regardless of whether the unit exists in another tenant's data or does not exist at all.

**Why this priority**: Tenant isolation is non-negotiable. Cross-tenant access and non-existence must be indistinguishable to callers.

**Independent Test**: Attempt to update the status of a unit belonging to a different tenant workspace. Verify the response is 404, identical to a non-existent unit.

**Acceptance Scenarios**:

1. **Given** a unit belonging to tenant B, **When** tenant A's landlord attempts a status update, **Then** the system returns 404 (same response as a non-existent unit).
2. **Given** a non-existent unit ID, **When** any landlord attempts a status update, **Then** the system returns 404.

---

### Edge Cases

- What happens when the landlord sets status to the same value it already has (e.g., AVAILABLE → AVAILABLE)? The system should accept the no-op and return 200 with the unchanged unit — a same-status update is not a transition violation.
- What happens when the landlord updates other fields at the same time as status (e.g., `{ "status": "OCCUPIED", "monthlyRent": 18000 }`)? The transition guard applies; if the status transition is invalid, the entire update is rejected even if other fields are valid.
- What happens when the landlord submits only non-status fields and status remains unchanged? The transition guard does not run — only triggers when a `status` field is present in the request.
- What happens if a unit is INACTIVE and a landlord tries to update a non-status field (e.g., `{ "monthlyRent": 0 }`)? INACTIVE units can still have non-status fields updated; the terminal-state restriction applies only to status transitions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support exactly four unit status values: AVAILABLE, OCCUPIED, MAINTENANCE, INACTIVE.
- **FR-002**: System MUST enforce the following permitted transitions only: AVAILABLE→OCCUPIED, AVAILABLE→MAINTENANCE, AVAILABLE→INACTIVE, OCCUPIED→AVAILABLE, OCCUPIED→MAINTENANCE, MAINTENANCE→AVAILABLE, MAINTENANCE→INACTIVE.
- **FR-003**: System MUST reject any status update that is not in the permitted transition list with a business rule violation error (distinct from a validation error).
- **FR-004**: System MUST treat INACTIVE as a terminal state — no further status changes are allowed once a unit reaches INACTIVE.
- **FR-005**: System MUST accept a same-status update (current == requested) without error, returning the unit unchanged.
- **FR-006**: System MUST require a read of the unit's current status before evaluating any transition request.
- **FR-007**: System MUST return 404 for status updates on units that do not exist or belong to a different tenant. Both cases MUST be indistinguishable to the caller.
- **FR-008**: System MUST reject unknown or unsupported status values with a 400 validation error before transition logic runs.
- **FR-009**: Status MUST NOT be clearable to null — it always holds one of the four defined values.
- **FR-010**: When a status update is combined with other field updates in the same request, the transition guard MUST be evaluated. If the transition is invalid, the entire request is rejected; no partial update is applied.
- **FR-011**: When a request contains only non-status fields, the transition guard MUST NOT run.
- **FR-012**: Status change for an INACTIVE unit MUST be rejected even if the transition would otherwise appear structurally valid — INACTIVE locks all outgoing transitions unconditionally.

### Key Entities

- **Unit**: Represents a rentable space within a property. Has a `status` field that tracks its lifecycle state. Status transitions are governed by business rules, not freely writable.
- **UnitStatus**: The set of valid states a unit can occupy: AVAILABLE, OCCUPIED, MAINTENANCE, INACTIVE. Only specific transitions between states are permitted.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord can move a unit through its full permitted lifecycle (AVAILABLE → OCCUPIED → AVAILABLE → MAINTENANCE → AVAILABLE → INACTIVE) with each step returning 200 and the correct updated status.
- **SC-002**: 100% of invalid transitions (any transition not in the permitted list) are rejected without modifying the unit record.
- **SC-003**: A landlord attempting to change an INACTIVE unit's status always receives a rejection — zero exceptions.
- **SC-004**: Cross-tenant status update attempts are indistinguishable from non-existent unit attempts — both return 404 with no information about the other tenant's data.
- **SC-005**: All six transition-related test scenarios pass without regression in existing update-unit test coverage.

## Assumptions

- The INACTIVE status is new to the system — the existing three values (AVAILABLE, OCCUPIED, MAINTENANCE) require a schema migration to add INACTIVE.
- The status transition guard is implemented as a business rule, not a database constraint.
- Status transitions do not trigger any side effects (e.g., notifications, lease state changes) in this feature; those are deferred to future features.
- The existing `PATCH /units/:id` endpoint is the sole entry point for status changes — no dedicated `/status` sub-route is introduced.
- A same-status update (no change) is treated as a no-op success, not an error, to allow idempotent requests.
- INACTIVE units remain queryable and their other fields remain editable; only their status is permanently locked.
- The OCCUPIED → MAINTENANCE transition is explicitly permitted to support urgent-repair scenarios while a tenant is in place.
- The permitted transition list is fixed for this feature; a configurable transition matrix is out of scope.
