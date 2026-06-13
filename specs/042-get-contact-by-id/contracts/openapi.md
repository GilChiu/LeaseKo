# API Contract: Get Renter Contact by ID

**Feature**: 042-get-contact-by-id | **Version**: 1.0.0

---

## Endpoint

```
GET /api/v1/contacts/:id
```

---

## Authentication

```
Authorization: Bearer <clerk-jwt>
```

JWT MUST include an active organization session (`orgId` claim present).

---

## Request

### Path Parameters

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `id`      | string | Yes      | The contact's unique ID  |

No format validation is applied to `:id`. Any string is accepted; a lookup is performed and 404 is returned if no active contact matches.

---

## Responses

### 200 OK — Contact found

```json
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
```

`deletedAt` is never included in the response.

---

### 404 Not Found — Contact not accessible

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Contact not found.",
    "statusCode": 404,
    "timestamp": "2026-06-05T12:00:00.000Z",
    "path": "/api/v1/contacts/some-id"
  }
}
```

**Triggered by** (all identical — intentionally indistinguishable):
- ID does not exist in the database
- ID exists but belongs to a different workspace
- ID refers to an archived (soft-deleted) contact
- ID is a malformed string that matches no record

---

### 401 Unauthorized — Missing or invalid JWT

**Triggered by**: No `Authorization` header, or invalid/expired JWT.

---

### 403 Forbidden — No active workspace

**Triggered by**: Valid JWT but no active organization, or organization has no Tenant record.

---

## Behaviour Details

### Unified 404
All inaccessible cases return the same 404 response. A caller cannot determine whether the record exists in another workspace or has been archived — this is by design to prevent information leakage.

### Workspace Isolation
The lookup always uses the session workspace. Any `tenantId` in the query string is silently stripped.

---

## OpenAPI / Swagger Tags

- **Tag**: `Contacts`
- **OperationId**: `ContactsController_findOne`
- **Security**: `bearerAuth`
