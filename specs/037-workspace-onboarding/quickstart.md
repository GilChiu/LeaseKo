# Quickstart: Workspace Onboarding

**Feature**: `specs/037-workspace-onboarding/spec.md`

---

## Scenario 1 — New user creates first workspace

1. Sign in as a brand new user with no organisation membership.
2. Navigate to `/dashboard` or `/properties`.
3. **Expected**: The header shows an `OrganizationSwitcher` control prompting workspace creation.
4. Click it and create a workspace named "Test Portfolio".
5. **Expected**: Automatically redirected to `/properties`. No 403 banner. Workspace name "Test Portfolio" visible in the header.

---

## Scenario 2 — User with active workspace (returning login)

1. Sign in as a user who already belongs to a workspace.
2. Navigate to `/properties`.
3. **Expected**: Properties page loads immediately (empty state or list). No 403 banner. Workspace name visible in header.

---

## Scenario 3 — User switches workspace

1. Sign in as a user who belongs to two workspaces (e.g. "Portfolio A" and "Portfolio B").
2. Verify "Portfolio A" is active in the header.
3. Click the OrganizationSwitcher and select "Portfolio B".
4. **Expected**: Automatically redirected to `/properties`. Header now shows "Portfolio B". Data reflects Portfolio B's tenant.

---

## Scenario 4 — Personal account option is hidden

1. Sign in and open the OrganizationSwitcher dropdown.
2. **Expected**: "Personal Account" option is NOT listed — only org workspaces appear.

---

## Scenario 5 — Header layout integrity

1. Sign in with an active workspace.
2. Navigate to any dashboard page.
3. **Expected**: Both OrganizationSwitcher and UserButton are visible in the header simultaneously. Neither overlaps the other.
