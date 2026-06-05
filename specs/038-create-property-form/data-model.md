# Data Model: Create Property Form

**Feature**: 038-create-property-form  
**Phase**: 1 — Design

---

## Overview

This feature is frontend-only. No new database tables or Prisma models are introduced. The data model describes the TypeScript types used in the form component and the API utility function.

---

## Backend Validation Constraints (source of truth)

From `apps/api/src/modules/properties/presentation/dto/create-property.dto.ts`:

| Field          | Required | Max Length | Notes                          |
| -------------- | -------- | ---------- | ------------------------------ |
| `name`         | Yes      | 120        |                                |
| `addressLine1` | Yes      | 255        |                                |
| `addressLine2` | No       | 255        | Omit if blank                  |
| `city`         | Yes      | 120        |                                |
| `state`        | No       | 120        | Omit if blank                  |
| `postalCode`   | No       | 30         | Omit if blank                  |
| `country`      | Yes      | 120        |                                |
| `propertyType` | Yes      | 80         | Free-form text (no enum yet)   |
| `description`  | No       | 1000       | Omit if blank                  |

---

## Frontend Types

### `CreatePropertyFormValues`

Mutable state held in the form component. All fields are strings (controlled inputs).

```ts
interface CreatePropertyFormValues {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  propertyType: string;
  description: string;
}

const EMPTY_FORM: CreatePropertyFormValues = {
  name: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  propertyType: '',
  description: '',
};
```

### `CreatePropertyRequest`

The body sent to `POST /api/v1/properties`. Optional fields are omitted when blank.

```ts
interface CreatePropertyRequest {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  propertyType: string;
  description?: string;
}
```

**Builder rule**: For each optional field, include it only when `value.trim() !== ''`.

### `CreatePropertyResult`

Return type of `createProperty()` in `properties-api.ts`. Discriminated on `ok`.

```ts
type CreatePropertyResult =
  | { ok: true; property: Property }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
      generalError: string | null;
      status: number;
    };
```

**Field error mapping**: When the server returns `details.fields`, each `{ field, messages }` entry maps directly to `fieldErrors[field] = messages`. The special field name `"_"` (used by `GlobalExceptionFilter` for unparseable messages) maps to `generalError`.

**General error mapping**: For non-validation errors (401, 403, 5xx) or when `details` is absent, the `error.message` string goes into `generalError`; `fieldErrors` is `{}`.

### `FormFieldErrors`

The `Record<string, string>` type used by the form component to track one displayed error per field (first message wins).

```ts
type FormFieldErrors = Partial<Record<keyof CreatePropertyFormValues, string>>;
```

### `SubmitState`

Discriminated union representing the form's submission lifecycle.

```ts
type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | {
      status: 'error';
      fieldErrors: FormFieldErrors;
      generalError: string | null;
    };
```

---

## Client-Side Validation Rules

Executed on submit before any network request. All rules run in one pass — errors collected into `FormFieldErrors` and set simultaneously.

| Field          | Rule                                      | Error message                              |
| -------------- | ----------------------------------------- | ------------------------------------------ |
| `name`         | `.trim() !== ''`                          | "Name is required"                         |
| `name`         | `length ≤ 120`                            | "Name must be 120 characters or fewer"     |
| `addressLine1` | `.trim() !== ''`                          | "Address line 1 is required"               |
| `addressLine1` | `length ≤ 255`                            | "Must be 255 characters or fewer"          |
| `addressLine2` | `length ≤ 255` (only when non-empty)      | "Must be 255 characters or fewer"          |
| `city`         | `.trim() !== ''`                          | "City is required"                         |
| `city`         | `length ≤ 120`                            | "Must be 120 characters or fewer"          |
| `state`        | `length ≤ 120` (only when non-empty)      | "Must be 120 characters or fewer"          |
| `postalCode`   | `length ≤ 30` (only when non-empty)       | "Must be 30 characters or fewer"           |
| `country`      | `.trim() !== ''`                          | "Country is required"                      |
| `country`      | `length ≤ 120`                            | "Must be 120 characters or fewer"          |
| `propertyType` | `.trim() !== ''`                          | "Property type is required"                |
| `propertyType` | `length ≤ 80`                             | "Must be 80 characters or fewer"           |
| `description`  | `length ≤ 1000` (only when non-empty)     | "Must be 1000 characters or fewer"         |

Validation returns `FormFieldErrors`. If the result is non-empty, the submit is aborted — no network request is made.

---

## State Transitions

```
idle
  └─[user submits]→ validate
      ├─[has errors]→ idle  (with fieldErrors set)
      └─[no errors]→ submitting
            ├─[ok: true]→ router.push('/properties')
            └─[ok: false]→ idle  (with fieldErrors + generalError set)
```

Note: During `submitting`, all form fields remain visible and the submit button is disabled with a loading indicator.
