# API Contract: PATCH /properties/:id

**Feature**: 029-update-property
**Endpoint**: `PATCH /api/v1/properties/:id`
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
| Content-Type | Yes | `application/json` |

### Body — at least one field required

```json
{
  "name": "Updated Apartments",
  "city": "Manila"
}
```

All fields are optional individually, but the body must contain at least one recognized field. Sending `{}` or omitting all fields returns `400`.

| Field | Type | Max length | Notes |
|-------|------|------------|-------|
| name | string | 120 | |
| addressLine1 | string | 255 | |
| addressLine2 | string | 255 | |
| city | string | 120 | |
| state | string | 120 | |
| postalCode | string | 30 | |
| country | string | 120 | |
| propertyType | string | 80 | |
| description | string | 1000 | |

`tenantId` is not an accepted field — it is silently rejected by the server.

---

## Response

### 200 OK — Update applied

Returns the complete updated property record.

```json
{
  "id": "clxyz123",
  "tenantId": "org_2abc123xyz",
  "name": "Updated Apartments",
  "addressLine1": "123 Main Street",
  "addressLine2": null,
  "city": "Manila",
  "state": "Metro Manila",
  "postalCode": "1000",
  "country": "Philippines",
  "propertyType": "APARTMENT",
  "description": "A 12-unit apartment building.",
  "createdAt": "2026-05-09T12:00:00.000Z",
  "updatedAt": "2026-06-04T10:00:00.000Z"
}
```

### 400 Bad Request — Empty payload or validation failure

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": ["At least one field must be provided to update a property"]
}
```

### 404 Not Found — Property does not exist or belongs to a different tenant

Both cases are identical in status code, shape, and content.

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Property not found."
}
```

### 401 Unauthorized / 403 Forbidden

Same shape as other protected endpoints.

---

## Tenant Isolation Guarantee

`tenantId` is derived from the verified JWT only. The `id` path parameter and all body fields are user inputs. A valid `id` belonging to a different tenant returns `404` — identical to a non-existent property. No mutation occurs.
