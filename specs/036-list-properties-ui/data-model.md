# Data Model: Property List Page

**Feature**: `specs/036-list-properties-ui/spec.md`
**Date**: 2026-06-05

---

## No Schema Changes

This feature is purely frontend. No Prisma schema changes, no new database tables, no new API endpoints. All data comes from the existing `GET /properties` endpoint.

---

## Frontend Types (new file: `apps/web/src/lib/types.ts`)

### Property

Mirrors the `PropertyResponseDto` returned by `GET /properties`.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string (UUID) | ✓ | |
| tenantId | string | ✓ | |
| name | string | ✓ | Display as property title |
| addressLine1 | string | ✓ | Primary address line |
| addressLine2 | string \| null | — | Optional — omit from display when null |
| city | string | ✓ | |
| state | string \| null | — | Optional |
| postalCode | string \| null | — | Optional |
| country | string | ✓ | |
| propertyType | string | ✓ | e.g. APARTMENT, HOUSE |
| description | string \| null | — | Optional — not shown in list view |
| createdAt | string (ISO 8601) | ✓ | |
| updatedAt | string (ISO 8601) | ✓ | |
| deletedAt | string \| null | — | Soft-delete timestamp; soft-deleted items never returned by API |

### PagedProperties

Response envelope from `GET /properties`.

| Field | Type | Notes |
|---|---|---|
| items | Property[] | Ordered list from API |
| total | number | Total matching records in backend |
| page | number | Current page (1-based) |
| limit | number | Page size used |

---

## UI State Machine

The properties page has one of five mutually exclusive states at any given time:

```
LOADING
  │  (Clerk token ready + fetch completes)
  ├──► SUCCESS (items.length > 0)
  ├──► EMPTY   (items.length === 0)
  ├──► ERROR_FORBIDDEN  (HTTP 403 — no workspace context)
  └──► ERROR_SERVER     (HTTP 401 redirect | HTTP 5xx | network failure)

From ERROR_SERVER:
  └── retry button → back to LOADING

From SUCCESS or EMPTY:
  └── (no transitions in this story)
```

Note: HTTP 401 does not produce an ERROR_SERVER state — it triggers an immediate redirect to `/sign-in`.

---

## Components Overview

| Component | File | Type | Purpose |
|---|---|---|---|
| `PropertiesPage` | `app/(dashboard)/properties/page.tsx` | Client | Main page — owns fetch state machine |
| `PropertyCard` | `app/(dashboard)/properties/_components/property-card.tsx` | Client | Renders one property row/card |
| `NavLink` | `components/nav-link.tsx` | Client | Sidebar nav item with active-state detection |

`PropertyCard` is a sub-component of the page — it receives a `Property` prop and renders name, address, and property type. It is a Client Component to allow future onClick navigation.

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/lib/types.ts` | NEW — `Property` and `PagedProperties` interfaces |
| `apps/web/src/app/(dashboard)/properties/page.tsx` | NEW — properties list page (Client Component) |
| `apps/web/src/app/(dashboard)/properties/_components/property-card.tsx` | NEW — property card sub-component |
| `apps/web/src/components/nav-link.tsx` | NEW — active sidebar nav link (Client Component) |
| `apps/web/src/app/(dashboard)/layout.tsx` | MODIFY — replace "Properties" `<span>` with `<NavLink>` |
