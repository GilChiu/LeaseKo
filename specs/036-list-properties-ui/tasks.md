# Tasks: Property List Page

**Input**: Design documents from `specs/036-list-properties-ui/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-states.md ✅

**Tests**: No automated tests — manual verification via quickstart.md scenarios.

**Organization**: Tasks grouped by user story. All 5 stories are served by the same component tree; Phase 3 builds the full component, Phases 4–7 verify each story's state is correctly implemented.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in same group)
- **[Story]**: US1=list | US2=loading | US3=empty | US4=errors | US5=navigation
- All file paths are relative to `apps/web/src/`

---

## Phase 1: Setup

> No new project structure needed. Existing `apps/web/src/` layout is used as-is. Proceeding directly to foundational tasks.

---

## Phase 2: Foundational (Shared Types + NavLink)

**Purpose**: Create the shared `Property` TypeScript interface and the `NavLink` Client Component. Both are needed by Phase 3 user story tasks.

- [X] T001 Create `lib/types.ts` — export `interface Property { id: string; tenantId: string; name: string; addressLine1: string; addressLine2: string | null; city: string; state: string | null; postalCode: string | null; country: string; propertyType: string; description: string | null; createdAt: string; updatedAt: string; deletedAt: string | null; }` and `interface PagedProperties { items: Property[]; total: number; page: number; limit: number; }` — no imports needed; pure TypeScript interfaces
- [X] T002 [P] Create `components/nav-link.tsx` — add `'use client'` directive; import `Link` from `next/link`, `usePathname` from `next/navigation`; `interface NavLinkProps { href: string; children: React.ReactNode; }`; active condition: `const pathname = usePathname(); const isActive = pathname === href || pathname.startsWith(href + '/');`; render: `<Link href={href} className={isActive ? 'px-3 py-2 rounded bg-slate-700 text-white' : 'px-3 py-2 rounded text-slate-400 hover:bg-slate-700 hover:text-white'}>{children}</Link>`

**Checkpoint**: `pnpm typecheck` — both files compile with no errors.

---

## Phase 3: User Story 1 — View Property List (Priority: P1) 🎯 MVP

**Goal**: An authenticated landlord navigates to `/properties` and sees their full property list. Each entry shows name, address, and property type. Total count visible. Clicking a property navigates to `/properties/{id}` (placeholder). Sidebar "Properties" entry is a working link.

**Independent Test**: Sign in as a landlord with 3 properties. Navigate to `/properties`. Verify 3 property cards visible with name/address/type. Verify count label reads "3 properties". Verify no errors in console.

### Implementation for User Story 1

- [X] T003 [P] [US1] Create `app/(dashboard)/properties/_components/property-card.tsx` — add `'use client'` directive; import `useRouter` from `next/navigation`; import `Property` from `@/lib/types`; `interface Props { property: Property }`; address formatting: `const addressParts = [property.addressLine1, property.addressLine2, property.city, property.state, property.country].filter(Boolean); const address = addressParts.join(', ');`; render a div (or `Card` from `@/components/ui/card`) with: property name (bold), address string, propertyType label; onClick: `router.push('/properties/' + property.id)`; full file path: `apps/web/src/app/(dashboard)/properties/_components/property-card.tsx`
- [X] T004 [US1] Create `app/(dashboard)/properties/page.tsx` — complete Client Component owning the full fetch state machine; add `'use client'`; imports: `{ useAuth }` from `@clerk/nextjs`, `{ useRouter }` from `next/navigation`, `{ useEffect, useState }` from `react`, `{ apiFetch, ApiError }` from `@/lib/api`, `{ Property, PagedProperties }` from `@/lib/types`, `{ PropertyCard }` from `./_components/property-card`; state type: `type PageState = { status: 'loading' } | { status: 'success'; items: Property[]; total: number } | { status: 'empty' } | { status: 'error-forbidden' } | { status: 'error-server' }`; initial state: `{ status: 'loading' }`; fetch function `loadProperties`: calls `apiFetch<PagedProperties>('/properties?page=1&limit=50', { token })`, sets success/empty state on resolve, catches `ApiError` with status 401 → `router.push('/sign-in')`, status 403 → `error-forbidden`, otherwise → `error-server`; `useEffect` depends on `[isLoaded, getToken]` — only runs when `isLoaded` is true (prevents premature fetch during Clerk initialisation), calls `getToken()` then `loadProperties`; render switch on `state.status`: LOADING → 3 skeleton divs + heading; SUCCESS → heading + `"{state.total} properties"` count + optional truncation notice if `state.total > state.items.length` + list of `<PropertyCard>` for each item; EMPTY → heading + "No properties yet." message + "Add property" button (disabled/placeholder, navigates to `/properties/new`); ERROR_FORBIDDEN → heading + "No active organisation context available." inline message (no retry); ERROR_SERVER → heading + "Failed to load properties." + "Retry" button that calls `setState({ status: 'loading' })` then re-runs `loadProperties`
- [X] T005 [US1] Update `app/(dashboard)/layout.tsx` — import `NavLink` from `@/components/nav-link`; replace the "Properties" `<span className="px-3 py-2 rounded hover:bg-slate-700 hover:text-white cursor-pointer">Properties</span>` with `<NavLink href="/properties">Properties</NavLink>`; do not change any other sidebar entries or layout structure

**Checkpoint**: Start `pnpm dev`. Navigate to `/properties` as an authenticated user with properties. Verify list renders with name, address, type. Verify count label. Verify sidebar "Properties" link is active.

---

## Phase 4: User Story 2 — Loading State (Priority: P2)

**Goal**: The loading indicator is shown from the first render until the fetch completes. It never flashes to empty or success prematurely. Clerk initialisation delay is handled — loading state shows while `isLoaded === false`.

**Independent Test**: In DevTools → Network, throttle to "Slow 3G". Navigate to `/properties`. Verify loading indicator (skeleton cards or spinner) is visible for the full duration — no flash of empty state before data arrives.

### Implementation for User Story 2

> Loading state is implemented in T004. This phase verifies and completes it per the contracts/ui-states.md spec.

- [X] T006 [US2] Verify loading state in `app/(dashboard)/properties/page.tsx` — confirm: (a) initial state is `{ status: 'loading' }` so loading renders immediately; (b) `useEffect` guards on `isLoaded` from `useAuth()` — when `isLoaded === false`, the effect exits early, keeping the loading state; (c) LOADING render branch shows 3 skeleton elements (or a spinner) and does NOT render any PropertyCard, empty state message, or error; if any of these are missing, fix them in the file

**Checkpoint**: Throttle network. Navigate to `/properties`. Skeleton/spinner visible. No empty state flash.

---

## Phase 5: User Story 3 — Empty State (Priority: P3)

**Goal**: When the workspace has zero properties, an empty state message and "Add property" affordance are shown. The empty state is visually distinct from the loading state.

**Independent Test**: Sign in as a workspace with zero properties. Navigate to `/properties`. Verify "No properties yet." message. Verify an "Add property" button or link is visible. Verify no loading skeleton is shown.

### Implementation for User Story 3

> Empty state is implemented in T004. This phase verifies it.

- [X] T007 [US3] Verify empty state in `app/(dashboard)/properties/page.tsx` — confirm: (a) `status === 'empty'` branch exists and renders a clear message ("No properties yet." or equivalent); (b) an "Add property" affordance (button or link pointing to `/properties/new`) is present; (c) empty state renders NO skeleton elements — visually distinct from loading; if any of these are missing, fix them in the file

**Checkpoint**: Empty workspace → `/properties` shows the empty state with add affordance, not a blank page.

---

## Phase 6: User Story 4 — Error States (Priority: P4)

**Goal**: 401 → redirect to `/sign-in`. 403 → inline forbidden message (no redirect). 5xx / network error → error message + retry button. Retry clears error and re-fetches from scratch.

**Independent Test**: Stop the API server. Navigate to `/properties`. Verify error message + retry button. Restart API. Click retry. Verify loading state → property list.

### Implementation for User Story 4

> Error states are implemented in T004. This phase verifies all three paths.

- [X] T008 [US4] Verify error handling in `app/(dashboard)/properties/page.tsx` — confirm three error paths: (a) `ApiError` with `status === 401` → `router.push('/sign-in')` — no error state rendered; (b) `ApiError` with `status === 403` → `status: 'error-forbidden'` — inline message rendered, no retry button, no redirect; (c) any other error → `status: 'error-server'` — error message + "Retry" button rendered; retry handler sets state back to `{ status: 'loading' }` and calls `loadProperties` again (re-fetches from scratch, does not use cached error); if any path is missing or incorrect, fix it in the file

**Checkpoint**: Mock/stop API → error + retry visible. Click retry → loading → list. 403 → inline message, no redirect.

---

## Phase 7: User Story 5 — Properties Navigation (Priority: P5)

**Goal**: Clicking "Properties" in the sidebar navigates to `/properties`. The "Properties" entry is visually highlighted when the current route is `/properties` or any sub-path. It is not highlighted on other pages.

**Independent Test**: Navigate to `/dashboard`. Verify "Properties" sidebar entry is NOT highlighted. Click it. Verify navigation to `/properties`. Verify "Properties" entry IS now highlighted.

### Implementation for User Story 5

> `NavLink` is created in T002, wired in T005. This phase verifies active-state behaviour.

- [X] T009 [US5] Verify `NavLink` active state in `components/nav-link.tsx` — confirm: (a) when `pathname === '/properties'`, the link renders with active styles (white text + bg-slate-700); (b) when `pathname.startsWith('/properties/')` (e.g. `/properties/some-id`), same active styles applied; (c) when on `/dashboard` or any non-properties path, inactive styles applied (text-slate-400); if active condition is incorrect, fix the `isActive` logic in `nav-link.tsx`

**Checkpoint**: From `/dashboard`, verify Properties link not highlighted. Navigate to `/properties`, verify Properties link highlighted.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T010 [P] Run `pnpm lint` in `apps/web` and fix any linting errors in new/modified files
- [X] T011 [P] Run `pnpm typecheck` in `apps/web` and confirm no new TypeScript errors
- [X] T012 Run `pnpm build` and confirm the `@leaseKo/web` build succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — T001 and T002 can run in parallel
- **Phase 3 (US1)**: Depends on Phase 2 — T003 needs `Property` type from T001; T004 needs `Property`, `PagedProperties` from T001 and `PropertyCard` from T003; T005 needs `NavLink` from T002
- **Phase 4–7**: Depend on Phase 3 completion (verifying what was built in T004/T005)
- **Phase 8 (Polish)**: Depends on Phases 3–7

### Within Phase 3

```text
T001 and T002 (parallel)
       ↓
T003 (PropertyCard — needs Property type from T001)
T003 and T002 can run in parallel after T001
       ↓
T004 (PropertiesPage — needs T001 types + T003 PropertyCard)
T005 (layout.tsx update — needs T002 NavLink)
T004 and T005 can run in parallel once their dependencies complete
```

### Parallel Opportunities

```text
Phase 2:
  T001 (types.ts) ─┐
  T002 (nav-link.tsx) ─┘ run in parallel

Phase 3 group A (after T001):
  T003 (property-card.tsx) — parallel with T002

Phase 3 group B:
  T004 (page.tsx)     — after T001 + T003
  T005 (layout.tsx)   — after T002; independent of T004

Phase 8:
  T010 (lint) ─┐
  T011 (typecheck) ─┘ run in parallel
```

---

## Implementation Strategy

### MVP First

1. T001: Types
2. T002: NavLink  
3. T003: PropertyCard
4. T004: Full page (all states)
5. T005: Wire layout
6. **VALIDATE**: Navigate to `/properties` in browser — list renders, nav works
7. T006–T009: Verify each state per user story
8. T010–T012: Polish

### Notes

- T004 is the most complex task — it builds the entire `PropertiesPage` with all 5 states. All subsequent verification tasks (T006-T009) check specific aspects of this one component.
- The `useEffect` MUST guard on `isLoaded` from `useAuth()` — if `isLoaded` is false, exit early and keep `status: 'loading'`. Without this guard, `getToken()` returns `null` during Clerk initialization, causing a spurious 401 redirect.
- The retry handler must call `setState({ status: 'loading' })` synchronously before re-invoking `loadProperties` — this clears the error state visually before the fetch begins.
- `'use client'` is required on page.tsx, property-card.tsx, and nav-link.tsx. The layout.tsx remains a Server Component — only the `NavLink` sub-component it imports is a Client Component.
- Address formatting: use `.filter(Boolean)` to remove null/undefined fields — this handles properties missing `addressLine2`, `state`, or `postalCode` without leaving blank commas.
