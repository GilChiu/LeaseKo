# API Contract: POST /properties

**Feature**: 025-create-property-endpoint
**Date**: 2026-05-09
**Base URL**: `http://localhost:3001/api/v1` (local)
**Global Prefix**: `/api/v1`

---

## POST /api/v1/properties

**Summary**: Create a new property for the current authenticated tenant.

### Authentication

- **Type**: Bearer (Clerk JWT)
- **Header**: `Authorization: Bearer <jwt>`
- **Required**: ✅

### Tenant Context

- **Source**: Clerk JWT org claim — extracted by `ClerkJwtGuard`
- **Required**: ✅ — requests without tenant context return 403
- **Body field**: ❌ — `tenantId` is NOT accepted in the request body

---

### Request

**Content-Type**: `application/json`

**Body** (`CreatePropertyDto`):

```json
{
  "name": "Sunset Apartments",
  "addressLine1": "123 Main Street",
  "addressLine2": "Unit A",
  "city": "Iloilo City",
  "state": "Iloilo",
  "postalCode": "5000",
  "country": "Philippines",
  "propertyType": "APARTMENT",
  "description": "A 12-unit apartment building."
}
```

**Field schema**:

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ | non-empty, max 120 chars |
| `addressLine1` | string | ✅ | non-empty, max 255 chars |
| `addressLine2` | string | ❌ | max 255 chars |
| `city` | string | ✅ | non-empty, max 120 chars |
| `state` | string | ❌ | max 120 chars |
| `postalCode` | string | ❌ | max 30 chars |
| `country` | string | ✅ | non-empty, max 120 chars |
| `propertyType` | string | ✅ | non-empty, max 80 chars (free-form) |
| `description` | string | ❌ | max 1000 chars |

**Forbidden fields** (rejected with 400 by `ValidationPipe` `forbidNonWhitelisted: true`):

- `tenantId` — never accepted from client
- Any other undeclared field

---

### Responses

#### 201 Created

Property created successfully.

**Content-Type**: `application/json`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "org_2abc123xyz",
  "name": "Sunset Apartments",
  "addressLine1": "123 Main Street",
  "addressLine2": "Unit A",
  "city": "Iloilo City",
  "state": "Iloilo",
  "postalCode": "5000",
  "country": "Philippines",
  "propertyType": "APARTMENT",
  "description": "A 12-unit apartment building.",
  "createdAt": "2026-05-09T12:00:00.000Z",
  "updatedAt": "2026-05-09T12:00:00.000Z"
}
```

**Field schema** (`PropertyResponseDto`):

| Field | Type | Nullable |
|---|---|---|
| `id` | string (UUID) | ❌ |
| `tenantId` | string | ❌ |
| `name` | string | ❌ |
| `addressLine1` | string | ❌ |
| `addressLine2` | string \| null | ✅ |
| `city` | string | ❌ |
| `state` | string \| null | ✅ |
| `postalCode` | string \| null | ✅ |
| `country` | string | ❌ |
| `propertyType` | string | ❌ |
| `description` | string \| null | ✅ |
| `createdAt` | ISO 8601 datetime | ❌ |
| `updatedAt` | ISO 8601 datetime | ❌ |

#### 400 Bad Request

Validation error — missing required field or field exceeds max length.

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "name should not be empty",
    "statusCode": 400,
    "timestamp": "2026-05-09T12:00:00.000Z",
    "path": "/api/v1/properties",
    "details": { "name": ["should not be empty", "must be a string"] }
  }
}
```

#### 401 Unauthorized

Missing or invalid Clerk JWT.

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "statusCode": 401,
    "timestamp": "2026-05-09T12:00:00.000Z",
    "path": "/api/v1/properties"
  }
}
```

#### 403 Forbidden

Valid JWT but no active organization/tenant context.

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Active organization context required",
    "statusCode": 403,
    "timestamp": "2026-05-09T12:00:00.000Z",
    "path": "/api/v1/properties"
  }
}
```

#### 500 Internal Server Error

Unexpected server error (e.g., DB unavailable).

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error",
    "statusCode": 500,
    "timestamp": "2026-05-09T12:00:00.000Z",
    "path": "/api/v1/properties"
  }
}
```

---

## Security Notes

- `tenantId` is never accepted from or echoed back as a request body field
- Bearer token must be a valid Clerk-issued JWT verified against JWKS
- Response does not include raw Prisma errors, Clerk secrets, or internal stack traces
- Endpoint is NOT `@Public()` — all requests require authentication
