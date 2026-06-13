# Feature Specification: Create Renter Contact

**Feature Branch**: `sprint/003`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User Description: "As a landlord, I want to create renter contact records via the API so that I can manage the people renting my units."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Successfully Create a Renter Contact (Priority: P1)

A landlord sends a valid request to create a renter contact with the required details. The system creates the record, scopes it to the landlord's workspace, and returns the new contact.

**Why this priority**: This is the entire purpose of the feature. Without a working creation path, nothing else in Tenant CRM is reachable.

**Independent Test**: Submit a request with a first name, last name, and a unique email address. Verify the response contains the created contact with a generated ID, the correct workspace scope, and all submitted fields. Verify the request does not need to supply a workspace ID — it is inferred from the authentication context.

**Acceptance Scenarios**:

1. **Given** an authenticated landlord with an active workspace, **When** they submit a valid first name, last name, and email, **Then** a contact record is created and the full contact is returned with a system-generated ID and timestamps.
2. **Given** a landlord who also provides optional fields (phone, ID number, notes), **When** the request is submitted, **Then** all provided values are saved and returned in the response.
3. **Given** a landlord who omits all optional fields, **When** the request is submitted, **Then** the contact is created successfully — omitted optional fields are returned as null/absent.
4. **Given** the same email address used by a contact in a different workspace, **When** a landlord in this workspace submits that email, **Then** the contact is created successfully — email uniqueness is enforced per workspace only.

---

### User Story 2 — Input Validation (Priority: P2)

The system rejects requests with missing required fields, malformed email addresses, or fields that exceed maximum allowed lengths. All validation errors for a single request are returned together.

**Why this priority**: Without validation, invalid data enters the system. Simultaneous error reporting prevents clients from making multiple round-trips to discover each error individually.

**Independent Test**: Submit a request with all fields blank. Verify the response contains validation errors for all three required fields simultaneously. Submit a request with an invalid email format. Verify a specific email-format error is returned.

**Acceptance Scenarios**:

1. **Given** a request with firstName blank or whitespace-only, **When** submitted, **Then** a required-field error is returned for firstName.
2. **Given** a request with lastName blank or whitespace-only, **When** submitted, **Then** a required-field error is returned for lastName.
3. **Given** a request with email blank or whitespace-only, **When** submitted, **Then** a required-field error is returned for email.
4. **Given** a request with all three required fields blank, **When** submitted, **Then** all three required-field errors are returned in a single response — not one at a time.
5. **Given** a request with a malformed email (missing `@`, no domain, trailing dots), **When** submitted, **Then** an email-format error is returned and no contact is created.
6. **Given** a request where a field exceeds its maximum allowed length, **When** submitted, **Then** a max-length error is returned for that specific field.
7. **Given** a request that passes all validation, **When** re-submitted after correcting errors, **Then** no validation errors are returned and the contact is created.

---

### User Story 3 — Email Uniqueness Per Workspace (Priority: P3)

The system prevents duplicate email addresses within the same workspace while allowing the same email to be registered in different workspaces.

**Why this priority**: Duplicate contacts in the same workspace corrupt CRM data. Cross-workspace isolation ensures each landlord's data remains private and independent.

**Independent Test**: Create a contact with email `alice@example.com`. Attempt to create a second contact with the same email in the same workspace. Verify a conflict error is returned and no duplicate is created. Then create a contact with `alice@example.com` in a different workspace. Verify it succeeds.

**Acceptance Scenarios**:

1. **Given** a contact with email `alice@example.com` already exists in the current workspace, **When** a request is submitted with the same email (same or different case), **Then** a conflict error is returned and no new contact is created.
2. **Given** a contact with email `alice@example.com` exists in workspace A, **When** a landlord in workspace B submits the same email, **Then** the contact is created successfully in workspace B — cross-workspace uniqueness is not enforced.
3. **Given** a contact was archived (soft-deleted), **When** a new contact with the same email is submitted in the same workspace, **Then** the system treats the archived record as inactive and allows the new contact to be created.

---

### User Story 4 — Workspace Isolation and Authentication (Priority: P4)

The workspace that owns the contact is always derived from the authenticated session — it can never be supplied or overridden by the caller. Unauthenticated requests and requests without an active workspace are rejected.

**Why this priority**: Without strict workspace isolation, a landlord could create contacts under another landlord's workspace — a critical data security failure.

**Independent Test**: Submit a valid contact creation request that includes a workspace ID in the request body. Verify the workspace ID in the body is ignored and the contact is scoped to the authenticated session's workspace. Submit a request with no authentication token. Verify a 401 error is returned.

**Acceptance Scenarios**:

1. **Given** a request body that includes a workspace ID field, **When** the request is processed, **Then** the workspace ID in the body is rejected or ignored — the contact is always scoped to the session's workspace.
2. **Given** a request with no authentication token, **When** submitted, **Then** the request is rejected with an authentication error.
3. **Given** an authenticated user with no active workspace selected, **When** they attempt to create a contact, **Then** the request is rejected with a workspace-context error — no contact is created.

---

### Edge Cases

- **Email case sensitivity**: `Alice@Example.com` and `alice@example.com` are treated as the same email within a workspace — uniqueness check is case-insensitive.
- **Whitespace-only required fields**: First name, last name, or email containing only spaces is treated as blank and triggers a required-field error.
- **firstName exactly at max length**: Contact is created successfully.
- **firstName one character over max length**: Max-length error returned for firstName only; other valid fields are unaffected.
- **Email at 255 characters**: Valid if well-formed; contact is created.
- **Email at 256 characters**: Max-length error returned.
- **Phone with international format** (e.g. `+63 912 345 6789`): Accepted — no format is enforced; max length applies.
- **Notes with multi-line text or special characters**: Accepted as-is up to the max length.
- **ID number with hyphens or slashes** (e.g. passport number format): Accepted — no format enforced; max length applies.
- **Archived contact with same email**: A new contact with the same email can be created once the original is archived.
- **Workspace ID in request body**: Silently ignored; contact is scoped to the authenticated session's workspace.
- **Workspace ID in query string or header**: Silently ignored for the same reason.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide an endpoint that creates a renter contact record when called with valid data and a valid authenticated session.
- **FR-002**: A renter contact MUST store: first name (required), last name (required), email address (required), phone number (optional), ID number (optional), notes (optional).
- **FR-003**: The workspace that owns the contact MUST be derived exclusively from the authenticated session — it MUST NOT be accepted from the request body, query string, or header.
- **FR-004**: Email addresses MUST be unique within a workspace. The uniqueness check MUST be case-insensitive. Duplicate email attempts MUST return a conflict error.
- **FR-005**: The same email address MAY exist in different workspaces — cross-workspace email uniqueness MUST NOT be enforced.
- **FR-006**: First name and last name MUST NOT be blank or whitespace-only.
- **FR-007**: Email MUST conform to a valid email address format.
- **FR-008**: All fields MUST be validated against maximum allowed lengths. Requests exceeding these limits MUST be rejected with a field-specific error.
- **FR-009**: All validation errors for a single request MUST be returned together in one response — not sequentially.
- **FR-010**: An unauthenticated request MUST be rejected with an authentication error.
- **FR-011**: A request from an authenticated user with no active workspace MUST be rejected with a workspace-context error.
- **FR-012**: On success, the endpoint MUST return the newly created contact including its system-generated ID, all stored fields, and creation timestamp.
- **FR-013**: Archived (soft-deleted) contacts MUST NOT block creation of a new contact with the same email in the same workspace.

### Key Entities

- **RenterContact**: A person who rents or is being considered to rent a unit. Fields: first name, last name, email, phone, ID number, notes, workspace association, creation and update timestamps. Called `TenantContact` in the data model.
- **Email Uniqueness Rule**: Within a single workspace, no two active renter contacts may share the same email address (case-insensitive).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord with a valid session can create a renter contact in under 2 seconds end-to-end.
- **SC-002**: 100% of requests with missing required fields receive all missing-field errors in a single response — 0% sequential single-error flows.
- **SC-003**: 100% of duplicate-email attempts within the same workspace are rejected with a conflict error — 0% duplicate contacts created.
- **SC-004**: 0% of contact records are created outside the authenticated session's workspace — cross-workspace leakage is impossible.
- **SC-005**: 100% of requests with workspace ID in the body, query string, or header are scoped to the session workspace — client-supplied workspace IDs are never honoured.

## Assumptions

- The `TenantContact` entity name is used in the data model and API; the spec uses "renter contact" to avoid confusion with the workspace-level tenant (the Clerk organisation).
- The API endpoint path is `POST /api/v1/contacts`.
- Field maximum lengths follow standard property-management CRM conventions: first name and last name 100 characters; email 255 characters; phone 30 characters; ID number 50 characters; notes 1000 characters.
- Email uniqueness within a workspace is enforced case-insensitively (e.g. `Alice@Example.com` and `alice@example.com` are duplicates).
- Phone and ID number fields accept free-form text with no format validation — only max-length is enforced.
- Soft-delete (archiving) of renter contacts is out of scope for this feature (deferred to US 12.5).
- This feature covers the backend API only — the UI for renter contacts is a separate story in Epic 15.
- An archived contact does not block a new contact with the same email; the uniqueness constraint applies to active contacts only.
