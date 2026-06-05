# Tasks: Create Property Form

**Input**: Design documents from `/specs/038-create-property-form/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api-contract.md ✓

**Tests**: Not explicitly requested in the feature specification — test tasks are not included.

**Organization**: Tasks are grouped by user story for independent, incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

No new infrastructure or directories required — the monorepo and `(dashboard)` route group already exist.

*(Skipped)*

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: API utility function that every user story depends on to call the backend.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Create `apps/web/src/lib/properties-api.ts` — define `CreatePropertyRequest` and `CreatePropertyResult` types (discriminated union on `ok`) and implement `createProperty(token, data)` that POSTs to `/api/v1/properties`, parses the `{ success, error }` envelope on failure, maps `error.details.fields` to `fieldErrors`, any server field not present in the form is promoted to `generalError`, returns `{ ok: true, property }` on 201 (see contracts/api-contract.md for full request/response shapes)

**Checkpoint**: `createProperty()` is callable from any component

---

## Phase 3: User Story 1 — Successfully Create a Property (Priority: P1) 🎯 MVP

**Goal**: A landlord fills in the required fields and submits the form. On success they are redirected to `/properties` where the new property appears.

**Independent Test**: Fill in all five required fields (name, addressLine1, city, country, propertyType) with valid values. Submit. Verify redirect to `/properties` and the new property appears in the list.

- [x] T002 [P] [US1] Create `apps/web/src/app/(dashboard)/properties/new/page.tsx` — server component (no `"use client"`) that renders a page heading ("Add Property") and imports/renders `<CreatePropertyForm />`
- [x] T003 [P] [US1] Create `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — `"use client"` component with `CreatePropertyFormValues` state initialised to empty strings for all nine fields, one `Input` per field with correct `label` and `required` props per data-model.md, a submit `Button` (type="submit"), and `useAuth()` + `useRouter()` hooks wired up
- [x] T004 [US1] Wire `createProperty()` into the form's submit handler in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — get token via `getToken()`, build `CreatePropertyRequest` body (optional fields omitted when blank), call `createProperty(token, body)`, call `router.push('/properties')` when `result.ok === true`

**Checkpoint**: US1 complete — a landlord can create a property end-to-end

---

## Phase 4: User Story 2 — Pre-Submission Validation (Priority: P2)

**Goal**: Required fields and max-length limits are validated before any request is sent. All errors for a single submit attempt appear simultaneously.

**Independent Test**: Click submit with all fields blank. Verify all five required-field error messages appear at once without any API call being made. Correct all errors and resubmit — verify the form proceeds.

- [x] T005 [US2] Add `validateForm(values: CreatePropertyFormValues): FormFieldErrors` function and `fieldErrors` state (`Partial<Record<keyof CreatePropertyFormValues, string>>`) to `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — validate all nine fields in one pass per the rules table in data-model.md (required + max-length), abort submit and `setFieldErrors(errors)` when any errors exist
- [x] T006 [US2] Wire per-field error display in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — pass `error={fieldErrors.fieldName ?? undefined}` to each `Input` component and clear that field's error entry (`setFieldErrors(prev => { ...prev, fieldName: undefined })`) on `onChange`
- [x] T007 [US2] Move optional-field omission into a `buildRequestBody(values)` helper in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — include optional fields (addressLine2, state, postalCode, description) only when `value.trim() !== ''`; replace the inline body construction in T004's submit handler with a call to this helper

**Checkpoint**: US2 complete — all five required-field errors appear simultaneously; optional blank fields are omitted

---

## Phase 5: User Story 3 — Server Error Handling (Priority: P3)

**Goal**: Field-level server errors appear under the relevant input. General errors and unknown-field errors appear as a banner. Form stays open on failure with inputs intact. Session expiry redirects; workspace error shows inline.

**Independent Test**: Stop the API. Submit the form. Verify an error banner appears with the landlord's inputs intact and the submit button re-enabled. Restart the API, resubmit — verify the form proceeds.

- [x] T008 [US3] Replace the loading boolean with a `SubmitState` discriminated union (`'idle' | 'submitting' | { status: 'error'; fieldErrors: FormFieldErrors; generalError: string | null }`) in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — update the submit handler to set `{ status: 'submitting' }` before the API call and reset to `'idle'` on success
- [x] T009 [US3] Handle `result.ok === false` in the submit handler in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — if `result.status === 401` call `router.push('/sign-in')` and return; if `result.status === 403` set `generalError` to `result.generalError` (workspace error, no redirect); otherwise merge `result.fieldErrors` into `FormFieldErrors` state and set `submitState` to the `error` branch with `generalError`
- [x] T010 [US3] Add general error banner UI in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — render above the form when `submitState.status === 'error' && submitState.generalError !== null`, styled with amber/red border consistent with the existing forbidden-state styling in `properties/page.tsx`

**Checkpoint**: US3 complete — field-level and general server errors are surfaced; session and workspace errors handled correctly

---

## Phase 6: User Story 4 — Submission State and Navigation (Priority: P4)

**Goal**: Submit button is disabled with a loading indicator while in-flight (preventing double-submission). Cancel button always returns to `/properties` without creating a property.

**Independent Test**: Submit a valid form. Before the response arrives, verify the submit button is disabled and shows a loading indicator, and only one network request was sent. Click Cancel on a fresh form — verify redirect to `/properties` and no property is created.

- [x] T011 [US4] Add loading state to the submit button in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — set `disabled` and change label to "Saving…" when `submitState.status === 'submitting'`; double-submit prevention is automatic because a disabled button blocks subsequent clicks
- [x] T012 [US4] Add a Cancel button in `apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx` — always visible, variant="secondary", calls `router.push('/properties')` on click, placed alongside the submit button in the form footer

**Checkpoint**: US4 complete — loading indicator and Cancel button work; no duplicate submissions possible

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T013 [P] Add "Add property" button to the success-state header row in `apps/web/src/app/(dashboard)/properties/page.tsx` — place it next to the `<h1>Properties</h1>` heading, navigate to `/properties/new` on click, styled consistently with the existing empty-state button (dark slate, `text-sm`, `rounded-md`)
- [x] T014 Run `pnpm lint && pnpm typecheck` from the repo root and fix any errors before marking implementation complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **User Stories (Phase 3–6)**: All depend on Phase 2 (T001) being complete
  - US1 → US2 → US3 → US4 (sequential: each phase modifies the same component)
- **Polish (Phase N)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on T001 (Foundational). T002 and T003 can run in parallel; T004 depends on T003.
- **US2 (P2)**: Depends on US1 completion (T004). T005, T006, T007 are sequential (same file).
- **US3 (P3)**: Depends on US2 completion (T007). T008, T009, T010 are sequential (same file).
- **US4 (P4)**: Depends on US3 completion (T010). T011 and T012 are independent (same file, different elements).
- **Polish**: T013 is independent of all story phases (different file).

### Within Each User Story

- US1: T002 ‖ T003, then T004
- US2: T005 → T006 → T007
- US3: T008 → T009 → T010
- US4: T011 ‖ T012

---

## Parallel Example: User Story 1

```
# T002 and T003 can be launched together after T001 completes:
Task: "Create apps/web/src/app/(dashboard)/properties/new/page.tsx"
Task: "Create apps/web/src/app/(dashboard)/properties/_components/create-property-form.tsx"

# T013 (Polish) can run any time after T001 since it's in a different file:
Task: "Add 'Add property' button to apps/web/src/app/(dashboard)/properties/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001) — creates `properties-api.ts`
2. Complete Phase 3: US1 (T002–T004) — creates `new/page.tsx` and `create-property-form.tsx` with working submit
3. **STOP and VALIDATE**: Open `/properties/new`, fill required fields, submit — verify redirect and property appears
4. Proceed to US2 only after US1 is confirmed working

### Incremental Delivery

1. T001 → foundation ready
2. T002–T004 → US1 (happy path, form works) ✓ demo-able
3. T005–T007 → US2 (validation UX) ✓ demo-able
4. T008–T010 → US3 (server error resilience) ✓ demo-able
5. T011–T012 → US4 (submission state + Cancel) ✓ demo-able
6. T013–T014 → Polish ✓ ready to ship

---

## Notes

- `[P]` tasks operate on different files with no shared in-progress dependencies
- `[Story]` label maps each task to its user story for traceability
- `tenantId` must NEVER appear in the form body — it is extracted by the backend from the Clerk JWT
- The form component is the only `"use client"` file; `new/page.tsx` can remain a server component
- All authoritative validation is enforced by the backend — client-side validation is UX only
