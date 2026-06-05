# Feature Specification: Workspace Onboarding

**Feature Branch**: `feature/workspace-onboarding`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User description: "As a landlord, I want to create and switch my workspace (organisation) from within the app so that I can access my tenant-scoped data without needing the Clerk Dashboard."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Create First Workspace (Priority: P1)

A new landlord signs in for the first time and has no workspace. They see a workspace control in the dashboard header and can create their first workspace without leaving the app. After creating it, they are taken to the Properties page where they can start managing their portfolio.

**Why this priority**: Without a workspace, the landlord cannot access any data in the system — every page returns an access error. This is the first action any new user must complete.

**Independent Test**: Sign in as a brand new user with no workspace. Verify a workspace creation control is visible in the header. Create a workspace named "My Portfolio". Verify the user is taken to the Properties page automatically and the access error banner is gone.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no workspace, **When** they view the dashboard header, **Then** a workspace control is visible and invites them to create a workspace.
2. **Given** a signed-in user with no workspace, **When** they create a workspace from the header, **Then** they are automatically taken to the Properties page without a manual redirect.
3. **Given** a user who just created their workspace, **When** they view the Properties page, **Then** the "No active organisation context" error banner is no longer shown.
4. **Given** a user who just created their workspace, **When** they navigate around the dashboard, **Then** their workspace name is visible in the header at all times.

---

### User Story 2 — Switch Between Workspaces (Priority: P2)

A landlord who belongs to multiple workspaces can switch between them from the header. Switching changes the active tenant context so all data shown reflects the selected workspace.

**Why this priority**: Landlords managing multiple portfolios (e.g., personal and business) need to move between them without signing out and back in.

**Independent Test**: Sign in as a user who belongs to two workspaces. Verify both workspaces are listed in the workspace control. Switch to the second workspace. Verify the Properties page loads with the second workspace's data (or empty state if it has none).

**Acceptance Scenarios**:

1. **Given** a user belonging to multiple workspaces, **When** they open the workspace control, **Then** all workspaces they belong to are listed.
2. **Given** a user belonging to multiple workspaces, **When** they switch to a different workspace, **Then** they are taken to the Properties page automatically.
3. **Given** a user who has just switched workspaces, **When** they view any data page, **Then** only data belonging to the newly selected workspace is shown.

---

### User Story 3 — Persistent Workspace on Re-login (Priority: P3)

A returning landlord signs in and their previously active workspace is automatically restored. They do not need to re-select their workspace on every login.

**Why this priority**: Re-selecting a workspace on every login is friction that erodes trust in the product. Returning users expect to land where they left off.

**Independent Test**: Sign in, activate a workspace, sign out, sign back in. Verify the same workspace is active immediately — no manual re-selection required and no access error banner on the Properties page.

**Acceptance Scenarios**:

1. **Given** a user who previously activated a workspace, **When** they sign out and sign back in, **Then** their workspace is active immediately without any extra step.
2. **Given** a user who previously activated a workspace, **When** they land on the Properties page after re-login, **Then** no access error banner is shown.

---

### User Story 4 — Workspace Visible in Header at All Times (Priority: P4)

The active workspace name is always visible in the dashboard header so the landlord always knows which portfolio they are viewing.

**Why this priority**: In a multi-tenant app, showing the active context prevents landlords from accidentally managing the wrong portfolio.

**Independent Test**: Sign in with an active workspace. Navigate across Dashboard, Properties, and back. Verify the workspace name remains visible in the header throughout.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an active workspace, **When** they navigate to any dashboard page, **Then** the workspace name is visible in the header.
2. **Given** a signed-in user with an active workspace, **When** they view the header, **Then** the workspace control and the user account button are both visible without overlapping or overflowing on standard desktop widths.

---

### Edge Cases

- **No workspace, data page**: A user with no workspace who navigates directly to `/properties` sees the access error banner — the workspace control in the header remains their path to resolution.
- **Workspace creation fails**: If workspace creation fails (e.g. name exceeds character limit, network error), the user sees an inline error inside the workspace creation dialog — they remain on the current page and can retry or dismiss.
- **Member (not admin) of a workspace**: A user who has been invited to a workspace as a member (not the owner) can still activate and use that workspace as their context — they see its data based on their role permissions.
- **Header on narrow screens**: The workspace control and user account button must remain accessible and not obscure page content on smaller desktop viewport widths.
- **Single workspace**: A user with exactly one workspace sees it displayed in the header; the option to create an additional workspace is available but switching is not needed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A signed-in user with no active workspace MUST see a workspace control in the dashboard header that allows them to create a new workspace.
- **FR-002**: A user MUST be able to create a workspace entirely within the app — no external tools or dashboards required.
- **FR-003**: After successfully creating a workspace, the system MUST automatically navigate the user to the Properties page.
- **FR-004**: After creating a workspace, the Properties page MUST NOT show the "No active organisation context" error banner.
- **FR-005**: A user belonging to multiple workspaces MUST be able to switch between them from the header workspace control.
- **FR-006**: After switching to a different workspace, the system MUST automatically navigate the user to the Properties page so data refreshes to reflect the new workspace.
- **FR-007**: The active workspace name MUST be visible in the dashboard header at all times while the user is signed in and has an active workspace.
- **FR-008**: The workspace control and user account button MUST both be visible in the header simultaneously without overlapping at standard desktop widths.
- **FR-009**: When a returning user signs in and already has an active workspace, that workspace context MUST be restored automatically — no re-selection step required.
- **FR-010**: If workspace creation fails, the user MUST see an inline error message and remain on their current page — no data is lost and they can retry.
- **FR-011**: A user who is a member (not owner) of a workspace MUST be able to activate and use it as their active context.

### Key Entities

- **Workspace**: The organisational unit that groups all properties, units, and leases belonging to one landlord or management company. Each workspace is isolated — users only see data for their active workspace.
- **Workspace Control**: The interactive header element that displays the current workspace, allows creation of new workspaces, and allows switching between workspaces the user belongs to.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can create their first workspace and reach the Properties page in under 60 seconds from their first login.
- **SC-002**: 100% of new users who sign in and create a workspace see the Properties page (not the access error) within one navigation step.
- **SC-003**: A returning user with an existing workspace lands on a functional dashboard with no access error on re-login — zero re-selection steps required.
- **SC-004**: The workspace name is visible in the header on 100% of dashboard page views for signed-in users with an active workspace.
- **SC-005**: Workspace switching takes the user to the Properties page with the correct tenant's data in a single click — no additional navigation required.

## Assumptions

- The identity and authentication system already manages workspace membership — this feature only adds the in-app UI to create and switch workspaces.
- Each workspace is independent; data from one workspace is never visible in another, enforced by the backend.
- A user may belong to one or more workspaces; there is no hard limit enforced by this feature.
- Workspace names are subject to length and character constraints enforced by the identity system — this feature surfaces those errors but does not define the rules.
- The workspace control is placed in the existing dashboard header alongside the existing user account button — no new navigation areas are introduced.
- This feature does not cover workspace settings (rename, delete, member management) — those are deferred to a future feature.
- Organisation creation permissions may be configurable by an administrator (e.g. restricting creation to admins only); this feature does not change those settings — it only surfaces the creation UI where permitted.
