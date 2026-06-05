# API Contract: Create Property Form

**Feature**: 038-create-property-form  
**Phase**: 1 — Design  
**Endpoint source**: `apps/api/src/modules/properties/presentation/properties.controller.ts`  
**DTO source**: `apps/api/src/modules/properties/presentation/dto/create-property.dto.ts`

---

## Endpoint

```
POST /api/v1/properties
```

**Authentication**: Required. `Authorization: Bearer <clerk-jwt>`  
**Tenant Context**: Required. The active Clerk organisation must be set — `orgId` is extracted from the JWT and mapped to `tenantId`. If absent, the endpoint returns `403`.

---

## Request

### Headers

| Header          | Value                   | Required |
| --------------- | ----------------------- | -------- |
| `Authorization` | `Bearer <clerk-jwt>`    | Yes      |
| `Content-Type`  | `application/json`      | Yes      |

### Body

```json
{
  "name": "Sunset Apartments",
  "addressLine1": "123 Main Street",
  "addressLine2": "Suite 4B",
  "city": "Austin",
  "state": "TX",
  "postalCode": "78701",
  "country": "US",
  "propertyType": "Apartment Building",
  "description": "A 12-unit building near downtown."
}
```

| Field          | Type   | Required | Max Length | Notes                        |
| -------------- | ------ | -------- | ---------- | ---------------------------- |
| `name`         | string | Yes      | 120        |                              |
| `addressLine1` | string | Yes      | 255        |                              |
| `addressLine2` | string | No       | 255        | Omit field when blank        |
| `city`         | string | Yes      | 120        |                              |
| `state`        | string | No       | 120        | Omit field when blank        |
| `postalCode`   | string | No       | 30         | Omit field when blank        |
| `country`      | string | Yes      | 120        |                              |
| `propertyType` | string | Yes      | 80         | Free-form text               |
| `description`  | string | No       | 1000       | Omit field when blank        |

**Important**: `tenantId` is NOT in the request body. It is extracted from the verified JWT by the backend guard.

---

## Responses

### 201 Created

```json
{
  "id": "clxyz1234",
  "tenantId": "org_abc123",
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

Type reference: `apps/api/src/modules/properties/presentation/dto/property-response.dto.ts`

---

### 400 Bad Request — Validation Error

Returned when `class-validator` rejects one or more fields.

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
        {
          "field": "name",
          "messages": ["must be shorter than or equal to 120 characters"]
        },
        {
          "field": "addressLine1",
          "messages": ["should not be empty"]
        }
      ]
    }
  }
}
```

**Frontend handling**: Map each `details.fields[i]` entry to `fieldErrors[field] = messages`. Display the first message under the relevant input. Fields not present in `fieldErrors` show no error.

---

### 401 Unauthorized — Session Expired

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "statusCode": 401,
    "timestamp": "...",
    "path": "/api/v1/properties"
  }
}
```

**Frontend handling**: Redirect to `/sign-in`.

---

### 403 Forbidden — No Active Workspace

Returned by `@RequiresTenant()` guard when the Clerk JWT has no active `orgId`.

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Tenant context required",
    "statusCode": 403,
    "timestamp": "...",
    "path": "/api/v1/properties"
  }
}
```

**Frontend handling**: Display `error.message` as an inline general banner on the form. Do NOT redirect.

---

### 5xx Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "statusCode": 500,
    "timestamp": "...",
    "path": "/api/v1/properties"
  }
}
```

**Frontend handling**: Display `error.message` (or a fallback message) as a general error banner. Keep form open with inputs intact. Re-enable submit button.

---

## Frontend API Utility: `createProperty`

Location: `apps/web/src/lib/properties-api.ts`

```ts
async function createProperty(
  token: string,
  data: CreatePropertyRequest,
): Promise<CreatePropertyResult>
```

**Logic**:
1. `fetch POST /api/v1/properties` with `Authorization: Bearer <token>` and JSON body.
2. If `response.ok` (201): parse body, return `{ ok: true, property }`.
3. If not ok: parse body as `ApiErrorResponse`.
   - If `error.code === 'VALIDATION_ERROR'` and `error.details?.fields` exists: build `fieldErrors` from `details.fields`; any field `"_"` goes into `generalError`.
   - Otherwise: set `generalError = error.message ?? 'An error occurred'`; `fieldErrors = {}`.
4. Return `{ ok: false, fieldErrors, generalError, status: response.status }`.
5. On network failure (fetch throws): return `{ ok: false, fieldErrors: {}, generalError: 'Network error — please try again.', status: 0 }`.

---

## Form Error Display Rules

| Condition                                  | Display                                      |
| ------------------------------------------ | -------------------------------------------- |
| `fieldErrors[fieldName]` non-empty         | Inline message below the relevant input      |
| Unknown field in `fieldErrors` (not in form) | Promote to `generalError` banner           |
| `generalError` non-null                    | Banner above the form                        |
| `status === 401`                           | Redirect to `/sign-in` (no banner shown)     |
| `status === 403`                           | `generalError` banner (no redirect)          |
