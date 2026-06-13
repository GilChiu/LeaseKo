# API Contract: List Renter Contacts

**Feature**: 041-list-contacts-api | **Version**: 1.0.0

---

## Endpoint

```
GET /api/v1/contacts
```

---

## Authentication

All requests MUST include a valid Clerk JWT in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt>
```

The JWT MUST be issued for an active organization session (`orgId` claim present). Requests without `orgId` are rejected with `403 Forbidden`.

---

## Request

### Headers

| Header          | Required | Value                |
| --------------- | -------- | -------------------- |
| `Authorization` | Yes      | `Bearer <clerk-jwt>` |

### Query Parameters

| Parameter | Type    | Required | Default | Constraints     | Description                         |
| --------- | ------- | -------- | ------- | --------------- | ----------------------------------- |
| `page`    | integer | No       | `1`     | min: 1          | Page number (1-indexed)             |
| `limit`   | integer | No       | `20`    | min: 1, max: 100| Number of results per page          |

**Security note**: Any `tenantId` or `workspaceId` in the query string is silently stripped. Results are always scoped to the session workspace.

---

## Responses

### 200 OK — Contacts retrieved

```json
{
  "items": [
    {
      "id": "3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "tenantId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "alice@example.com",
      "phone": "+63 912 345 6789",
      "idNumber": "P-12345678A",
      "notes": "Interested in unit 4B.",
      "createdAt": "2026-06-05T12:00:00.000Z",
      "updatedAt": "2026-06-05T12:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Empty workspace**:
```json
{ "items": [], "total": 0, "page": 1, "limit": 20 }
```

**Page beyond last** (e.g., `?page=99` with 5 contacts):
```json
{ "items": [], "total": 5, "page": 99, "limit": 20 }
```

**Response field notes**:
- `items`: array of active contacts, ordered by `createdAt` descending (newest first)
- `total`: count of all active contacts in the workspace — excludes archived; does not change with pagination
- `page`: echoed from query (or default `1`)
- `limit`: echoed from query (or default `20`)
- `deletedAt` is never included in any item

---

### 400 Bad Request — Validation error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-06-05T12:00:00.000Z",
    "path": "/api/v1/contacts",
    "details": {
      "fields": [
        { "field": "page", "messages": ["page must not be less than 1"] }
      ]
    }
  }
}
```

**Triggered by**:
- `page` < 1, `page` is 0 or negative, `page` is not an integer
- `limit` < 1, `limit` > 100, `limit` is not an integer

---

### 401 Unauthorized

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Unauthorized", "statusCode": 401, ... } }
```

**Triggered by**: Missing or invalid `Authorization` header.

---

### 403 Forbidden

```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Forbidden", "statusCode": 403, ... } }
```

**Triggered by**: Valid JWT but no active organization, or organization has no Tenant record.

---

## Behaviour Details

### Archived Contacts
Contacts with `deletedAt` set are excluded from both `items` and `total`. The endpoint only ever surfaces active contacts.

### Workspace Isolation
Results are always scoped to the session workspace. Any `tenantId` or `workspaceId` in the query string is silently stripped by the global `ValidationPipe` (`whitelist: true`).

### Consistent Pagination
`total` and `items` are fetched in a single database transaction, guaranteeing they are consistent even under concurrent writes.

---

## OpenAPI / Swagger Tags

- **Tag**: `Contacts`
- **OperationId**: `ContactsController_list`
- **Security**: `bearerAuth`
