# API Contract: Property Detail & Unit Management

**Feature**: 039-property-detail-units
**Phase**: 1 — Design

All three endpoints are already implemented on the backend. This document describes the exact request/response shapes the frontend must use, the error handling strategy for each endpoint, and the API utility function signatures.

---

## Endpoint 1: Get Property by ID

```
GET /api/v1/properties/:id
```

**Auth**: `Authorization: Bearer <clerk-jwt>` | **Tenant**: Required (`@RequiresTenant()`)

### Response — 200 OK

```json
{
  "id": "uuid-...",
  "tenantId": "internal-uuid-...",
  "name": "Sunset Apartments",
  "addressLine1": "123 Main Street",
  "addressLine2": "Suite 4B",
  "city": "Austin",
  "state": "TX",
  "postalCode": "78701",
  "country": "US",
  "propertyType": "Apartment Building",
  "description": "A 12-unit building near downtown.",
  "status": "active",
  "createdAt": "2026-06-05T00:00:00.000Z",
  "updatedAt": "2026-06-05T00:00:00.000Z",
  "deletedAt": null
}
```

### Error Responses

| Status | Code | Frontend action |
|--------|------|----------------|
| 401 | `UNAUTHORIZED` | Redirect to `/sign-in` |
| 403 | `FORBIDDEN` | Show inline workspace error banner, no redirect |
| 404 | `NOT_FOUND` | Show not-found state; no retry offered |
| 5xx / network | `INTERNAL_SERVER_ERROR` | Show error state with Retry button |

### Frontend Utility: `getPropertyById`

Location: `apps/web/src/lib/properties-api.ts`

```ts
async function getPropertyById(
  token: string,
  propertyId: string,
): Promise<GetPropertyResult>
```

**Logic**: `fetch GET /api/v1/properties/:id` with Bearer token. On 200 → `{ ok: true, property }`. On error → parse `body.error` → `{ ok: false, status, message }`.

---

## Endpoint 2: List Units for a Property

```
GET /api/v1/properties/:propertyId/units?page=1&limit=50
```

**Auth**: `Authorization: Bearer <clerk-jwt>` | **Tenant**: Required

### Response — 200 OK

```json
{
  "items": [
    {
      "id": "uuid-...",
      "tenantId": "internal-uuid-...",
      "propertyId": "uuid-...",
      "unitNumber": "101",
      "status": "AVAILABLE",
      "floorArea": 85.5,
      "bedrooms": 2,
      "bathrooms": 1.5,
      "monthlyRent": 15000.00,
      "description": "Corner unit.",
      "createdAt": "2026-06-05T00:00:00.000Z",
      "updatedAt": "2026-06-05T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

### Error Responses

Same pattern as Endpoint 1 (401 redirect, 403 inline, 404 not-found, 5xx retry).

### Frontend Utility: `getUnits`

Location: `apps/web/src/lib/units-api.ts`

```ts
async function getUnits(
  token: string,
  propertyId: string,
): Promise<PagedUnits>
```

**Logic**: `fetch GET /api/v1/properties/:propertyId/units?page=1&limit=50`. On 200 → return `PagedUnits`. On error → throw `ApiError` (consistent with existing `apiFetch` pattern). The caller (`property-detail-view.tsx`) catches this and sets the appropriate page state.

---

## Endpoint 3: Create Unit

```
POST /api/v1/properties/:propertyId/units
```

**Auth**: `Authorization: Bearer <clerk-jwt>` | **Tenant**: Required

### Request Body

```json
{
  "unitNumber": "101",
  "floorArea": 85.5,
  "bedrooms": 2,
  "bathrooms": 1.5,
  "monthlyRent": 15000.00,
  "description": "Corner unit with garden view."
}
```

| Field         | Type    | Required | Constraint                       |
| ------------- | ------- | -------- | -------------------------------- |
| `unitNumber`  | string  | Yes      | max 50 chars, unique per property |
| `floorArea`   | number  | No       | positive; omit when blank        |
| `bedrooms`    | integer | No       | ≥ 1; omit when blank             |
| `bathrooms`   | number  | No       | positive; omit when blank        |
| `monthlyRent` | number  | No       | positive; omit when blank        |
| `description` | string  | No       | max 1000 chars; omit when blank  |

**Note**: `status` and `propertyId` are NOT in the request body. `status` defaults to `AVAILABLE`; `propertyId` is taken from the URL path.

### Response — 201 Created

```json
{
  "id": "uuid-...",
  "tenantId": "internal-uuid-...",
  "propertyId": "uuid-...",
  "unitNumber": "101",
  "status": "AVAILABLE",
  "floorArea": 85.5,
  "bedrooms": 2,
  "bathrooms": 1.5,
  "monthlyRent": 15000.00,
  "description": "Corner unit with garden view.",
  "createdAt": "2026-06-05T00:00:00.000Z",
  "updatedAt": "2026-06-05T00:00:00.000Z"
}
```

### Error Responses

**400 Validation Error** (e.g. bedrooms not integer):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "details": {
      "fields": [
        { "field": "bedrooms", "messages": ["must be an integer number"] }
      ]
    }
  }
}
```

**409 Conflict** (duplicate unit number):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Unit number already exists for this property",
    "statusCode": 409
  }
}
```

| Status | Code | Frontend action |
|--------|------|----------------|
| 400 | `VALIDATION_ERROR` | Map `details.fields` to field errors |
| 409 | `CONFLICT` | Show `error.message` under `unitNumber` field |
| 401 | `UNAUTHORIZED` | Redirect to `/sign-in` |
| 403 | `FORBIDDEN` | Show inline workspace error banner |
| 5xx / network | any | Show general error banner; keep form open |

### Frontend Utility: `createUnit`

Location: `apps/web/src/lib/units-api.ts`

```ts
async function createUnit(
  token: string,
  propertyId: string,
  data: CreateUnitRequest,
): Promise<CreateUnitResult>
```

**Logic** (mirrors `createProperty` pattern):
1. `fetch POST /api/v1/properties/:propertyId/units` with Bearer token and JSON body
2. On 201 → `{ ok: true, unit }`
3. On error → parse `body.error` envelope:
   - If `code === 'VALIDATION_ERROR'` and `details.fields` → map to `fieldErrors`
   - If `code === 'CONFLICT'` → set `fieldErrors.unitNumber = [error.message]`
   - Otherwise → `generalError = error.message`
4. On network failure → `{ ok: false, fieldErrors: {}, generalError: 'Network error…', status: 0 }`

**Form Error Display Rules**:

| Condition | Display |
|---|---|
| `fieldErrors.unitNumber` | Under unit number input |
| `fieldErrors.bedrooms` / `.floorArea` / etc. | Under the relevant input |
| Unknown field in `fieldErrors` | Promoted to general banner |
| `generalError` non-null | Banner above form |
| `status === 401` | Redirect to `/sign-in` |
| `status === 403` | `generalError` banner, no redirect |
