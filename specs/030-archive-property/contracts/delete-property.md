# API Contract: DELETE /properties/:id

**Feature**: 030-archive-property
**Endpoint**: `DELETE /api/v1/properties/:id`
**Auth**: Bearer token (Clerk JWT) — required
**Idempotent**: Yes — repeat calls with the same ID return the same success response

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

### Body

No request body. Any body content is ignored.

---

## Response

### 204 No Content — Archive succeeded (active or already archived)

Empty body. No `Content-Type` header.

Both of the following conditions return an identical 204:
- The property was active and has now been archived
- The property was already archived — the operation is idempotent

### 404 Not Found — Property does not exist or belongs to a different tenant

Both conditions return an identical 404:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Property not found."
}
```

The caller cannot determine whether the 404 is because the property genuinely does not exist or because it belongs to a different tenant — this is intentional.

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

## Idempotency Guarantee

Sending `DELETE /properties/:id` multiple times for the same property owned by the current tenant will always return `204`. The operation is safe to retry. Clients MUST NOT treat a 204 response as proof that the property was active at the time of the request.

## Tenant Isolation Guarantee

`tenantId` is derived exclusively from the verified JWT. The `:id` path parameter is the only user-supplied input. A valid `:id` belonging to a different tenant returns `404` — identical to a non-existent ID. No archive, modification, or data access occurs for out-of-tenant IDs.
