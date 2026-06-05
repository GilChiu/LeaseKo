# Quickstart: Property List Page

**Feature**: `specs/036-list-properties-ui/spec.md`
**Route**: `/properties` (inside the dashboard layout)

---

## Prerequisites

- API running at `NEXT_PUBLIC_API_URL` with `GET /properties` endpoint available
- Clerk configured (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set)
- At least one tenant with properties seeded in the database

---

## Scenario 1 — View property list (happy path)

1. Sign in as a landlord with 3 existing properties.
2. Click "Properties" in the sidebar.
3. **Expected**: Properties page loads. Three property cards visible, each showing name, address, and property type. Heading area shows "3 properties".

---

## Scenario 2 — Loading state

1. Open browser DevTools → Network → throttle to "Slow 3G".
2. Navigate to `/properties`.
3. **Expected**: Loading indicator (skeleton cards or spinner) visible for the entire duration of the slow fetch. No flash of empty state.

---

## Scenario 3 — Empty state (fresh account)

1. Sign in as a landlord with zero properties in their workspace.
2. Navigate to `/properties`.
3. **Expected**: Empty state message visible ("No properties yet" or equivalent). "Add property" affordance visible. No blank or broken layout.

---

## Scenario 4 — Server error + retry

1. Stop the API server (or mock a 500 response).
2. Navigate to `/properties`.
3. **Expected**: Error message visible with a "Retry" button.
4. Restart the API server.
5. Click "Retry".
6. **Expected**: Loading state shown briefly, then property list appears.

---

## Scenario 5 — 401 redirect (expired session)

1. Sign in and navigate to `/properties`.
2. In browser DevTools → Application → clear the Clerk session cookies.
3. Refresh the page.
4. **Expected**: Redirect to `/sign-in` (handled by Clerk middleware or the 401 API error handler).

---

## Scenario 6 — 403 forbidden (no workspace context)

1. Sign in as a user with no active Clerk organisation.
2. Navigate to `/properties`.
3. **Expected**: Inline message explaining no organisation context. No redirect.

---

## Scenario 7 — Property with missing optional fields

1. Seed a property with only required fields (no `addressLine2`, no `state`, no `description`).
2. Navigate to `/properties`.
3. **Expected**: Property card renders cleanly — no blank line where `addressLine2` would be, no error.

---

## Scenario 8 — Sidebar active state

1. Navigate to `/dashboard`.
2. Verify: "Properties" sidebar entry is NOT highlighted.
3. Click "Properties".
4. Verify: "Properties" sidebar entry IS highlighted. Other entries are not.

---

## Scenario 9 — Truncation notice (> 50 properties)

1. Seed 60 properties in the workspace.
2. Navigate to `/properties`.
3. **Expected**: 50 property cards visible. A notice reads "Showing 50 of 60 properties" (or equivalent). No pagination controls.
