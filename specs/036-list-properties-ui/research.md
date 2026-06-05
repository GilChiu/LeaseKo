# Research: Property List Page

**Feature**: `specs/036-list-properties-ui/spec.md`
**Date**: 2026-06-05

---

## Decision Log

### 1. Data Fetching Strategy — Client Component vs Server Component

**Decision**: Client Component using `useAuth()` from `@clerk/nextjs` with local `useState`/`useEffect`.

**Rationale**:
- The spec requires an interactive **retry button** on error — this demands client-side state mutations that Server Components cannot provide.
- The spec requires a **visible loading state** while the token initialises (Clerk is not immediately ready on first render) — `useAuth()` exposes `isLoaded` for this exact purpose.
- The spec requires **401 redirect at runtime** (e.g., expired token mid-session) — `useRouter().push('/sign-in')` handles this inside a Client Component without a full page reload.
- The existing `apiFetch` utility in `lib/api.ts` is already designed to accept a `token` parameter and is client-friendly.

**Alternatives Considered**:
- React Server Component + `auth()` from `@clerk/nextjs/server`: rejected — cannot provide the retry button or reactive loading state without an additional Client Component wrapper; mixing is possible but adds complexity without benefit here.
- Server Component + `loading.tsx` / `error.tsx` App Router conventions: rejected — `error.tsx` retry re-runs the entire Server Component tree (full page reload semantics), not the lightweight in-place retry the spec requires.

---

### 2. Active Sidebar Link — Pattern for Route Detection

**Decision**: Extract a `NavLink` Client Component that uses `usePathname()` from `next/navigation` to detect the active route and apply highlight styles.

**Rationale**:
- The dashboard layout (`(dashboard)/layout.tsx`) is a Server Component and cannot call `usePathname()` directly.
- Wrapping each nav item in a small Client Component (`NavLink`) is the idiomatic Next.js App Router pattern for active link detection.
- This keeps the layout as a Server Component while limiting client JS to the nav items only.

**Alternatives Considered**:
- Make the entire layout a Client Component: rejected — unnecessarily widens the client boundary; the layout has no other interactive state.
- CSS `:global(.active)` tricks: rejected — fragile and non-standard.

---

### 3. Local State Shape for the Properties Page

**Decision**: Single component-level state object with a discriminated `status` field: `'loading' | 'success' | 'empty' | 'error-forbidden' | 'error-server'`.

**Rationale**:
- Each status maps directly to one visible UI state (loading indicator, property list, empty state, forbidden message, server error + retry).
- Discriminated unions prevent impossible states (e.g., `data` present while `status === 'loading'`).
- No global store, no React Query — the list is fetched once per page mount and on explicit retry; no background refetching.

---

### 4. TypeScript Types for the API Response

**Decision**: Define a `Property` interface and `PagedProperties` response type in `apps/web/src/lib/types.ts`.

**Rationale**:
- The API response shape is known and stable — it matches the `PropertyResponseDto` from the backend.
- A shared `types.ts` file avoids inline type definitions scattered across future pages (US 10.2, 10.3 will need the same `Property` type).
- No code generation or schema sync tooling is needed at this stage.

**Property interface fields** (matching API response):
```
id, tenantId, name, addressLine1, addressLine2?, city, state?, postalCode?, country,
propertyType, description?, createdAt, updatedAt, deletedAt?
```

---

### 5. Pagination Strategy

**Decision**: Fetch the first page with `limit=50`. If `total > 50`, display a notice ("Showing 50 of N properties"). No pagination controls in this story.

**Rationale**:
- The spec explicitly defers pagination UI; full pagination controls are US 10.x scope.
- Limit 50 balances completeness (covers most real-world portfolios) against payload size.
- The notice prevents the landlord from thinking they have seen all properties when they have not.

---

### 6. No New npm Dependencies

**Decision**: Use only existing dependencies — `@clerk/nextjs`, `next`, `react`, Tailwind CSS.

**Rationale**:
- No data-fetching library (React Query, SWR) needed — single fetch per page mount.
- No UI component library needed — existing `Card` component and Tailwind CSS are sufficient.
- No icon library needed — text-based loading indicator (or simple Tailwind CSS animation) is sufficient.

---

## Summary Table

| Decision | Choice | Key Reason |
|---|---|---|
| Data fetching | Client Component + `useAuth()` | Retry button + reactive Clerk token loading |
| Active nav link | `NavLink` Client Component + `usePathname()` | Idiomatic App Router pattern |
| State shape | Discriminated `status` union | Prevents impossible states |
| API types | `lib/types.ts` shared interfaces | Reusable across US 10.2/10.3 |
| Pagination | First page, limit 50, show notice if truncated | Spec defers full pagination |
| New dependencies | None | Existing stack is sufficient |
