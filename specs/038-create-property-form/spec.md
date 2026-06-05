# Feature Specification: Create Property Form

**Feature Branch**: `feature/create-property-form`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User description: "As a landlord, I want to create a property from the UI so that I can add properties without using Swagger/Postman."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Successfully Create a Property (Priority: P1)

A landlord fills in the required property details and submits the form. The property is created and they are taken back to the properties list where the new property appears.

**Why this priority**: This is the entire purpose of the feature. Without a working happy path, the form has no value.

**Independent Test**: Fill in all five required fields (name, address line 1, city, country, property type) with valid values. Submit. Verify redirect to `/properties` and the new property appears in the list.

**Acceptance Scenarios**:

1. **Given** a landlord on the create property page, **When** they fill in all required fields and submit, **Then** the property is created and they are redirected to the properties list.
2. **Given** a landlord on the create property page, **When** they fill in required fields and also provide optional fields (address line 2, state, postal code, description), **Then** all provided values are saved and visible in the list.
3. **Given** a landlord on the create property page, **When** they leave all optional fields blank and submit, **Then** the form submits successfully — blank optional fields are not sent as empty values.
4. **Given** a successful property creation, **When** the landlord lands on the properties list, **Then** the newly created property is visible without requiring a manual page refresh.

---

### User Story 2 — Pre-Submission Validation (Priority: P2)

The form checks for missing required fields and oversized inputs before sending any data to the system. All errors for a single submit attempt are shown at the same time — not one at a time.

**Why this priority**: Client-side validation prevents unnecessary round-trips and gives the landlord immediate, clear feedback on what needs to be fixed before they can submit.

**Independent Test**: Click submit with all fields blank. Verify inline error messages appear simultaneously on all five required fields. Do not proceed until all are corrected.

**Acceptance Scenarios**:

1. **Given** a landlord who clicks submit with one or more required fields blank, **When** the form is submitted, **Then** all blank required fields simultaneously show an inline error message — not sequentially.
2. **Given** a landlord who types more than the allowed length in any field, **When** they leave or submit that field, **Then** an inline error appears on that specific field indicating the maximum allowed length.
3. **Given** a landlord who has corrected all validation errors, **When** they resubmit, **Then** no validation errors remain and the form proceeds to submission.
4. **Given** a landlord who enters a property type that is only whitespace, **When** they submit, **Then** the field is treated as blank and shows a required-field error.

---

### User Story 3 — Server Error Handling (Priority: P3)

When the server rejects the submission or cannot be reached, the landlord sees a clear, specific error. Field-level errors appear under the relevant field. General errors appear as a banner. The form remains open so the landlord can correct and resubmit.

**Why this priority**: Without error handling, a failed submission leaves the landlord with no feedback and no path to recovery. The form must surface all server-reported problems and keep the landlord's work intact.

**Independent Test**: Simulate a server error (stop the API). Submit the form. Verify an error banner appears with a way to try again. Restart the API, click retry / resubmit. Verify the form proceeds.

**Acceptance Scenarios**:

1. **Given** the server returns a field-level validation error (e.g. "name is too long"), **When** the form receives this response, **Then** the error message is displayed directly under the relevant field.
2. **Given** the server returns a general error message not tied to a specific field, **When** the form receives this response, **Then** the error is displayed as a banner above the form.
3. **Given** the server returns an error for a field the form does not recognise, **When** the form receives this response, **Then** the error is shown as a general banner rather than silently discarded.
4. **Given** the server is unreachable or returns a server error, **When** the submit fails, **Then** an error banner is shown, the form remains open with the landlord's inputs intact, and the submit button is re-enabled so they can retry.
5. **Given** the landlord's session has expired, **When** they attempt to submit, **Then** they are redirected to the sign-in page automatically.
6. **Given** the landlord has no active workspace, **When** they attempt to submit, **Then** an inline error explains the workspace issue — they are not redirected.

---

### User Story 4 — Submission State and Navigation (Priority: P4)

While the form is submitting, a visual indicator prevents the landlord from submitting twice. A Cancel button is always available to return to the properties list without saving.

**Why this priority**: Double-submission could create duplicate properties. The Cancel button prevents landlords from feeling trapped in the form.

**Independent Test**: Click submit on a valid form. Before the response returns, verify the submit button is disabled and shows a loading indicator. Verify only one request is sent. Also verify Cancel returns to `/properties` without saving.

**Acceptance Scenarios**:

1. **Given** a landlord who clicks submit on a valid form, **When** the request is in-flight, **Then** the submit button is disabled and shows a loading indicator.
2. **Given** a landlord who rapidly clicks submit multiple times, **When** the first click fires the request, **Then** only one request is sent — subsequent clicks have no effect.
3. **Given** a landlord on the create property page, **When** they click Cancel, **Then** they are taken to the properties list and no property is created.
4. **Given** a submit in progress, **When** the landlord views the form, **Then** all form fields remain visible and readable — the form is not hidden or obscured during submission.

---

### Edge Cases

- **All required fields blank on submit**: All five required-field errors appear simultaneously — the landlord sees every problem at once, not a sequence of one error per submit attempt.
- **Name exactly 121 characters**: Max-length error shown on the name field; all other valid fields are unaffected.
- **Description exactly 1001 characters**: Max-length error shown on description only.
- **Backend returns unknown field error**: Displayed as a general banner, not silently ignored.
- **Optional fields left blank**: Submitted without those fields — they are not sent as empty strings, which would be treated as provided-but-empty values by the system.
- **Cancel mid-fill**: Navigates to `/properties` immediately; no confirmation dialog required (no unsaved-changes warning in this version).
- **No workspace active**: Cannot create a property; form shows inline workspace-context error, not a redirect.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The create property page MUST be accessible at a dedicated route reachable from the properties list empty state.
- **FR-002**: The form MUST include input fields for all nine property attributes: name, primary address line, secondary address line, city, state, postal code, country, property type, and description.
- **FR-003**: The form MUST distinguish required fields (name, primary address line, city, country, property type) from optional fields (secondary address line, state, postal code, description) — required fields MUST be labelled as such.
- **FR-004**: On submit, the form MUST validate all required fields are non-blank before sending any request; all required-field errors MUST appear simultaneously.
- **FR-005**: On submit, the form MUST validate that no field exceeds its maximum allowed length; length errors MUST appear on the specific field that exceeds the limit.
- **FR-006**: Optional fields left blank MUST be omitted from the submission — they MUST NOT be sent as empty strings.
- **FR-007**: While a submission is in progress, the submit button MUST be disabled and show a loading indicator; form fields MUST remain visible.
- **FR-008**: Only one submission request MUST be sent per submit action — rapid repeated clicks MUST NOT send multiple requests.
- **FR-009**: On successful creation, the system MUST redirect the landlord to the properties list where the new property is immediately visible.
- **FR-010**: Field-level error messages returned by the server MUST be displayed under the relevant field.
- **FR-011**: General error messages returned by the server MUST be displayed as a banner above the form.
- **FR-012**: Server error messages for unrecognised fields MUST be shown as a general banner rather than discarded.
- **FR-013**: On server or network error, the form MUST remain open with the landlord's inputs intact and the submit button re-enabled.
- **FR-014**: A session expiry error MUST redirect the landlord to the sign-in page.
- **FR-015**: A workspace-context error MUST show an inline message without redirecting the landlord.
- **FR-016**: A Cancel button MUST always be visible and MUST return the landlord to the properties list without creating a property.
- **FR-017**: The form MUST NOT contain any business logic — all data validation and persistence is enforced by the backend; the frontend only surfaces errors returned by the backend.

### Key Entities

- **Property**: A rental property belonging to the landlord's workspace. Fields: name (required), primary address line (required), secondary address line (optional), city (required), state (optional), postal code (optional), country (required), property type (required), description (optional).
- **Form Error**: A validation message tied to a specific field or displayed as a general banner. May originate from client-side pre-validation or from the server response.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord with a valid workspace can create a property and see it in their list within 60 seconds of starting to fill the form.
- **SC-002**: 100% of submit attempts with missing required fields show all field errors simultaneously — zero sequential single-error flows.
- **SC-003**: A failed submission (server error) leaves the form open with all previously entered values intact — 0% data loss on error.
- **SC-004**: Only one creation request is sent per submit action regardless of how many times the button is clicked — 0% duplicate submissions.
- **SC-005**: All server-returned error messages (field-level and general) are surfaced to the landlord — 0% silently discarded errors.

## Assumptions

- The property creation endpoint is already implemented on the backend and returns structured error messages for validation failures.
- Property type is a free-form text field at this stage — no fixed list of options is enforced in this feature (a dropdown with predefined types is deferred).
- After a successful creation, the properties list is reloaded by navigating to `/properties` — the new property will appear because the list page fetches fresh data on mount.
- An unsaved-changes warning when navigating away mid-form is deferred to a future story.
- The form layout is desktop-first, consistent with the rest of the dashboard.
- This feature covers creation only — editing an existing property is a separate future story.
