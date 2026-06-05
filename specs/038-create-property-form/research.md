# Research: Create Property Form

**Feature**: 038-create-property-form  
**Phase**: 0 — Research & Unknown Resolution

---

## 1. API Error Response Format

**Decision**: Parse the structured `{ success: false, error: { code, message, details } }` envelope directly in a dedicated `createProperty()` function.

**Rationale**: The `GlobalExceptionFilter` normalises all API errors into a consistent envelope. Validation errors (HTTP 400) include a `details.fields` array with per-field messages. This structure makes it straightforward to map server errors to inline field messages without string-parsing.

**Full error shape** (from `apps/api/src/common/types/api-error-response.interface.ts` + `GlobalExceptionFilter`):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-06-05T00:00:00.000Z",
    "path": "/api/v1/properties",
    "details": {
      "fields": [
        { "field": "name", "messages": ["must be shorter than or equal to 120 characters"] },
        { "field": "addressLine1", "messages": ["should not be empty"] }
      ]
    }
  }
}
```

**Non-validation error shape** (401 / 403 / 5xx):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Tenant context required",
    "statusCode": 403,
    "timestamp": "...",
    "path": "..."
  }
}
```

**Alternatives considered**: Modifying `apiFetch` globally to parse this envelope — rejected because the existing list/detail pages only need status codes, not field-level detail. Adding complexity to the shared utility violates the "don't add abstractions beyond what the task requires" rule.

---

## 2. Does `apiFetch` Need Modification?

**Decision**: No. Create a dedicated `createProperty()` in `apps/web/src/lib/properties-api.ts` that reads the raw `Response` and returns a typed discriminated union.

**Rationale**: The current `apiFetch` reads `body.message` (top-level), but the actual error envelope nests the error under `body.error.message`. For field-level errors the form needs `body.error.details.fields`. A separate function keeps the change scoped to this feature and leaves `apiFetch` stable for existing callers.

**Result type**:
```ts
type CreatePropertyResult =
  | { ok: true; property: Property }
  | { ok: false; fieldErrors: Record<string, string[]>; generalError: string | null; status: number };
```

---

## 3. Form State Management Approach

**Decision**: `useState` with a `SubmitState` discriminated union; no form library.

**Rationale**: react-hook-form and zod are not installed. Installing them for a single form introduces unbudgeted dependencies. The existing properties page uses the same `useState` + discriminated union pattern (`PageState`) and is idiomatic in this codebase.

**Client-side validation strategy**: Validate all fields on submit before sending the request. Collect all errors into a `Record<string, string>` map and set them at once — this satisfies SC-002 (all errors appear simultaneously). Clear a field's error as the user edits it (on `onChange`) for responsiveness.

**Alternatives considered**: Single `errors` string state — rejected because field-level inline errors require a keyed map. react-hook-form — rejected because it is not installed.

---

## 4. Tenant Context Error vs. Auth Error (403 vs. 401)

**Decision**: 401 → redirect to `/sign-in`. 403 → show inline workspace error on the form (no redirect).

**Rationale**: The spec is explicit (User Story 3, scenarios 5–6; FR-014 and FR-015). The backend guard `@RequiresTenant()` returns 403 with `code: "FORBIDDEN"` and `message: "Tenant context required"` when no active organisation is selected. This is the workspace-context error. 401 means the Clerk session has expired.

**Implementation**: After calling `createProperty()`, check `result.status`:
- `401` → `router.push('/sign-in')`
- `403` → set `generalError` to the message (inline workspace error, no redirect)
- other non-ok → set `generalError` to the message (server error banner)

---

## 5. Post-Success Navigation and List Refresh

**Decision**: On success, call `router.push('/properties')`. The properties list page fetches fresh data on every mount via `useEffect`.

**Rationale**: The properties list page (`apps/web/src/app/(dashboard)/properties/page.tsx`) fetches data inside `useEffect([isLoaded, loadProperties])`. Navigating to `/properties` mounts the page fresh, which triggers a new fetch — the newly created property will appear. No manual cache invalidation is needed.

**Alternatives considered**: Passing state via URL params to signal "just created" — rejected as unnecessary complexity for the current implementation.

---

## 6. Optional Field Handling (FR-006)

**Decision**: Before submitting, strip optional fields that are empty strings from the request body.

**Rationale**: The spec explicitly requires "Optional fields left blank MUST be omitted from the submission — they MUST NOT be sent as empty strings." The backend's `class-validator` treats a sent empty string differently from an absent field.

**Implementation**: Build the request body from form values, adding optional fields only when `value.trim() !== ''`.

---

## 7. "Add Property" Button on Non-Empty Properties List

**Decision**: Add an "Add property" button to the header row of the success state in `properties/page.tsx`.

**Rationale**: FR-001 says the route must be "reachable from the properties list empty state," but a landlord who already has properties also needs to reach the create form. Omitting the button from the non-empty state would force landlords to delete all properties to access the form. This is an implied accessibility requirement.

**Alternatives considered**: Keeping only the empty-state button per the literal spec wording — rejected as obviously broken UX.
