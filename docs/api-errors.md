# API Error Contract

All error responses from the LeaseKo API follow a single standard shape regardless of endpoint, HTTP method, or error type.

---

## Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "statusCode": 401,
    "timestamp": "2026-05-06T12:00:00.000Z",
    "path": "/api/v1/me"
  }
}
```

| Field | Type | Always Present | Description |
|---|---|---|---|
| `success` | `false` | Yes | Always `false` on errors |
| `error.code` | `string` | Yes | Machine-readable error code (see table below) |
| `error.message` | `string` | Yes | Human-readable description |
| `error.statusCode` | `number` | Yes | HTTP status code (mirrors the HTTP response status) |
| `error.timestamp` | `string` | Yes | ISO 8601 timestamp of when the error occurred |
| `error.path` | `string` | Yes | Request URL path |
| `error.details` | `object` | No | Field-level validation details — only present on `VALIDATION_ERROR` |
| `error.requestId` | `string` | No | Reserved — populated when request ID middleware is added |

---

## Error Code Reference

| Code | HTTP Status | Trigger |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `ValidationPipe` rejects DTO — `class-validator` returns array of constraint messages |
| `BAD_REQUEST` | 400 | `BadRequestException` with a string message |
| `UNAUTHORIZED` | 401 | `UnauthorizedException` — missing or invalid JWT (Clerk guard) |
| `FORBIDDEN` | 403 | `ForbiddenException` — valid token but insufficient permissions (e.g., no org context) |
| `TENANT_CONTEXT_REQUIRED` | 403 | Custom code in `ForbiddenException` body — tenant context missing from request |
| `NOT_FOUND` | 404 | `NotFoundException`, or Prisma `P2025` (record not found) |
| `CONFLICT` | 409 | `ConflictException`, or Prisma `P2002`/`P2003` (unique constraint / foreign key) |
| `DATABASE_CONSTRAINT_ERROR` | 409 | Reserved — domain-level DB constraint violations in future modules |
| `SERVICE_UNAVAILABLE` | 503 | `PrismaClientInitializationError` — database connection failure |
| `INTERNAL_SERVER_ERROR` | 500 | Any unhandled exception not matching the cases above |

---

## Validation Error Format

When `ValidationPipe` rejects a request body, the response includes `error.details.fields` — an array of field-level constraint failures:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-05-06T12:00:00.000Z",
    "path": "/api/v1/tenants",
    "details": {
      "fields": [
        { "field": "name", "messages": ["must be a string", "should not be empty"] },
        { "field": "email", "messages": ["must be an email"] }
      ]
    }
  }
}
```

Each entry in `fields` maps a DTO property name to the list of validation constraints that failed.

---

## Auth and Tenant Error Behavior

| Scenario | Code | Status |
|---|---|---|
| No `Authorization` header | `UNAUTHORIZED` | 401 |
| Expired or invalid JWT | `UNAUTHORIZED` | 401 |
| Valid JWT but no org membership | `FORBIDDEN` | 403 |
| Valid JWT, valid org, but tenant not provisioned | `FORBIDDEN` or `TENANT_CONTEXT_REQUIRED` | 403 |
| Access to another tenant's resource | `FORBIDDEN` | 403 |

No JWT claims, token fragments, or Clerk API details are included in error responses.

---

## Prisma Error Mapping

The global filter maps Prisma-specific errors to safe HTTP responses. Repositories handle most Prisma errors internally, but the filter acts as a safety net for any that propagate.

| Prisma Code | Description | HTTP Status | Error Code |
|---|---|---|---|
| `P2002` | Unique constraint violation | 409 | `CONFLICT` |
| `P2025` | Record not found (e.g., on update) | 404 | `NOT_FOUND` |
| `P2003` | Foreign key constraint violation | 409 | `CONFLICT` |
| Other `PrismaClientKnownRequestError` | Unexpected Prisma error | 500 | `INTERNAL_SERVER_ERROR` |
| `PrismaClientInitializationError` | Database connection failure | 503 | `SERVICE_UNAVAILABLE` |

No raw Prisma error messages, SQL queries, or constraint names are included in responses.

---

## Production vs Development Behavior

The `GlobalExceptionFilter` is constructed with `nodeEnv` from the validated `ConfigService`.

| Scenario | Development | Production |
|---|---|---|
| Unhandled `Error` message | Original `error.message` included | Generic `"An unexpected error occurred"` |
| HttpException message | Passed through as-is | Passed through as-is |
| Stack traces in response | Never included | Never included |
| Stack traces in logs | Logged server-side | Logged server-side |

---

## Logging Safety Rules

Only **unhandled 5xx errors** (unknown exceptions) produce a server-side log entry.

| Scenario | Logged? | Fields |
|---|---|---|
| Unknown exception (5xx) | Yes | `method`, `path`, `statusCode=500`, `error.name`, `error.message` |
| Prisma known error mapped to 5xx | Yes | Same as above |
| Any `HttpException` (4xx or 5xx) | No | — |
| Prisma known error mapped to 4xx/5xx | No | — |

**Never logged**: `Authorization` header contents, JWT tokens, Clerk API keys, passwords, raw SQL.

---

## How to Throw Errors in New Modules

Throw NestJS built-in exceptions from use cases, services, or repositories. The global filter handles the HTTP response automatically.

```typescript
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";

// 404 → NOT_FOUND
throw new NotFoundException("Lease agreement not found");

// 409 → CONFLICT
throw new ConflictException("Unit is already occupied");

// 400 → BAD_REQUEST
throw new BadRequestException("Start date must be before end date");

// 403 → FORBIDDEN
throw new ForbiddenException("Access denied");

// 403 with custom code → TENANT_CONTEXT_REQUIRED
throw new ForbiddenException({
  code: "TENANT_CONTEXT_REQUIRED",
  message: "An organization context is required for this operation",
});
```

Do **not** call `response.status(...).json(...)` directly in controllers or use cases. The filter handles all error serialization.

---

## Adding Custom Error Codes

All error codes are defined in `apps/api/src/common/errors/error-codes.ts`:

```typescript
export const ErrorCode = {
  // ...existing codes
  MY_NEW_CODE: "MY_NEW_CODE",
} as const;
```

To use a custom code, throw a `ForbiddenException` (or any `HttpException`) with a body object containing a `code` field:

```typescript
throw new ForbiddenException({
  code: ErrorCode.MY_NEW_CODE,
  message: "Descriptive message for the client",
});
```

The filter detects the `code` field in the exception body and uses it directly in the response, overriding the default status-based derivation.
