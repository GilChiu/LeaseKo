# Quickstart: Global Exception Filter and Standard API Error Responses

**Feature**: 018-global-exception-filter

This guide explains how to trigger, observe, and extend API error responses after
feature 018 is implemented.

---

## What Changed

Every API error now returns a consistent shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-05-06T12:00:00.000Z",
    "path": "/api/v1/some-endpoint",
    "details": {
      "fields": [
        { "field": "email", "messages": ["email must be an email"] }
      ]
    }
  }
}
```

---

## Verify the Error Format Locally

### Test 1: Validation error (400)

Call a protected endpoint with a missing required field. The exact endpoint depends on what DTOs exist — the `/api/v1/me` endpoint requires a valid Bearer token, so for a validation test, use any endpoint that accepts a body with a DTO.

```bash
curl -X POST http://localhost:3001/api/v1/tenants \
  -H "Authorization: Bearer <valid_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "...",
    "path": "/api/v1/tenants",
    "details": { "fields": [...] }
  }
}
```

### Test 2: Unauthorized (401)

```bash
curl http://localhost:3001/api/v1/me
```

Expected response (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "statusCode": 401,
    "timestamp": "...",
    "path": "/api/v1/me"
  }
}
```

### Test 3: Not found (404)

```bash
curl -H "Authorization: Bearer <valid_token>" \
  http://localhost:3001/api/v1/nonexistent-route
```

Expected response (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cannot GET /api/v1/nonexistent-route",
    "statusCode": 404,
    "timestamp": "...",
    "path": "/api/v1/nonexistent-route"
  }
}
```

---

## How to Throw Errors in New Modules

Import NestJS exceptions — the global filter maps them automatically:

```typescript
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

// In a use case:
throw new NotFoundException('Lease not found');
// → 404 { code: "NOT_FOUND", message: "Lease not found" }

throw new ConflictException('Unit is already occupied');
// → 409 { code: "CONFLICT", message: "Unit is already occupied" }

throw new ForbiddenException('Tenant context required');
// → 403 { code: "FORBIDDEN", message: "Tenant context required" }
```

**Do not** throw plain `new Error("...")` from use cases or domain entities — those
map to `500 INTERNAL_SERVER_ERROR` by the filter. Use the correct NestJS exception.

---

## Error Codes Reference

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | DTO validation fails (class-validator) |
| `BAD_REQUEST` | 400 | Other bad input |
| `UNAUTHORIZED` | 401 | Missing/invalid auth token |
| `FORBIDDEN` | 403 | Valid token, but insufficient permissions or missing tenant |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Uniqueness violation or state conflict |
| `TENANT_CONTEXT_REQUIRED` | 403 | Authenticated but no active tenant (org) in token |
| `SERVICE_UNAVAILABLE` | 503 | Database temporarily unreachable |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled/unexpected error |

---

## Production vs Development Behavior

| Scenario | Development | Production |
|---|---|---|
| Unhandled exception message | Original error message included | Generic `"An unexpected error occurred"` |
| Stack trace in response | Never included | Never included |
| Stack trace in server log | Yes | No |
| Prisma error message | Safe mapped message | Safe mapped message |

---

## Adding a Custom Error Code

Custom codes live in `apps/api/src/common/errors/error-codes.ts`:

```typescript
export const ErrorCode = {
  // ... existing codes ...
  LEASE_ALREADY_ACTIVE: "LEASE_ALREADY_ACTIVE",  // ← add here
} as const;
```

Then throw with the code embedded in the exception:

```typescript
throw new ConflictException({ code: ErrorCode.LEASE_ALREADY_ACTIVE, message: 'Lease is already active' });
```

The filter picks up the `code` from the exception body if present, falling back to
the default code for the HTTP status.
