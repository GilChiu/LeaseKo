# Feature Specification: Property Detail & Unit Management

**Feature Branch**: `sprint/002`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User description: "As a landlord, I want to manage units from a property page so that I can view the property's details, see all its units, and add new units."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — View Property Details and Units (Priority: P1)

A landlord clicks a property card on the properties list and arrives at the property detail page. They can read the property's name, full address, type, and description. Below the property information they see a list of all units for that property (or an empty state if none exist yet). Each unit shows its unit number, status, floor area, bedrooms, bathrooms, and monthly rent.

**Why this priority**: This is the core read path. Without the ability to view a property and its units, no other action on this page is reachable or useful.

**Independent Test**: Click any property card on `/properties`. Verify the URL changes to `/properties/:id`, the property's name and address are displayed, and the unit list (or an empty-state message) is visible.

**Acceptance Scenarios**:

1. **Given** a landlord on the properties list, **When** they click a property card, **Then** they are taken to `/properties/:id` and the property's name, full address, type, and description are displayed.
2. **Given** a property that has existing units, **When** the landlord views the property detail page, **Then** all units are listed, each showing unit number, status, floor area, bedrooms, bathrooms, and monthly rent.
3. **Given** a property with no units, **When** the landlord views the property detail page, **Then** an empty-state message is displayed explaining that no units have been added yet, along with a prompt to add the first unit.
4. **Given** the property data is loading, **When** the page is first opened, **Then** a loading indicator is displayed until both the property details and unit list have resolved.
5. **Given** the property does not exist or belongs to a different tenant, **When** the landlord navigates to that property's URL, **Then** a not-found message is displayed — they are not redirected and no other tenant's data is shown.

---

### User Story 2 — Add a Unit (Priority: P2)

The landlord clicks "Add unit" on the property detail page. An inline form appears with fields for unit number, floor area, bedrooms, bathrooms, monthly rent, and description. They fill in the required field (unit number) and any optional fields, then submit. The new unit appears in the unit list immediately — no manual refresh required. A Cancel button is always visible and returns to the property detail view without creating a unit.

**Why this priority**: The main write action for this feature. Without it, the unit list is view-only and the feature delivers no creation value.

**Independent Test**: On a property detail page, click "Add unit". Fill in a unique unit number (e.g. "101") and click Save. Verify the unit appears in the list. Click "Add unit" again, fill in "102", click Cancel — verify "102" is not in the list and the form is dismissed.

**Acceptance Scenarios**:

1. **Given** a landlord on the property detail page, **When** they click "Add unit", **Then** an inline form appears with fields for unit number (required), floor area, bedrooms, bathrooms, monthly rent, and description.
2. **Given** a landlord who fills in a valid unit number and submits, **When** the request succeeds, **Then** the form closes, the unit list refreshes, and the new unit is visible without a manual page reload.
3. **Given** a landlord who fills in optional fields (floor area, bedrooms, bathrooms, monthly rent, description) and submits, **When** the request succeeds, **Then** all provided values are visible on the unit in the list.
4. **Given** a landlord who leaves all optional fields blank and submits, **When** the request succeeds, **Then** the unit is created successfully — blank optional fields are not sent as zero or empty values.
5. **Given** a landlord on the add-unit form, **When** they click Cancel, **Then** the form dismisses and the unit list is unchanged — no unit was created.
6. **Given** a submit in progress, **When** the landlord views the form, **Then** the submit button is disabled and shows a loading indicator; form fields remain visible and readable.
7. **Given** a landlord who rapidly clicks the submit button, **When** the first click fires the request, **Then** only one request is sent — subsequent clicks have no effect.

---

### User Story 3 — Unit Form Validation and Error Handling (Priority: P3)

The form checks required fields before sending any request. All required-field errors appear simultaneously. Numeric fields reject out-of-range values. Server-reported field errors appear under the relevant input; general errors appear as a banner above the form. The form stays open on failure so the landlord can correct and resubmit.

**Why this priority**: Without validation and error surfacing, the landlord has no guidance when input is invalid or the server rejects a submission.

**Independent Test**: Click "Add unit", leave the unit number blank, click Save — verify an inline required-field error appears on the unit number field. Then enter a duplicate unit number (one that already exists for this property) and submit — verify the server's conflict error appears under the unit number field.

**Acceptance Scenarios**:

1. **Given** a landlord who submits the form with the unit number blank, **When** the form validates, **Then** an inline required-field error appears on the unit number field and no request is sent.
2. **Given** a landlord who enters a unit number exceeding 50 characters, **When** they submit, **Then** an inline max-length error appears on the unit number field.
3. **Given** a landlord who enters a duplicate unit number for this property, **When** the server returns a conflict error, **Then** the error is displayed under the unit number field and the form remains open.
4. **Given** a landlord who enters a non-positive or non-integer value for bedrooms (e.g. "0", "-1", "1.5"), **When** the server rejects it, **Then** the error is displayed under the bedrooms field.
5. **Given** a landlord who enters a non-positive value for floor area, bathrooms, or monthly rent (e.g. "0", "-5"), **When** the server rejects it, **Then** the error is displayed under the relevant field.
6. **Given** a server or network error during unit creation, **When** the submit fails, **Then** an error banner is shown above the form, the form stays open with the landlord's inputs intact, and the submit button is re-enabled.
7. **Given** a server error for a field the form does not recognise, **When** the response is received, **Then** the error is shown as a general banner rather than silently discarded.
8. **Given** the landlord's session has expired, **When** they attempt to submit, **Then** they are redirected to the sign-in page.
9. **Given** the landlord has no active workspace, **When** they attempt to submit, **Then** an inline error banner explains the workspace issue — they are not redirected.

---

### User Story 4 — Property Detail Load Error States (Priority: P4)

When the property detail page cannot load — due to a network error, server error, or session expiry — the landlord sees a clear, recoverable error state. A Retry button is available for transient failures. Session expiry redirects to sign-in. Workspace errors show an inline message.

**Why this priority**: Error states on the property detail page itself are less common than validation errors, but without them the landlord is stuck on a blank or broken page with no recovery path.

**Independent Test**: Stop the API. Navigate to a property detail URL. Verify an error state with a Retry button is shown. Restart the API, click Retry — verify the page loads correctly.

**Acceptance Scenarios**:

1. **Given** the API is unreachable when the property detail page loads, **When** the fetch fails, **Then** an error message is displayed with a Retry button; the landlord is not redirected.
2. **Given** the property fetch returns a 404 (property not found or wrong tenant), **When** the page loads, **Then** a not-found message is displayed — no retry is offered.
3. **Given** the property fetch returns a 401 (session expired), **When** the page loads, **Then** the landlord is redirected to the sign-in page.
4. **Given** the property fetch returns a 403 (no active workspace), **When** the page loads, **Then** an inline workspace error is shown — no redirect.

---

### Edge Cases

- **Duplicate unit number**: The property already has a unit "101" — creating another "101" returns a server conflict error shown under the unit number field.
- **Unit number at 50 characters**: Valid — form submits successfully.
- **Unit number at 51 characters**: Max-length error shown on the unit number field; no request sent.
- **Bedrooms = 0 or negative**: Server rejects with a validation error shown under the bedrooms field.
- **Floor area / bathrooms / monthly rent = 0 or negative**: Server rejects; error shown under the relevant field.
- **Bedrooms as decimal (e.g. 1.5)**: Server rejects (must be integer); error shown under bedrooms field.
- **All optional fields blank**: Unit is created with only the unit number; blank fields are omitted from the request — not sent as null, 0, or empty string.
- **Description at 1000 characters**: Valid submission.
- **Description at 1001 characters**: Max-length error on description field; no request sent.
- **Property with 50+ units**: All units are listed; no pagination is enforced in this version.
- **Cancel mid-fill**: Form dismisses immediately, no confirmation dialog, no unit created.
- **Add unit while previous add is in progress**: Impossible — the Submit button is disabled during submission.
- **Navigating back to the properties list**: The browser Back button or a "Back to properties" link returns the landlord to `/properties`.
- **Unit status on creation**: Always set to AVAILABLE by the backend — not a form field. Landlords manage status via a future edit flow.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The property detail page MUST be accessible at `/properties/:id` and reachable by clicking a property card on the properties list page.
- **FR-002**: The property detail page MUST display the property's name, full address (address line 1, address line 2, city, state, postal code, country), property type, and description.
- **FR-003**: The property detail page MUST display a list of all units belonging to that property, each showing unit number, status, floor area, bedrooms, bathrooms, and monthly rent.
- **FR-004**: When a property has no units, the page MUST display an empty-state message and an affordance to add the first unit.
- **FR-005**: An "Add unit" button MUST be present on the property detail page and MUST open an inline unit creation form.
- **FR-006**: The unit creation form MUST include: unit number (required), floor area (optional, positive number), bedrooms (optional, positive integer ≥ 1), bathrooms (optional, positive number), monthly rent (optional, positive number), description (optional, max 1000 characters).
- **FR-007**: Unit status MUST NOT be a form field — new units are always created with status AVAILABLE; status management is a future feature.
- **FR-008**: On submit, the form MUST validate that unit number is non-blank and does not exceed 50 characters before sending any request.
- **FR-009**: All required-field validation errors MUST appear simultaneously — not sequentially.
- **FR-010**: Optional fields left blank MUST be omitted from the submission — they MUST NOT be sent as zero, null, or empty string.
- **FR-011**: While a unit creation request is in progress, the submit button MUST be disabled and show a loading indicator; form fields MUST remain visible.
- **FR-012**: Only one unit creation request MUST be sent per submit action — rapid repeated clicks MUST NOT send multiple requests.
- **FR-013**: On successful unit creation, the form MUST close and the unit list MUST refresh to include the new unit — no manual page reload required.
- **FR-014**: Field-level error messages returned by the server MUST be displayed under the relevant field.
- **FR-015**: General error messages returned by the server MUST be displayed as a banner above the form.
- **FR-016**: Server error messages for unrecognised fields MUST be shown as a general banner rather than discarded.
- **FR-017**: On server or network error, the form MUST remain open with the landlord's inputs intact and the submit button re-enabled.
- **FR-018**: A session expiry error (401) on unit creation MUST redirect the landlord to the sign-in page.
- **FR-019**: A workspace-context error (403) on unit creation MUST show an inline banner — the landlord MUST NOT be redirected.
- **FR-020**: A Cancel button MUST always be visible on the unit creation form and MUST dismiss the form without creating a unit.
- **FR-021**: The property detail page MUST show a loading state while property details and the unit list are being fetched.
- **FR-022**: If the property cannot be found or belongs to a different tenant, a not-found state MUST be shown — no redirect.
- **FR-023**: A session expiry error (401) on property load MUST redirect the landlord to the sign-in page.
- **FR-024**: A workspace-context error (403) on property load MUST show an inline workspace error — no redirect.
- **FR-025**: The property detail page MUST NOT contain any business logic — all validation and persistence is enforced by the backend.

### Key Entities

- **Property**: A rental property. Displayed fields: name, addressLine1, addressLine2, city, state, postalCode, country, propertyType, description.
- **Unit**: A rentable space within a property. Displayed fields: unitNumber, status, floorArea, bedrooms, bathrooms, monthlyRent. Created fields: unitNumber, floorArea, bedrooms, bathrooms, monthlyRent, description.
- **UnitStatus**: Enum — AVAILABLE, OCCUPIED, MAINTENANCE, INACTIVE. New units always start as AVAILABLE.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord can navigate from the properties list to a property's detail page and see its units in under 5 seconds on a standard connection.
- **SC-002**: A landlord can create a new unit and see it in the list within 60 seconds of clicking "Add unit".
- **SC-003**: 100% of submit attempts with a blank unit number show a required-field error simultaneously — zero sequential single-error flows.
- **SC-004**: A failed unit creation (server or network error) leaves the form open with all previously entered values intact — 0% data loss on error.
- **SC-005**: Only one unit creation request is sent per submit action regardless of how many times the button is clicked — 0% duplicate submissions.
- **SC-006**: All server-returned error messages (field-level and general) are surfaced to the landlord — 0% silently discarded errors.
- **SC-007**: Duplicate unit number errors from the server are shown under the unit number field — not as a generic banner.

## Assumptions

- The property detail and units APIs (`GET /properties/:id`, `GET /properties/:propertyId/units`, `POST /properties/:propertyId/units`) are already implemented and return structured error responses.
- Unit status defaults to AVAILABLE on creation and cannot be set by the landlord in this feature — a dedicated status management flow is deferred.
- Numeric validation (positive integers for bedrooms, positive numbers for floor area / bathrooms / monthly rent) is enforced by the backend; the frontend shows server-returned errors for out-of-range values.
- The unit list is not paginated in this version — all units for a property are returned in a single request.
- The "Add unit" form is rendered inline on the property detail page (not as a modal or a separate route) — consistent with the existing dashboard layout.
- A "Back to properties" link or the browser Back button is sufficient for returning to `/properties` — no dedicated breadcrumb component is required in this version.
- Floor area units (m², ft²) are display-only; no unit conversion is performed by the frontend.
- This feature covers unit creation only — editing or deleting an existing unit is a separate future story.
- The property detail page is desktop-first, consistent with the rest of the dashboard.
