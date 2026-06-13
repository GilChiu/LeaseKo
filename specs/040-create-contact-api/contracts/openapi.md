# API Contract: Create Renter Contact

**Feature**: 040-create-contact-api | **Version**: 1.0.0

---

## Endpoint

```
POST /api/v1/contacts
```

---

## Authentication

All requests MUST include a valid Clerk JWT in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt>
```

The JWT MUST be issued for an active organization session (`orgId` claim present). Requests without `orgId` in the JWT are rejected with `403 Forbidden`.

---

## Request

### Headers

| Header          | Required | Value                        |
| --------------- | -------- | ---------------------------- |
| `Authorization` | Yes      | `Bearer <clerk-jwt>`         |
| `Content-Type`  | Yes      | `application/json`           |

### Body

```json
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice@example.com",
  "phone": "+63 912 345 6789",
  "idNumber": "P-12345678A",
  "notes": "Interested in unit 4B. Prefers move-in after August."
}
```

### Field Reference

| Field       | Type   | Required | Max Length | Description                                      |
| ----------- | ------ | -------- | ---------- | ------------------------------------------------ |
| `firstName` | string | **Yes**  | 100        | Renter's first name. Whitespace-only is rejected.|
| `lastName`  | string | **Yes**  | 100        | Renter's last name. Whitespace-only is rejected. |
| `email`     | string | **Yes**  | 255        | Valid email address. Case-insensitive uniqueness enforced per workspace. |
| `phone`     | string | No       | 30         | Free-form phone number. No format enforced.      |
| `idNumber`  | string | No       | 50         | Passport/national ID. No format enforced.        |
| `notes`     | string | No       | 1000       | Free-form notes. Multi-line text accepted.       |

**Security note**: `tenantId`, `workspaceId`, or any workspace identifier in the request body is silently stripped and never honoured. The workspace is always derived from the authenticated session.

---

## Responses

### 201 Created — Contact created successfully

```json
{
  "id": "3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "tenantId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice@example.com",
  "phone": "+63 912 345 6789",
  "idNumber": "P-12345678A",
  "notes": "Interested in unit 4B. Prefers move-in after August.",
  "createdAt": "2026-06-05T12:00:00.000Z",
  "updatedAt": "2026-06-05T12:00:00.000Z"
}
```

**Response field notes**:
- `id`: System-generated UUID
- `tenantId`: The workspace UUID (derived from session, not the request body)
- `email`: Stored and returned in lowercase regardless of input casing
- `phone`, `idNumber`, `notes`: `null` when not provided
- `deletedAt` is never included in the response

---

### 400 Bad Request — Validation failure

All validation errors for the request are returned in a **single response**. The `message` array contains one entry per violated field.

```json
{
  "statusCode": 400,
  "message": [
    "firstName should not be empty",
    "lastName should not be empty",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

**Triggered by**:
- `firstName` or `lastName` is blank, whitespace-only, or exceeds 100 characters
- `email` is blank, not a valid email format, or exceeds 255 characters
- `phone` exceeds 30 characters
- `idNumber` exceeds 50 characters
- `notes` exceeds 1000 characters

---

### 401 Unauthorized — Missing or invalid JWT

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Triggered by**: No `Authorization` header, or the JWT is expired/invalid/not verifiable against Clerk JWKS.

---

### 403 Forbidden — No active workspace

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

**Triggered by**: Valid JWT but the Clerk session has no active organization (`orgId` absent), or the organization has no corresponding Tenant record in the database.

---

### 409 Conflict — Email already exists in workspace

```json
{
  "statusCode": 409,
  "message": "A contact with this email already exists in this workspace."
}
```

**Triggered by**: A non-archived contact with the same email (case-insensitive) already exists in the authenticated workspace.

**Cross-workspace behaviour**: The same email address may be used in different workspaces — uniqueness is enforced only within a single workspace.

---

## Behaviour Details

### Email Case Normalization
`alice@example.com` and `Alice@Example.COM` are treated as identical. The email is always stored and returned in lowercase. The uniqueness check is performed against the normalized (lowercased) value.

### Workspace ID in Request Body
Any `tenantId` or workspace identifier included in the request body is silently stripped by the global `ValidationPipe` (`whitelist: true`). The contact is always scoped to the session's workspace.

### Archived Contacts
An archived (soft-deleted) contact does not block creation of a new contact with the same email. The uniqueness check only considers active (non-archived) contacts.

### Rate Limiting
This endpoint is subject to the global rate limiter. Excessive requests return `429 Too Many Requests`.

---

## OpenAPI / Swagger Tags

- **Tag**: `Contacts`
- **OperationId**: `ContactsController_create`
- **Security**: `bearerAuth`
