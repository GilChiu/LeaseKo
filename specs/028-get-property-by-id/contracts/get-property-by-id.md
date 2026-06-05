# API Contract: GET /properties/:id

**Feature**: 028-get-property-by-id
**Endpoint**: `GET /api/v1/properties/:id`
**Auth**: Bearer token (Clerk JWT) — required

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Unique property identifier |

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | `Bearer <clerk_jwt>` |

---

## Response

### 200 OK — Property found and belongs to current tenant

```json
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
```

### 404 Not Found — Property does not exist OR belongs to a different tenant

Both cases return an identical response. The caller cannot determine which condition caused the 404.

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Property not found."
}
```

### 401 Unauthorized

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

---

## Tenant Isolation Guarantee

The `tenantId` is derived **exclusively** from the verified JWT. The `:id` path parameter is the only user-supplied input. A valid `:id` belonging to a different tenant returns `404` — identical to a non-existent ID. No status code, header, or body field reveals the existence of records outside the requesting tenant's workspace.
