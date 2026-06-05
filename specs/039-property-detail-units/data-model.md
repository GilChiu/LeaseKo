# Data Model: Property Detail & Unit Management

**Feature**: 039-property-detail-units
**Phase**: 1 — Design

---

## Overview

This feature is frontend-only. No new database tables or Prisma models are introduced. The data model describes the TypeScript types added to the frontend and the API utility functions.

---

## New Frontend Types (`apps/web/src/lib/types.ts`)

### `Unit`

Mirrors `UnitResponseDto` from the backend.

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

### `PagedUnits`

```ts
interface PagedUnits {
  items: Unit[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

---

## API Utility Types (`apps/web/src/lib/units-api.ts`)

### `CreateUnitRequest`

Request body for `POST /api/v1/properties/:propertyId/units`. Optional fields are omitted when blank/zero.

```ts
interface CreateUnitRequest {
  unitNumber: string;
  floorArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  monthlyRent?: number;
  description?: string;
}
```

**Note**: `status` is NOT in this interface — it is always set to `AVAILABLE` by the backend and is explicitly excluded from the `CreateUnitDto`.

### `CreateUnitResult`

Return type of `createUnit()`. Discriminated on `ok`.

```ts
type CreateUnitResult =
  | { ok: true; unit: Unit }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
      generalError: string | null;
      status: number;
    };
```

### `GetPropertyResult`

Return type of `getPropertyById()`.

```ts
type GetPropertyResult =
  | { ok: true; property: Property }
  | { ok: false; status: number; message: string };
```

---

## Component State Types

### `PropertyDetailState` (in `property-detail-view.tsx`)

Page-level loading/error/success state.

```ts
type PropertyDetailState =
  | { status: 'loading' }
  | { status: 'success'; property: Property; units: Unit[]; total: number }
  | { status: 'not-found' }
  | { status: 'error-forbidden' }
  | { status: 'error-server' };
```

### `AddUnitFormValues` (in `add-unit-form.tsx`)

Mutable state for the inline form. All fields are strings (controlled inputs); numeric fields are parsed before submission.

```ts
interface AddUnitFormValues {
  unitNumber: string;
  floorArea: string;
  bedrooms: string;
  bathrooms: string;
  monthlyRent: string;
  description: string;
}

const EMPTY_UNIT_FORM: AddUnitFormValues = {
  unitNumber: '',
  floorArea: '',
  bedrooms: '',
  bathrooms: '',
  monthlyRent: '',
  description: '',
};
```

### `UnitSubmitState` (in `add-unit-form.tsx`)

```ts
type UnitSubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; generalError: string | null };
```

---

## Client-Side Validation Rules (Add-Unit Form)

Only unit number is validated client-side before the request is sent. All numeric rules are backend-enforced.

| Field        | Rule                     | Error message                          |
| ------------ | ------------------------ | -------------------------------------- |
| `unitNumber` | `.trim() !== ''`         | "Unit number is required"              |
| `unitNumber` | `length ≤ 50`            | "Must be 50 characters or fewer"       |
| `description`| `length ≤ 1000` (if set) | "Must be 1000 characters or fewer"     |

---

## Request Body Builder

Before calling `createUnit()`, optional numeric fields are parsed and included only when the string is non-empty and a valid positive number:

```ts
function buildUnitRequest(values: AddUnitFormValues): CreateUnitRequest {
  const body: CreateUnitRequest = { unitNumber: values.unitNumber };

  const fa = parseFloat(values.floorArea);
  if (values.floorArea.trim() && !isNaN(fa)) body.floorArea = fa;

  const bd = parseInt(values.bedrooms, 10);
  if (values.bedrooms.trim() && !isNaN(bd)) body.bedrooms = bd;

  const ba = parseFloat(values.bathrooms);
  if (values.bathrooms.trim() && !isNaN(ba)) body.bathrooms = ba;

  const mr = parseFloat(values.monthlyRent);
  if (values.monthlyRent.trim() && !isNaN(mr)) body.monthlyRent = mr;

  if (values.description.trim()) body.description = values.description;

  return body;
}
```

---

## Display Formatting

| Field          | Display format                             |
| -------------- | ------------------------------------------ |
| `floorArea`    | `{n} m²` or `—` if null                   |
| `bedrooms`     | `{n}` or `—` if null                      |
| `bathrooms`    | `{n}` or `—` if null                      |
| `monthlyRent`  | `{n.toLocaleString()}` or `—` if null      |
| `status`       | Badge: AVAILABLE (green), OCCUPIED (amber), MAINTENANCE (blue), INACTIVE (slate) |
| `addressLine2` | Omitted from display when null             |
| `state`        | Omitted from display when null             |
| `description`  | Omitted from property detail when null     |

---

## State Transitions — Add-Unit Form

```
idle
  └─[click "Add unit"]→ form shown (idle)
      └─[user submits]→ validate
          ├─[has errors]→ idle (with fieldErrors set)
          └─[no errors]→ submitting
                ├─[ok: true]→ form hidden; unit list re-fetched
                └─[ok: false, status=401]→ router.push('/sign-in')
                └─[ok: false, other]→ error (generalError + fieldErrors set)
```
