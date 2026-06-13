# API Contract: Update Renter Contact

**Feature**: 043-update-contact-api | **Version**: 1.0.0

## Endpoint

```
PATCH /api/v1/contacts/:id
```

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Contact unique identifier. No format validation — 404 if not found. |

### Body (all fields optional, at least one required)

```json
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice.new@example.com",
  "phone": "+63 912 000 0000",
  "idNumber": "P-99999999",
  "notes": "Updated notes."
}
```

`tenantId` in the body is silently stripped.

## Responses

### 200 OK

```json
{
  "id": "...", "tenantId": "...",
  "firstName": "Alice", "lastName": "Smith",
  "email": "alice.new@example.com",
  "phone": "+63 912 000 0000", "idNumber": "P-99999999",
  "notes": "Updated notes.",
  "createdAt": "...", "updatedAt": "..."
}
```

### 400 — Validation error (empty body or invalid field)

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", ... } }
```

### 404 — Contact not accessible (missing, cross-tenant, or archived — identical)

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Contact not found.", ... } }
```

### 409 — Email already exists in workspace

```json
{ "success": false, "error": { "code": "CONFLICT", "message": "A contact with this email already exists in this workspace.", ... } }
```

### 401 / 403 — Auth errors

Standard auth/workspace-context error responses.

## Swagger Tags

- **Tag**: `Contacts` | **OperationId**: `ContactsController_update` | **Security**: `bearerAuth`
