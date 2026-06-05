# UI Contract: Property List Page

**Feature**: `specs/036-list-properties-ui/spec.md`
**Date**: 2026-06-05

This document defines the visual contract for each possible state of the Properties page. Each state is mutually exclusive and must be visually distinct from the others.

---

## State: LOADING

**Trigger**: Page mounts (Clerk initialising OR fetch in-flight) OR retry button clicked.

**Visible elements**:
- Page heading: "Properties"
- Loading indicator: 3 skeleton card placeholders (or equivalent spinner)
- No property list, no empty state, no error message, no retry button

**Must NOT show**:
- Any property cards
- Empty state message
- Error message

---

## State: SUCCESS

**Trigger**: Fetch completes with `items.length > 0`.

**Visible elements**:
- Page heading: "Properties"
- Count label: "{total} properties" (uses `total` from API response, not `items.length`)
- If `total > items.length` (i.e. total > 50): notice "Showing {items.length} of {total} properties"
- List of `PropertyCard` components — one per item in `items`
- Each card shows:
  - Property name (prominent)
  - Full address: `addressLine1[, addressLine2], city[, state], country`
  - Property type badge/label
  - Clickable — clicking navigates to `/properties/{id}` (placeholder route acceptable)

**Must NOT show**:
- Loading indicator
- Empty state message
- Error message

---

## State: EMPTY

**Trigger**: Fetch completes with `items.length === 0`.

**Visible elements**:
- Page heading: "Properties"
- Empty state message: "No properties yet" (or equivalent clear wording)
- Supporting text: "Add your first property to get started."
- "Add property" button or link (visual only — destination is `/properties/new`, which may not exist yet)
- Count label is absent or shows "0 properties"

**Must NOT show**:
- Loading indicator
- Any property cards
- Error message

---

## State: ERROR_FORBIDDEN

**Trigger**: API returns HTTP 403.

**Visible elements**:
- Page heading: "Properties"
- Inline message: "No active organisation context. Please select or create an organisation to continue."
- No retry button (403 cannot be resolved by retrying — requires user action outside this page)

**Must NOT show**:
- Loading indicator
- Property list
- Empty state message

---

## State: ERROR_SERVER

**Trigger**: API returns HTTP 5xx, or network is unreachable, or any non-401/403 error.

**Visible elements**:
- Page heading: "Properties"
- Error message: "Failed to load properties. Please try again."
- "Retry" button

**Must NOT show**:
- Loading indicator
- Property list
- Empty state message

**On retry button click**: transition to LOADING state, clear error, re-fetch.

---

## API Integration Contract

**Endpoint**: `GET /api/v1/properties?page=1&limit=50`

**Request headers**:
```
Authorization: Bearer {clerk_jwt}
Content-Type: application/json
```

**Success response shape** (HTTP 200):
```json
{
  "items": [ { ...Property } ],
  "total": 12,
  "page": 1,
  "limit": 50
}
```

**Error responses and handling**:

| HTTP Status | Frontend Action |
|---|---|
| 401 | Redirect to `/sign-in` immediately |
| 403 | Show ERROR_FORBIDDEN state |
| 5xx | Show ERROR_SERVER state with retry |
| Network error | Show ERROR_SERVER state with retry |

---

## NavLink Active State Contract

**Component**: `NavLink` in the sidebar

| Current route | "Properties" item appearance |
|---|---|
| `/properties` or `/properties/*` | Highlighted (e.g. white text + `bg-slate-700`) |
| Any other route | Default muted style (`text-slate-400`) |
