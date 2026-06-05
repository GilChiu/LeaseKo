# Tasks: Property Detail & Unit Management

**Input**: Design documents from `/specs/039-property-detail-units/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api-contract.md ✓

**Tests**: Not explicitly requested in the feature specification — test tasks are not included.

**Organization**: Tasks are grouped by user story for independent, incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared in-progress dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

No new infrastructure or directories required — the App Router and `(dashboard)` route group already exist.

*(Skipped)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and API utilities that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `Unit` and `PagedUnits` interfaces to `apps/web/src/lib/types.ts` — `Unit` mirrors `UnitResponseDto` (id, tenantId, propertyId, unitNumber, status: `'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'`, floorArea/bedrooms/bathrooms/monthlyRent/description as nullable numbers/string, createdAt, updatedAt); `PagedUnits` wraps `Unit[]` with total, page, limit, hasMore (see data-model.md)
- [x] T002 [P] Create `apps/web/src/lib/units-api.ts` — define `CreateUnitRequest`, `CreateUnitResult` (discriminated union on `ok`) types; implement `getUnits(token, propertyId)` that GETs `/api/v1/properties/:propertyId/units?page=1&limit=50` and returns `PagedUnits`; implement `createUnit(token, propertyId, data)` that POSTs to `/api/v1/properties/:propertyId/units`, parses the `{ success, error }` envelope, maps `VALIDATION_ERROR` details to `fieldErrors`, maps `CONFLICT` to `fieldErrors.unitNumber`, and returns `CreateUnitResult` (see contracts/api-contract.md)
- [x] T003 [P] Add `GetPropertyResult` type + `getPropertyById(token, propertyId)` function to `apps/web/src/lib/properties-api.ts` — GETs `/api/v1/properties/:propertyId`, returns `{ ok: true, property }` on 200 or `{ ok: false, status, message }` on error (see contracts/api-contract.md)

**Checkpoint**: All API utilities callable from any component

---

## Phase 3: User Story 1 — View Property Details and Units (Priority: P1) 🎯 MVP

**Goal**: A landlord clicks a property card and lands on a detail page showing the property's name, full address, type, description, and a list of its units. Loading and empty states are handled. Auth errors (401, 403) are surfaced correctly.

**Independent Test**: Click any property card on `/properties`. Verify the URL becomes `/properties/:id`, the property name and full address are visible, and either a unit list or an empty-state message appears.

- [x] T004 [P] [US1] Create `apps/web/src/app/(dashboard)/properties/[id]/page.tsx` — thin server component; receives `params: { id: string }` from Next.js App Router and renders `<PropertyDetailView propertyId={params.id} />`
- [x] T005 [P] [US1] Create `apps/web/src/app/(dashboard)/properties/[id]/_components/property-detail-view.tsx` — `"use client"` component with `PropertyDetailState` discriminated union (`loading | success | error-forbidden | error-server`); on mount calls `getPropertyById()` and `getUnits()` in parallel using `Promise.all`; on success renders property name, full address (addressLine1, addressLine2, city, state, postalCode, country), propertyType, and description (omit null fields); renders unit list — each unit card shows unitNumber, status badge, floorArea (`{n} m²` or `—`), bedrooms, bathrooms, monthlyRent (`{n.toLocaleString()}` or `—`); shows skeleton loading state during fetch; shows empty-state message and "Add unit" affordance when `units.length === 0`; on 401 calls `router.push('/sign-in')`; on 403 shows inline forbidden banner (no redirect); uses `useAuth()` for `getToken()`

**Checkpoint**: US1 complete — property details and unit list render end-to-end

---

## Phase 4: User Story 2 — Add a Unit (Priority: P2)

**Goal**: Clicking "Add unit" shows an inline form. A valid submission creates the unit, refreshes the list, and dismisses the form. Cancel dismisses without creating.

**Independent Test**: On the property detail page click "Add unit". Enter a unique unit number, click Save. Verify the unit appears in the list. Click "Add unit" again, enter another number, click Cancel — verify the form closes and no new unit was added.

- [x] T006 [US2] Create `apps/web/src/app/(dashboard)/properties/[id]/_components/add-unit-form.tsx` — `"use client"` component; `AddUnitFormValues` state (all strings, initialised to `''`); `buildUnitRequest()` helper that parses numeric strings with `parseFloat`/`parseInt` and omits blank fields; submit handler calls `getToken()`, sets `isSubmitting`, calls `createUnit()`, calls `onSuccess()` on `result.ok === true`; submit button shows "Saving…" and is disabled while submitting; Cancel button calls `onCancel()`; props: `propertyId: string`, `onSuccess: () => void`, `onCancel: () => void`
- [x] T007 [US2] Add `showAddForm` boolean state and `loadUnits` extracted fetch function to `apps/web/src/app/(dashboard)/properties/[id]/_components/property-detail-view.tsx`; render "Add unit" button that sets `showAddForm(true)`; render `<AddUnitForm>` when `showAddForm === true` with `onSuccess={() => { setShowAddForm(false); void loadUnits(); }}` and `onCancel={() => setShowAddForm(false)}`

**Checkpoint**: US2 complete — unit can be created inline; list refreshes; Cancel works

---

## Phase 5: User Story 3 — Unit Form Validation and Error Handling (Priority: P3)

**Goal**: Unit number is validated client-side (required + max 50). All errors appear simultaneously. Server errors (field-level and general, including 409 duplicate) are displayed correctly. Form stays open on failure.

**Independent Test**: Submit the form with blank unit number — verify inline required-field error. Enter a duplicate unit number and submit — verify the server conflict error appears under the unit number field (not as a generic banner). Stop the API, submit — verify error banner and form stays open.

- [x] T008 [US3] Add `validateForm()` and `fieldErrors` state (`Partial<Record<keyof AddUnitFormValues, string>>`) to `apps/web/src/app/(dashboard)/properties/[id]/_components/add-unit-form.tsx` — validate `unitNumber` (required, max 50) and `description` (max 1000 if non-empty) in one pass; set all errors simultaneously; abort submit if any errors exist; clear a field's error on `onChange`; pass `error={fieldErrors.fieldName}` to each `Input` component
- [x] T009 [US3] Add `UnitSubmitState` discriminated union (`idle | submitting | { status: 'error'; generalError: string | null }`) to `apps/web/src/app/(dashboard)/properties/[id]/_components/add-unit-form.tsx`; on `result.ok === false` — map `result.fieldErrors` to field error state (first message per field), set `generalError` from `result.generalError`, handle `result.status === 401` (redirect to `/sign-in`), handle `result.status === 403` (set `generalError` banner, no redirect); add red error banner above the form when `generalError` is set; ensure form inputs retain their values on failure

**Checkpoint**: US3 complete — all validation and error surfacing works end-to-end

---

## Phase 6: User Story 4 — Property Detail Load Error States (Priority: P4)

**Goal**: A 404 (property not found/wrong tenant) shows a not-found message with no retry. A 5xx or network error shows an error message with a Retry button. Session expiry redirects to sign-in (already handled in US1); workspace error shows inline (already handled in US1).

**Independent Test**: Stop the API, navigate to `/properties/:id` — verify an error message with a Retry button appears. Restart the API, click Retry — verify the page loads. Navigate to a non-existent property ID — verify a not-found message (no Retry button).

- [x] T010 [US4] Extend `PropertyDetailState` in `apps/web/src/app/(dashboard)/properties/[id]/_components/property-detail-view.tsx` to include a `not-found` branch; handle 404 response from `getPropertyById()` by setting `{ status: 'not-found' }` and rendering a not-found message with a "Back to properties" link; handle 5xx and network errors by setting `{ status: 'error-server' }` and rendering an error message with a Retry button that re-invokes the fetch

**Checkpoint**: US4 complete — all page-level load error states handled

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T011 [P] Add a "← Back to properties" link (using `router.push('/properties')` or a `<Link href="/properties">`) to the page header in `apps/web/src/app/(dashboard)/properties/[id]/_components/property-detail-view.tsx`
- [x] T012 Run `pnpm lint && pnpm typecheck` from repo root and fix any errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately; T002 and T003 can run in parallel after T001 (Unit type needed for units-api.ts)
- **US1 (Phase 3)**: Depends on all Phase 2 tasks; T004 and T005 can run in parallel
- **US2 (Phase 4)**: Depends on US1 completion (T005 must exist for T007 to modify it)
- **US3 (Phase 5)**: Depends on US2 completion (T006 must exist for T008/T009 to modify it)
- **US4 (Phase 6)**: Depends on US1 completion (T005 must exist for T010 to modify it); can run in parallel with US2 and US3 if desired
- **Polish**: Depends on all story phases

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational — no other story dependencies
- **US2 (P2)**: Depends on US1 (T007 modifies property-detail-view.tsx)
- **US3 (P3)**: Depends on US2 (T008/T009 modify add-unit-form.tsx)
- **US4 (P4)**: Depends on US1 (T010 modifies property-detail-view.tsx); independent of US2/US3

### Within Each Story

- T001 → T002 ‖ T003 (types must exist before API utilities)
- T004 ‖ T005 (different files, both US1)
- T006 → T007 (form must exist before being wired into detail view)
- T008 → T009 (same file, sequential)
- T010 (single task)
- T011 ‖ T012 (independent)

---

## Parallel Example: User Story 1

```
# After Phase 2 completes, launch T004 and T005 together:
Task: "Create apps/web/src/app/(dashboard)/properties/[id]/page.tsx"
Task: "Create apps/web/src/app/(dashboard)/properties/[id]/_components/property-detail-view.tsx"

# T011 (Polish) can run in parallel with any story phase — different component section:
Task: "Add Back to properties link to property-detail-view.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001–T003)
2. Complete Phase 3: US1 (T004–T005) — property details + unit list renders
3. **STOP and VALIDATE**: Navigate via a property card → verify detail page loads with property info and unit list
4. Proceed to US2 only after US1 is confirmed working

### Incremental Delivery

1. T001–T003 → API utilities ready
2. T004–T005 → US1: read-only property detail page ✓ demo-able
3. T006–T007 → US2: inline add-unit form works (no validation) ✓ demo-able
4. T008–T009 → US3: validation + server errors ✓ demo-able
5. T010 → US4: not-found + retry error states ✓ demo-able
6. T011–T012 → Polish ✓ ready to ship

---

## Notes

- `[P]` tasks operate on different files with no shared in-progress dependencies
- `PropertyCard` already navigates to `/properties/:id` — no changes needed
- `status` is never in the add-unit form body; backend always sets `AVAILABLE`
- `propertyId` comes from the URL path (`params.id`) — never from the request body
- Numeric fields (floorArea, bedrooms, bathrooms, monthlyRent) are string-typed in form state and parsed before submission; backend enforces positive/integer constraints
