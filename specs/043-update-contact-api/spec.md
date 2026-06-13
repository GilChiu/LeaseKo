# Feature Specification: Update Renter Contact

**Feature Branch**: `sprint/003`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User Description: "As a landlord, I want to update a renter contact's information via the API so that I can keep records current when details change."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Partially Update a Renter Contact (Priority: P1)

A landlord sends a partial update with one or more fields to change on an existing contact. Only the provided fields are modified; all other fields remain exactly as they were. The full updated contact record is returned.

**Why this priority**: This is the core of the feature. Without a working update path, records cannot be kept current.

**Independent Test**: Create a contact with all fields set. Send a PATCH with only `firstName` changed. Verify the response has the new `firstName` and all other fields are unchanged. Verify `updatedAt` is newer than `createdAt`.

**Acceptance Scenarios**:

1. **Given** an existing contact with all fields set, **When** only `firstName` is provided in the update body, **Then** `firstName` is changed and all other fields remain as they were before the update.
2. **Given** an existing contact, **When** all updatable fields are provided, **Then** all fields are updated in the single request.
3. **Given** a successful update, **When** the response is returned, **Then** it contains the full contact record with the updated values, the same `id` and `tenantId`, and an `updatedAt` timestamp more recent than before the update.
4. **Given** a contact with optional fields set to non-null values, **When** a PATCH omits those optional fields, **Then** those optional fields are left unchanged — they are not cleared to null.

---

### User Story 2 — Email Update Rules (Priority: P2)

When the email field is included in the update, it is normalised to lowercase and checked for uniqueness against other active contacts in the same workspace. Updating to the same email as the contact already has is always allowed.

**Why this priority**: Email is the workspace-unique identifier for a contact. Without these rules, duplicate email addresses or unintended normalisation could corrupt CRM data.

**Independent Test**: Create contact A with `alice@example.com`. Update contact A with `Alice@Example.COM` — verify it succeeds (self-match). Create contact B. Update contact B with `alice@example.com` — verify 409 conflict. Archive contact A. Update contact B with `alice@example.com` — verify it succeeds (archived contact does not block).

**Acceptance Scenarios**:

1. **Given** a contact with email `alice@example.com`, **When** it is updated with the same email `alice@example.com`, **Then** the update succeeds — no self-conflict.
2. **Given** a contact with email `alice@example.com`, **When** it is updated with `Alice@Example.COM` (different case, same address), **Then** the update succeeds — case-insensitive self-match.
3. **Given** a contact with email `alice@example.com`, **When** a different contact in the same workspace is updated with `alice@example.com`, **Then** a conflict error is returned and no change is made.
4. **Given** contact A has been archived and had email `alice@example.com`, **When** an active contact is updated with `alice@example.com`, **Then** the update succeeds — archived contacts do not block.
5. **Given** a valid new email is provided, **When** the update succeeds, **Then** the email is stored and returned in lowercase regardless of input casing.

---

### User Story 3 — Input Validation (Priority: P3)

The system rejects updates with an empty body, blank required fields, or fields that exceed maximum lengths. Validation errors are descriptive and field-specific.

**Why this priority**: Without validation, invalid data enters the system and required fields could be blanked out.

**Independent Test**: Submit a PATCH with an empty body — verify 400. Submit with `firstName: "   "` (whitespace-only) — verify 400. Submit with `firstName` 101 characters long — verify 400 with a max-length error for `firstName` only.

**Acceptance Scenarios**:

1. **Given** a PATCH body with no fields, **When** submitted, **Then** a 400 validation error is returned — at least one field is required.
2. **Given** `firstName` set to a whitespace-only string, **When** submitted, **Then** a 400 error is returned for `firstName`.
3. **Given** `lastName` set to a whitespace-only string, **When** submitted, **Then** a 400 error is returned for `lastName`.
4. **Given** `email` set to a malformed address, **When** submitted, **Then** a 400 email-format error is returned.
5. **Given** `firstName` exceeds 100 characters, **When** submitted, **Then** a max-length error for `firstName` is returned — other valid fields are unaffected.
6. **Given** `notes` exceeds 1000 characters, **When** submitted, **Then** a max-length error for `notes` is returned.

---

### User Story 4 — Access Control and Workspace Isolation (Priority: P4)

Contacts not found in the authenticated workspace — whether missing, cross-tenant, or archived — return an identical 404. Unauthenticated and no-workspace requests are rejected before any lookup.

**Why this priority**: Without these controls, a landlord could modify another landlord's contact records — a critical data security failure.

**Independent Test**: Send PATCH to a non-existent ID — verify 404. Send PATCH to an ID belonging to another workspace — verify the same 404. Send PATCH without auth — verify 401. Include `tenantId` in the update body — verify the contact's workspace does not change.

**Acceptance Scenarios**:

1. **Given** an ID that does not exist, **When** a PATCH is sent, **Then** 404 is returned.
2. **Given** an ID that belongs to a different workspace, **When** a PATCH is sent, **Then** 404 is returned — identical to not-found.
3. **Given** an ID of an archived contact, **When** a PATCH is sent, **Then** 404 is returned — archived contacts cannot be updated.
4. **Given** a malformed ID string in the path, **When** a PATCH is sent, **Then** 404 is returned — no format validation on the path parameter.
5. **Given** no `Authorization` header, **When** a PATCH is sent, **Then** 401 is returned.
6. **Given** a valid JWT with no active organisation, **When** a PATCH is sent, **Then** 403 is returned.
7. **Given** `tenantId` included in the request body, **When** processed, **Then** the field is silently stripped — the contact's workspace never changes.

---

### Edge Cases

- **Partial update, single field**: Only the provided field changes; all others remain exactly as stored.
- **Self-email match, same case**: `alice@example.com` → `alice@example.com` — succeeds, no conflict.
- **Self-email match, different case**: `alice@example.com` → `Alice@Example.COM` — succeeds after normalisation.
- **Duplicate email, different contact**: Same workspace, different active contact with that email — 409 conflict.
- **Archived contact's email**: Does not block the update — uniqueness only applies to active contacts.
- **Whitespace-only name fields**: Treated as blank — rejected with a required-field error.
- **Max-length boundary**: Field at exactly max length is accepted; one character over is rejected.
- **Empty body `{}`**: Rejected with a validation error — at least one field must be provided.
- **`tenantId` in body**: Silently stripped — workspace never changes via the request body.
- **Concurrent update**: Last write wins — no optimistic locking required.
- **Archived contact**: 404 — cannot be updated; the update-archived use case is deferred to US 12.5.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an endpoint that partially updates a renter contact identified by its ID, scoped to the authenticated session's workspace.
- **FR-002**: The update MUST be partial — only fields present in the request body are changed; omitted fields MUST remain unchanged.
- **FR-003**: At least one updatable field MUST be present in the request body. An empty body MUST be rejected with a validation error.
- **FR-004**: Updatable fields are: `firstName`, `lastName`, `email`, `phone`, `idNumber`, `notes`. The `tenantId` field is NEVER updatable and MUST be stripped if present in the body.
- **FR-005**: `firstName` and `lastName`, if provided, MUST NOT be blank or whitespace-only.
- **FR-006**: `email`, if provided, MUST conform to a valid email format and MUST be unique among active contacts in the workspace (case-insensitive). The contact being updated MUST NOT conflict with its own current email.
- **FR-007**: `email`, if provided, MUST be stored and returned in lowercase regardless of input casing.
- **FR-008**: All provided fields MUST be validated against maximum allowed lengths. Requests exceeding limits MUST be rejected with a field-specific error.
- **FR-009**: If the contact ID does not resolve to an active contact in the current workspace — whether non-existent, cross-tenant, or archived — the response MUST be 404. These three cases MUST be indistinguishable.
- **FR-010**: On success, the endpoint MUST return the full updated contact record: `id`, `tenantId`, `firstName`, `lastName`, `email`, `phone`, `idNumber`, `notes`, `createdAt`, `updatedAt`. `deletedAt` MUST NOT be included.
- **FR-011**: The workspace MUST be derived exclusively from the authenticated session — never from the request body, query string, or header.
- **FR-012**: An unauthenticated request MUST be rejected with an authentication error.
- **FR-013**: A request from an authenticated user with no active workspace MUST be rejected with a workspace-context error.

### Key Entities

- **RenterContact** (updatable fields): first name, last name, email, phone, ID number, notes. The workspace association (`tenantId`), `id`, `createdAt`, and `deletedAt` are immutable via this endpoint.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord with a valid session can update a contact and receive the updated record in under 2 seconds end-to-end.
- **SC-002**: 100% of partial updates change only the fields provided — 0% of omitted fields are cleared or altered.
- **SC-003**: 100% of duplicate-email updates within the same workspace are rejected with a conflict error — 0% result in duplicate email contacts.
- **SC-004**: 100% of update attempts on inaccessible contacts (missing, cross-tenant, archived) return 404 — 0% expose cross-workspace data.
- **SC-005**: 100% of update requests containing `tenantId` in the body result in the contact's workspace remaining unchanged.

## Assumptions

- The endpoint path is `PATCH /api/v1/contacts/:id`, extending the existing `/contacts` route prefix.
- All six updatable fields are optional in the patch body individually — but at least one must be present.
- Field max lengths: `firstName`/`lastName` 100 chars, `email` 255 chars, `phone` 30 chars, `idNumber` 50 chars, `notes` 1000 chars — consistent with US 12.1 (create).
- Updating a contact's email requires the same uniqueness check as creating: the new email (lowercased) must not be in use by any other active contact in the same workspace.
- A contact's `id`, `tenantId`, `createdAt`, and `deletedAt` are immutable through this endpoint.
- The response shape is identical to the create and get-by-id responses — `TenantContactResponseDto` is reused.
- Concurrent updates are not coordinated — last write wins. Optimistic locking is out of scope.
- This feature covers the backend API only — the UI for editing contacts is a separate story.
