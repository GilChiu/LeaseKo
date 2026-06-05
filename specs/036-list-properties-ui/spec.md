# Feature Specification: Property List Page

**Feature Branch**: `feature/list-properties-ui`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User description: "As a landlord, I want to view my properties from the dashboard so that I can manage my portfolio visually."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — View Property List (Priority: P1)

An authenticated landlord navigates to the Properties section and sees a list of all properties belonging to their workspace. Each property shows its name, full address, and property type. A count of total properties is visible at the top of the list.

**Why this priority**: The property list is the primary management surface — without it, landlords have no visual overview of their portfolio.

**Independent Test**: Log in as a landlord with three properties. Navigate to the Properties section. Verify all three properties are displayed, each showing name, address, and property type. Verify the count reads "3 properties".

**Acceptance Scenarios**:

1. **Given** a landlord with existing properties, **When** they navigate to the Properties section, **Then** all their properties are displayed in a list with name, address, and property type visible for each.
2. **Given** a landlord viewing the property list, **When** the list loads, **Then** a total count of properties is displayed (e.g. "3 properties").
3. **Given** a property with no optional details (no secondary address line, no description), **When** it appears in the list, **Then** it displays correctly with no blank gaps or errors.
4. **Given** a landlord viewing the property list, **When** they click on a property, **Then** they are taken to that property's detail page (or a placeholder if the detail page is not yet built).
5. **Given** properties from another workspace, **When** the landlord views their list, **Then** those properties are never visible — the list reflects only the current workspace.

---

### User Story 2 — Loading State (Priority: P2)

While the system is fetching the property list, a visible loading indicator is shown. The loading state is clearly different from the empty state so the landlord knows data is being retrieved.

**Why this priority**: Without a loading indicator, a slow network makes the page appear broken or empty, causing landlords to doubt the system.

**Independent Test**: Simulate a slow network. Navigate to the Properties section. Verify a loading indicator (e.g. skeleton cards or spinner) is visible for the full duration of the fetch, and is not mistaken for the empty state.

**Acceptance Scenarios**:

1. **Given** the system is fetching property data, **When** the landlord lands on the Properties section, **Then** a loading indicator is shown immediately while data is being retrieved.
2. **Given** the session token is still being initialised, **When** the page first renders, **Then** the loading state is shown until the token is available and the data fetch completes — no premature empty state is shown.
3. **Given** a fetch that takes more than 2 seconds, **When** the landlord waits, **Then** the loading state persists for the full duration — it does not flash to empty and back.

---

### User Story 3 — Empty State (Priority: P3)

A landlord with no properties sees a clear message explaining the list is empty, along with an affordance (button or link) prompting them to add their first property.

**Why this priority**: A blank screen on a fresh account is disorienting. An empty state guides the landlord to the next action.

**Independent Test**: Log in as a landlord with zero properties. Navigate to the Properties section. Verify an empty state message appears and a "Add property" button or link is visible. Verify no broken or blank layout is shown.

**Acceptance Scenarios**:

1. **Given** a landlord with no properties, **When** they navigate to the Properties section, **Then** an empty state message is shown (not a blank screen).
2. **Given** the empty state is shown, **When** the landlord reads it, **Then** a prompt or button to add a first property is visible — even if the create flow is not yet implemented, the affordance is present.
3. **Given** the empty state is shown, **When** the landlord inspects the UI, **Then** the empty state is visually distinct from the loading state.

---

### User Story 4 — Error States (Priority: P4)

When the system cannot retrieve the property list due to an authentication issue, permission problem, or server error, the landlord sees a clear, appropriate message. Server errors include a retry option.

**Why this priority**: Unhandled errors leave the landlord stranded. Categorised error messages let them understand the problem and take the right action.

**Independent Test**: Simulate a server error. Navigate to the Properties section. Verify an error message appears with a retry button. Click retry — verify the system re-fetches the list from scratch.

**Acceptance Scenarios**:

1. **Given** the landlord's session has expired or is invalid, **When** the Properties section attempts to load, **Then** the landlord is redirected to the sign-in page automatically.
2. **Given** the landlord has no active workspace context, **When** the Properties section attempts to load, **Then** an inline message explains that no organisation context is available — no redirect occurs.
3. **Given** the server returns an error (e.g. service unavailable) or the network is unreachable, **When** the Properties section fails to load, **Then** an error message is displayed with a retry button.
4. **Given** the error state is shown with a retry button, **When** the landlord clicks retry, **Then** the system re-fetches the property list from scratch, clearing the error state and showing the loading state first.

---

### User Story 5 — Properties Navigation (Priority: P5)

The sidebar navigation entry for "Properties" is a working link that takes the landlord to the Properties section. The link is visually highlighted when the landlord is currently on the Properties section.

**Why this priority**: Navigation is the entry point to the feature. Without a working link, the landlord cannot reach the Properties section naturally.

**Independent Test**: From the Dashboard, click the "Properties" sidebar entry. Verify the Properties section loads. Verify the "Properties" sidebar entry appears visually active/highlighted while on that page.

**Acceptance Scenarios**:

1. **Given** the landlord is on any dashboard page, **When** they click the "Properties" sidebar entry, **Then** they are taken to the Properties section.
2. **Given** the landlord is on the Properties section, **When** they view the sidebar, **Then** the "Properties" entry is visually highlighted as the active page.
3. **Given** the landlord is on the Dashboard page, **When** they view the sidebar, **Then** the "Properties" entry is not highlighted.

---

### Edge Cases

- A property with all optional fields missing (no secondary address, no description) displays correctly — no blank gaps, no errors in the layout.
- When the total number of properties exceeds the default page size, all fetched properties are shown and a note or indicator informs the landlord if more exist beyond what is currently displayed.
- Clicking retry after a server error clears the error state first (shows loading), then shows either the property list or a fresh error — never shows a stale error alongside a partial list.
- Navigating away from the Properties section and returning triggers a fresh data fetch — the list does not show stale data.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display the full list of properties belonging to the current workspace when the landlord navigates to the Properties section.
- **FR-002**: Each property in the list MUST display at minimum: property name, full address (primary line, city, country), and property type.
- **FR-003**: Optional property details (secondary address line, description) MUST be displayed when present and omitted gracefully when absent — no empty gaps or error states caused by missing optional data.
- **FR-004**: System MUST display the total count of fetched properties at the top of the list.
- **FR-005**: Each property entry in the list MUST be interactive — clicking it navigates the landlord toward that property's detail view (placeholder navigation is acceptable if the detail page is not yet built).
- **FR-006**: System MUST show a loading indicator while property data is being retrieved; the loading state MUST NOT be dismissible or timeout prematurely.
- **FR-007**: System MUST show a distinct empty state (message + add-property affordance) when the workspace has no properties.
- **FR-008**: System MUST redirect the landlord to the sign-in page when the session is expired or invalid.
- **FR-009**: System MUST show an inline error message (without redirect) when the landlord has no active workspace context.
- **FR-010**: System MUST show a server error message with a retry button when the data fetch fails due to a server or network error.
- **FR-011**: The retry action MUST re-fetch the property list from scratch — the error state is cleared and the loading state is shown during the retry.
- **FR-012**: The "Properties" sidebar entry MUST link to the Properties section.
- **FR-013**: The "Properties" sidebar entry MUST appear visually active when the landlord is on the Properties section and inactive otherwise.
- **FR-014**: The frontend MUST NOT filter, sort, or modify the property list — it renders exactly what the server returns.
- **FR-015**: Properties from other workspaces MUST NEVER appear in the list — scoping is entirely enforced by the server, not the frontend.

### Key Entities

- **Property**: A rental property belonging to the current workspace. Key display fields: name, address line 1, address line 2 (optional), city, country, property type. Optional fields: description.
- **Property List**: The ordered collection of properties returned by the server for the current workspace, including a total count.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A landlord with existing properties can navigate to the Properties section and see their full list within 3 seconds on a standard connection.
- **SC-002**: A landlord with zero properties always sees an empty state message — never a blank or broken layout.
- **SC-003**: 100% of server errors and network failures surface a visible error message with a retry option — no silent failures or blank screens.
- **SC-004**: The loading state is shown for 100% of fetches — no flash of empty state precedes data arriving.
- **SC-005**: Properties from other workspaces are never visible to the landlord — confirmed by logging in as two different tenants and verifying neither sees the other's data.
- **SC-006**: The sidebar "Properties" link correctly navigates to the Properties section from any page within the dashboard.

## Assumptions

- The server-side property list endpoint is already implemented and returns a paginated response including total count.
- For this feature, the first page of results is fetched with a limit of up to 50 properties; full pagination controls are deferred to a future story.
- If more than 50 properties exist, a note is shown informing the landlord that not all properties are displayed — no pagination UI is built in this story.
- The property detail page does not exist yet; clicking a property navigates to a placeholder route or is visually disabled with a "coming soon" indicator.
- The landlord is always authenticated before reaching the Properties section — the authentication system (sign-in, sign-up) is already in place.
- Workspace context (tenantId) is managed entirely by the authentication and authorisation layer — the frontend does not construct or pass it directly.
- The sidebar layout is shared across all dashboard pages — this story updates only the "Properties" entry to become a working link.
