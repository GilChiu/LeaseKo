# Implementation Plan: Property List Page

**Branch**: `feature/list-properties-ui` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/036-list-properties-ui/spec.md`

## Summary

Add a `/properties` page to the Next.js frontend that fetches and displays the landlord's property list from the existing `GET /properties` API. The page is a Client Component that manages loading, success, empty, and error states locally. A `NavLink` Client Component is extracted from the sidebar layout to provide active-route highlighting. No new API endpoints, no schema changes, no new npm dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: Next.js 14 (App Router), React 18, `@clerk/nextjs` v5, Tailwind CSS
**Storage**: N/A — read-only page; all data from existing `GET /properties` API
**Testing**: Manual verification via quickstart.md scenarios (no automated tests in this story)
**Target Platform**: Web browser (modern); desktop-first layout
**Project Type**: Next.js App Router frontend in pnpm monorepo
**Constraints**: No business logic in frontend; all tenant scoping enforced by backend; no new npm dependencies
**Scale/Scope**: Single page, 4 new files, 1 modified file; ~200 LOC total

## Constitution Check

**Architecture**

- [x] No business logic added to Next.js frontend — page renders API response as-is
- [x] Backend remains the single source of truth for tenant-scoped data
- [x] No cross-module dependencies introduced in frontend

**Multi-Tenancy (CRITICAL)**

- [x] No `tenantId` derived or passed from frontend — enforced entirely by JWT and backend
- [x] Properties list never filtered, sorted, or modified client-side

**Authentication & Authorization**

- [x] Clerk JWT obtained from `useAuth()` — never from localStorage, cookies, or client body
- [x] 401 responses redirect to `/sign-in` — no unauthenticated access to property data
- [x] Clerk middleware (`middleware.ts`) already protects all dashboard routes

**Data Layer**

- [x] No direct database access — all data fetched via `apiFetch` using the existing API
- [x] `apiFetch` already handles `Authorization: Bearer {token}` header injection

**API & Async**

- [x] No new API endpoints — existing `GET /properties` consumed
- [x] No background refetching — single fetch per mount and on explicit retry

**Security**

- [x] No secrets in frontend code
- [x] No user input accepted in this page (read-only list)
- [x] API errors surfaced safely — no raw stack traces or internal messages shown

## Project Structure

### Documentation (this feature)

```text
specs/036-list-properties-ui/
├── plan.md               ← this file
├── research.md           ← Phase 0: key decisions
├── data-model.md         ← Phase 1: types and UI state machine
├── quickstart.md         ← Phase 1: verification scenarios
├── contracts/
│   └── ui-states.md      ← Phase 1: UI state + API integration contract
└── tasks.md              ← Phase 2 (/speckit-tasks output — not yet created)
```

### Source Code Changes

```text
apps/web/src/

  lib/
    types.ts                                    ← NEW: Property, PagedProperties interfaces

  components/
    nav-link.tsx                                ← NEW: Client Component for active sidebar link

  app/(dashboard)/
    layout.tsx                                  ← MODIFY: replace "Properties" <span> with <NavLink>

    properties/
      page.tsx                                  ← NEW: PropertiesPage Client Component (state machine)
      _components/
        property-card.tsx                       ← NEW: PropertyCard sub-component
```

**No changes to**: `lib/api.ts`, `lib/env.ts`, `middleware.ts`, `app/layout.tsx`, any backend files.

**Structure Decision**: `_components/` (underscore prefix) is the Next.js App Router convention for co-located non-route components. `NavLink` goes in shared `components/` because the sidebar layout uses it and the sidebar is shared across all dashboard pages.

## Complexity Tracking

> No violations. All constitution checks pass.

---

## Phase 0: Research

See [research.md](./research.md). Key decisions:

| Decision | Choice | Key Reason |
|---|---|---|
| Data fetching | Client Component + `useAuth()` | Retry button + reactive Clerk token |
| Active nav link | `NavLink` Client Component + `usePathname()` | Idiomatic App Router pattern |
| State shape | Discriminated `status` union | Prevents impossible UI states |
| API types | `lib/types.ts` shared interfaces | Reusable across US 10.2/10.3 |
| Pagination | First page, limit 50, notice if truncated | Spec defers pagination UI |
| New dependencies | None | Existing stack is sufficient |

---

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md)
- [contracts/ui-states.md](./contracts/ui-states.md)
- [quickstart.md](./quickstart.md)

### PropertiesPage State Type

```typescript
type PageState =
  | { status: 'loading' }
  | { status: 'success'; items: Property[]; total: number }
  | { status: 'empty' }
  | { status: 'error-forbidden' }
  | { status: 'error-server' };
```

### fetch logic (pseudocode)

```
async function loadProperties(token: string):
  try:
    data = await apiFetch<PagedProperties>('/properties?page=1&limit=50', { token })
    if data.items.length === 0: setState({ status: 'empty' })
    else: setState({ status: 'success', items: data.items, total: data.total })
  catch ApiError(401): router.push('/sign-in')
  catch ApiError(403): setState({ status: 'error-forbidden' })
  catch any: setState({ status: 'error-server' })
```

### NavLink component

```
'use client'
props: { href: string; children: ReactNode }
active: usePathname() === href OR startsWith(href + '/')
renders: <Link href={href}> with active/inactive Tailwind classes
active classes:  text-white bg-slate-700
inactive classes: text-slate-400 hover:bg-slate-700 hover:text-white
```

### PropertyCard address formatting

```
parts = [addressLine1, addressLine2, city, state, country].filter(Boolean)
display: parts.join(', ')
```

### API call

```
GET /api/v1/properties?page=1&limit=50
Authorization: Bearer {clerk_jwt_token}
```

### Sidebar modification (layout.tsx)

Replace the "Properties" `<span>` with:
```tsx
<NavLink href="/properties">Properties</NavLink>
```
