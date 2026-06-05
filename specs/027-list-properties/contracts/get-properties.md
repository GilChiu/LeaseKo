# API Contract: GET /properties

**Feature**: 027-list-properties
**Endpoint**: `GET /api/v1/properties`
**Auth**: Bearer token (Clerk JWT) — required

---

## Request

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | `Bearer <clerk_jwt>` |

### Query Parameters

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | min: 1 |
| limit | integer | No | 20 | min: 1, max: 100 |

---

## Response

### 200 OK

```json
{
  "items": [
    {
      "id": "clxyz123",
      "tenantId": "org_2abc123xyz",
      "name": "Sunset Apartments",
      "addressLine1": "123 Main Street",
      "addressLine2": null,
      "city": "Iloilo City",
      "state": "Iloilo",
      "postalCode": "5000",
      "country": "Philippines",
      "propertyType": "APARTMENT",
      "description": "A 12-unit apartment building.",
      "createdAt": "2026-05-09T12:00:00.000Z",
      "updatedAt": "2026-05-09T12:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

**Empty workspace (no properties)**:
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20,
  "hasMore": false
}
```

### 401 Unauthorized

Missing or invalid Bearer token.

```json
{
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "message": "Missing or invalid authentication token."
}
```

### 403 Forbidden

Authenticated but no active tenant/organisation context.

```json
{
  "statusCode": 403,
  "error": "FORBIDDEN",
  "message": "No active tenant context."
}
```

### 400 Bad Request

Invalid query parameter values.

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": ["page must not be less than 1", "limit must not be greater than 100"]
}
```

---

## Tenant Isolation Guarantee

The `tenantId` is derived **exclusively** from the verified JWT. Providing `tenantId` in the query string or request body has **no effect** — the server ignores it. Every `items` entry in the response belongs to the requesting tenant.

---

## Pagination Notes

- `total` reflects the count of all active (non-soft-deleted) properties for the tenant, regardless of page.
- `hasMore` is `true` when `page * limit < total`.
- Requesting a page beyond the last page returns `items: []` and `hasMore: false` — not a 404.
- Properties are returned in descending order of creation date (newest first).
