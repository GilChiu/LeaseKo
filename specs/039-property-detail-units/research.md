# Research: Property Detail & Unit Management

**Feature**: 039-property-detail-units
**Phase**: 0 — Research & Unknown Resolution

---

## 1. Does PropertyCard Already Navigate to `/properties/:id`?

**Decision**: Yes — no change needed to `property-card.tsx`.

**Finding**: `property-card.tsx` is already a `"use client"` component with `onClick={() => router.push(`/properties/${property.id}`)}`. The card navigates on click. The only new work is the page that receives it.

---

## 2. Page Architecture — Server vs. Client Component

**Decision**: `[id]/page.tsx` is a thin server component; all state and auth logic is in `property-detail-view.tsx` (`"use client"`).

**Rationale**: Same pattern as `new/page.tsx` → `create-property-form.tsx`. Keeps the route file minimal and Next.js-idiomatic. `property-detail-view.tsx` handles `useAuth()`, data fetching via `useEffect`, and form state. It receives `propertyId` as a prop from the page.

**Alternatives considered**: Making `[id]/page.tsx` itself a client component — rejected as inconsistent with established project pattern.

---

## 3. How to Pass `propertyId` from Page to Client Component

**Decision**: The page receives `params: { id: string }` as a prop (Next.js App Router convention) and passes `propertyId={params.id}` to `PropertyDetailView`.

**Rationale**: Standard Next.js App Router pattern for dynamic route segments. No `useParams()` hook needed in the server component.

---

## 4. API Utility Architecture — Extend `properties-api.ts` or Create `units-api.ts`?

**Decision**: Create a new `apps/web/src/lib/units-api.ts` for unit-related API functions. Add `getPropertyById` to `properties-api.ts`.

**Rationale**: `properties-api.ts` already owns property creation. `getPropertyById` belongs there (same domain). Unit listing and creation belong in a dedicated `units-api.ts` — consistent with the single-responsibility pattern and keeping the property file from growing unbounded.

**Functions to add**:
- `properties-api.ts`: `getPropertyById(token, propertyId)` → `Property | null` (with 404 handling)
- `units-api.ts`: `getUnits(token, propertyId)` → `PagedUnits`; `createUnit(token, propertyId, data)` → `CreateUnitResult`

---

## 5. `Unit` Type — Where Does It Live?

**Decision**: Add `Unit` and `PagedUnits` to `apps/web/src/lib/types.ts` alongside the existing `Property` and `PagedProperties`.

**Rationale**: `types.ts` is the single file for all frontend-facing API response shapes. Adding `Unit` here is consistent and keeps imports clean.

**Unit type** (mirrors `UnitResponseDto`):
```ts
interface Unit {
  id: string;
  tenantId: string;
  propertyId: string;
  unitNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  floorArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthlyRent: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. Add-Unit Form — Inline Toggle vs. Always-Visible vs. Separate Route

**Decision**: Inline toggle — the form is hidden until the landlord clicks "Add unit", then appears below the unit list. On success or Cancel it collapses.

**Rationale**: Consistent with spec assumption ("inline form"). No modal library is installed. A separate route (`/properties/:id/units/new`) adds navigation overhead and would require the landlord to navigate back after each unit. Inline toggle gives instant access and keeps context visible.

**Implementation**: A boolean `showAddForm` state in `property-detail-view.tsx`. When `true`, `<AddUnitForm>` is rendered below the unit list; when `false` (or on success/cancel), it is unmounted.

---

## 7. Unit List Refresh After Successful Creation

**Decision**: Re-fetch the unit list after a successful `createUnit` call rather than appending the new unit to existing state.

**Rationale**: The same pattern used by the properties list page (`loadProperties()` called inside the success handler). Re-fetching ensures the list is always authoritative — no risk of stale ordering or off-by-one total counts. The unit list is not paginated in this version so the fetch is inexpensive.

**Alternatives considered**: Optimistic UI (append unit to list locally) — rejected because it could diverge from server state and adds complexity not justified by the UX gain.

---

## 8. `getPropertyById` Error Handling

**Decision**: Return a typed result that distinguishes 404 (not found/wrong tenant) from 401/403/5xx.

**Rationale**: The property detail page needs to render different UI for each case: not-found message, redirect to sign-in, or workspace error banner. Using a discriminated union result (similar to `CreatePropertyResult`) keeps the component logic clean.

**Result type**:
```ts
type GetPropertyResult =
  | { ok: true; property: Property }
  | { ok: false; status: number; message: string };
```

---

## 9. Numeric Field Display Formatting

**Decision**: Show numeric values with sensible defaults: floor area as `{n} m²`, monthly rent with locale-based number formatting (no currency symbol — currency is out of scope), bedrooms/bathrooms as plain integers/decimals.

**Rationale**: The spec mentions floor area as `m²`. Monthly rent currency is not specified; use locale number formatting without a symbol to avoid incorrect currency assumptions.

**Alternatives considered**: Always showing a currency symbol — rejected because currency is not stored in the data model.

---

## 10. Client-Side Validation Scope for Add-Unit Form

**Decision**: Validate only unit number (required, max 50 chars) client-side. All numeric validations (positive-only, integer-only for bedrooms) are enforced by the backend and surfaced as server errors.

**Rationale**: Spec FR-008 explicitly limits client-side validation to unit number required + max-length. Attempting to replicate backend numeric rules client-side risks diverging from backend constraints and adds maintenance burden. The structured error envelope makes server-error display straightforward.
