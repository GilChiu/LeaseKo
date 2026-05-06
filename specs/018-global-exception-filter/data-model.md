# Data Model: Global Exception Filter and Standard API Error Responses

**Feature**: 018-global-exception-filter
**Branch**: `018-global-exception-filter`
**Date**: 2026-05-06

> This feature introduces no database tables. The "data model" describes the
> **typed error response object graph** and the **error code registry** that
> constitute the API's error contract.

---

## ApiErrorResponse Interface

**File**: `apps/api/src/common/types/api-error-response.interface.ts`

```typescript
import type { ErrorCode } from "../errors/error-codes";

export interface ApiErrorDetails {
  fields?: Array<{ field: string; messages: string[] }>;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  timestamp: string;     // ISO 8601 — always present
  path: string;          // request URL — always present
  details?: ApiErrorDetails;   // present only for validation errors
  requestId?: string;    // future: populated by request ID middleware
}

export interface ApiErrorResponse {
  success: false;        // always false — type discriminant for frontend
  error: ApiError;
}
```

---

## ErrorCode Registry

**File**: `apps/api/src/common/errors/error-codes.ts`

```typescript
export const ErrorCode = {
  // Client errors
  VALIDATION_ERROR:          "VALIDATION_ERROR",
  BAD_REQUEST:               "BAD_REQUEST",
  UNAUTHORIZED:              "UNAUTHORIZED",
  FORBIDDEN:                 "FORBIDDEN",
  NOT_FOUND:                 "NOT_FOUND",
  CONFLICT:                  "CONFLICT",
  // Domain-specific
  TENANT_CONTEXT_REQUIRED:   "TENANT_CONTEXT_REQUIRED",
  // Data layer
  DATABASE_CONSTRAINT_ERROR: "DATABASE_CONSTRAINT_ERROR",
  // Server errors
  SERVICE_UNAVAILABLE:       "SERVICE_UNAVAILABLE",
  INTERNAL_SERVER_ERROR:     "INTERNAL_SERVER_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
```

---

## PrismaErrorMapper

**File**: `apps/api/src/common/errors/prisma-error.mapper.ts`

Maps `PrismaClientKnownRequestError` and `PrismaClientInitializationError` to safe `{ status, code, message }` tuples. Returns `null` for unknown Prisma error types (falls through to generic 500).

```typescript
interface MappedPrismaError {
  status: number;
  code: ErrorCode;
  message: string;
}

function mapPrismaError(error: unknown): MappedPrismaError | null
```

**Prisma code mappings:**

| Prisma Code | Condition | HTTP Status | ErrorCode | Client Message |
|---|---|---|---|---|
| `P2002` | Unique constraint violation | 409 | `CONFLICT` | `"A record with this value already exists"` |
| `P2025` | Record not found | 404 | `NOT_FOUND` | `"The requested resource was not found"` |
| `P2003` | Foreign key constraint | 409 | `CONFLICT` | `"Referenced resource does not exist or constraint violated"` |
| `P1001` / `P1002` | Connection timeout / unreachable | 503 | `SERVICE_UNAVAILABLE` | `"The database is temporarily unavailable"` |
| Other known codes | — | 500 | `INTERNAL_SERVER_ERROR` | `"A database error occurred"` |
| `PrismaClientInitializationError` | Connection failed | 503 | `SERVICE_UNAVAILABLE` | `"The database is temporarily unavailable"` |

---

## ErrorResponseDto (Swagger DTO)

**File**: `apps/api/src/shared/dto/error-response.dto.ts`

Updated to match the new `ApiErrorResponse` shape for accurate Swagger documentation.

```typescript
class ApiErrorBodyDto {
  code: string;           // @ApiProperty
  message: string;        // @ApiProperty
  statusCode: number;     // @ApiProperty
  timestamp: string;      // @ApiProperty
  path: string;           // @ApiProperty
  details?: object;       // @ApiPropertyOptional
}

class ErrorResponseDto {
  success: false;         // @ApiProperty({ example: false })
  error: ApiErrorBodyDto; // @ApiProperty({ type: ApiErrorBodyDto })
}
```

---

## HTTP Status → ErrorCode Mapping

| NestJS Exception | HTTP | ErrorCode |
|---|---|---|
| `BadRequestException` (string message) | 400 | `BAD_REQUEST` |
| `BadRequestException` (array message from ValidationPipe) | 400 | `VALIDATION_ERROR` |
| `UnauthorizedException` | 401 | `UNAUTHORIZED` |
| `ForbiddenException` | 403 | `FORBIDDEN` |
| `NotFoundException` | 404 | `NOT_FOUND` |
| `ConflictException` | 409 | `CONFLICT` |
| `InternalServerErrorException` | 500 | `INTERNAL_SERVER_ERROR` |
| Any other `HttpException` | (from exception) | `BAD_REQUEST` (fallback for 4xx), `INTERNAL_SERVER_ERROR` (for 5xx) |
| `PrismaClientKnownRequestError` | (mapped) | (see Prisma table above) |
| `PrismaClientInitializationError` | 503 | `SERVICE_UNAVAILABLE` |
| Any other `Error` | 500 | `INTERNAL_SERVER_ERROR` |

---

## Validation Error `details.fields` Format

Produced when `BadRequestException` carries an array `message` body (output of `class-validator` via `ValidationPipe`).

The filter parses messages like `"email must be an email"` by splitting on the first space to extract the field name (`email`) and the constraint message (`must be an email`).

```typescript
details: {
  fields: [
    { field: "email",    messages: ["must be a valid email address"] },
    { field: "name",     messages: ["should not be empty"] },
  ]
}
```

---

## Files Created / Modified

| Action | Path | Description |
|---|---|---|
| **Create** | `common/errors/error-codes.ts` | `ErrorCode` const registry |
| **Create** | `common/errors/prisma-error.mapper.ts` | Prisma error → HTTP mapping |
| **Create** | `common/types/api-error-response.interface.ts` | `ApiErrorResponse` + `ApiError` interfaces |
| **Modify** | `common/filters/global-exception.filter.ts` | Refactor to emit standard shape |
| **Modify** | `shared/dto/error-response.dto.ts` | Update Swagger DTO to new shape |
| **Modify** | `main.ts` | Pass `nodeEnv` to filter constructor |
| **Create** | `common/filters/global-exception.filter.spec.ts` | Unit tests for filter |
| **Create** | `docs/api-errors.md` | Error format documentation |
