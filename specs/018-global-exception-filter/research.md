# Research: Global Exception Filter and Standard API Error Responses

**Feature**: 018-global-exception-filter
**Branch**: `018-global-exception-filter`
**Date**: 2026-05-06

## Decision Log

### D-001: Refactor existing `GlobalExceptionFilter` in-place — do not create a new file

- **Decision**: Refactor `apps/api/src/common/filters/global-exception.filter.ts` in-place. Keep the class name `GlobalExceptionFilter` and file path unchanged.
- **Rationale**: `main.ts` already registers `new GlobalExceptionFilter()`. Changing the file or class name would require updating imports with zero benefit. The existing filter is incomplete but structurally correct — it just lacks the standard response shape, error codes, validation normalization, and Prisma mapping.
- **Impact**: No `main.ts` registration change required.

---

### D-002: Pass `nodeEnv` to the filter constructor — do not use `@Injectable()` DI for the filter

- **Decision**: The filter is constructed with `new GlobalExceptionFilter()` in `main.ts` (not via NestJS DI). After feature 017, `ConfigService` is available via `app.get(ConfigService)`. Pass `nodeEnv` to the filter constructor: `new GlobalExceptionFilter(nodeEnv)`.
- **Rationale**: The filter needs `nodeEnv` to decide whether to include original error messages (dev) or the generic message (prod). Since the filter is instantiated with `new`, it cannot use `@Inject()`. Passing the already-resolved value from `ConfigService` is clean and simple.
- **Alternatives Considered**:
  - Register via `APP_FILTER` provider to enable DI: Would require removing `app.useGlobalFilters()` from `main.ts` and adding a provider to `AppModule`. More complex for no additional benefit at this stage.
  - Read `process.env.NODE_ENV` directly inside the filter: Bypasses the config layer established in feature 017. Rejected.
- **Impact**: `main.ts` changes from `new GlobalExceptionFilter()` to `new GlobalExceptionFilter(nodeEnv)`.

---

### D-003: Create `ErrorCode` as a `const` object (not a TypeScript `enum`)

- **Decision**: Use a `const` object with `as const` assertion: `export const ErrorCode = { VALIDATION_ERROR: 'VALIDATION_ERROR', ... } as const;` plus a derived type `export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];`.
- **Rationale**: TypeScript `enum` compiles to a runtime object with numeric reverse-mapping overhead and makes tree-shaking harder. A `const` object with `as const` gives the same type safety, works identically at runtime, and serializes to plain strings naturally (important for JSON responses). This is the modern TypeScript idiomatic pattern.
- **Alternatives Considered**:
  - `enum ErrorCode { ... }`: Worse serialization behavior; numeric reverse mapping confusing. Rejected.
  - Plain string literals: No compile-time safety for error code values. Rejected.
- **Impact**: New file `apps/api/src/common/errors/error-codes.ts`.

---

### D-004: `ApiErrorResponse` as a TypeScript interface in `common/types/` — update `ErrorResponseDto` in `shared/dto/`

- **Decision**: Create the TypeScript interface `ApiErrorResponse` in `apps/api/src/common/types/api-error-response.interface.ts` for internal type-checking. Update `apps/api/src/shared/dto/error-response.dto.ts` (the Swagger DTO) to match the new standard shape.
- **Rationale**: The Swagger `ErrorResponseDto` is already used in controller decorators (`@ApiUnauthorizedResponse({ type: ErrorResponseDto })`). It currently has `{ statusCode, message, error? }` — this no longer matches the new shape. Updating it keeps the Swagger spec accurate. The pure TypeScript interface (`ApiErrorResponse`) is for filter internals and does not need `@ApiProperty` decorators.
- **Impact**: Both files updated. Controllers referencing `ErrorResponseDto` will automatically reflect the new shape in the Swagger UI.

---

### D-005: Prisma error mapping — safety-net in global filter, NOT replacing existing repository handling

- **Decision**: Add a `mapPrismaError()` utility in `apps/api/src/common/errors/prisma-error.mapper.ts` that detects `PrismaClientKnownRequestError` instances and maps them to `{ status, code, message }`. This is registered in the global filter as a safety net for any raw Prisma errors that escape the repository layer.
- **Rationale**: Existing repositories handle P2002 by throwing a plain `Error("... already exists")` — not a NestJS `ConflictException`. These plain `Error` instances currently hit the generic `500` handler in the existing filter. The Prisma mapper catches them at the filter level and maps them to correct HTTP codes. This is cleaner than requiring every future repository to remember to map every Prisma error code.
- **Alternatives Considered**:
  - Update each repository to throw NestJS exceptions instead of plain `Error`: Cleaner at the repository layer, but would require touching 3 existing repository files. Could be done as a follow-up.
  - Skip Prisma mapping in the filter entirely: The existing plain `Error` throws from repositories would hit `500 INTERNAL_SERVER_ERROR` — wrong status code for a uniqueness conflict. Rejected.
- **Impact**: New file `apps/api/src/common/errors/prisma-error.mapper.ts`. Existing repositories are unchanged.

---

### D-006: Validation error normalization uses the `ValidationPipe` default output — no pipe config changes

- **Decision**: NestJS `ValidationPipe` already produces `BadRequestException` with an array `message` field (from `class-validator`). The filter detects the array format and normalizes it into `{ code: "VALIDATION_ERROR", details: { fields: [...] } }`. No `ValidationPipe` config changes required.
- **Rationale**: The `ValidationPipe` currently produces messages like `["email must be an email", "name should not be empty"]`. The filter can parse these into field-keyed objects. The format from `class-validator` includes the field name in the message string (e.g., `"email must be an email"`) — extracting the field name from the message string is straightforward.
- **Alternatives Considered**:
  - Use `exceptionFactory` in `ValidationPipe` to produce a custom exception: More precise field extraction, but changes the validation pipe registration in `main.ts` and creates a dependency between `ValidationPipe` config and the filter. Deferred to a future testing/API-quality feature.
- **Impact**: Filter detects `Array.isArray(exceptionBody.message)` → produces `VALIDATION_ERROR` shape.

---

### D-007: No `requestId` support in this feature — optional field left as `undefined`

- **Decision**: The `requestId` field is defined as optional in `ApiErrorResponse` but never populated by this feature. Request ID middleware does not exist yet.
- **Rationale**: Building request ID middleware is a separate concern (observability). The interface can include the optional field without implementing it — future middleware can populate it when added.
- **Impact**: `requestId?: string` in `ApiErrorResponse` interface. Never included in actual responses until middleware is added.

---

### D-008: Unit test for the refactored filter

- **Decision**: Add a unit test file `apps/api/src/common/filters/global-exception.filter.spec.ts` covering the key scenarios: HttpException normalization, validation error, unknown error (prod vs dev), and Prisma mapping.
- **Rationale**: The filter is critical infrastructure. A unit test catches regressions when the filter is modified. Existing 3 test suites only cover `health.controller`, `get-current-user.use-case`, and `tenant-filter.util`. Adding the filter spec brings the suite to 4 and covers a P1 concern.
- **Impact**: New test file. Existing tests unaffected.

---

## Current State Summary

| Item | State | Action |
|---|---|---|
| `GlobalExceptionFilter` | Exists — returns `{ statusCode, message, error? }` | Refactor in-place |
| `ErrorCode` registry | Does not exist | Create `common/errors/error-codes.ts` |
| `ApiErrorResponse` interface | Does not exist | Create `common/types/api-error-response.interface.ts` |
| `ErrorResponseDto` (Swagger) | Exists — old shape `{ statusCode, message, error? }` | Update to new shape |
| `PrismaErrorMapper` | Does not exist | Create `common/errors/prisma-error.mapper.ts` |
| `common/errors/` directory | Does not exist | Create |
| `main.ts` filter registration | `new GlobalExceptionFilter()` | Change to `new GlobalExceptionFilter(nodeEnv)` |
| Unit test for filter | Does not exist | Create `global-exception.filter.spec.ts` |

---

## Standard Error Response Shape (Finalized)

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    timestamp: string;  // ISO 8601
    path: string;
    details?: {
      fields?: Array<{ field: string; messages: string[] }>;
    };
    requestId?: string;  // populated when request ID middleware is added
  };
}
```

**Example — validation error:**
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
        { "field": "name", "messages": ["name should not be empty"] }
      ]
    }
  }
}
```

**Example — production 500:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "statusCode": 500,
    "timestamp": "2026-05-06T12:00:00.000Z",
    "path": "/api/v1/tenants"
  }
}
```

---

## HTTP Status → ErrorCode Mapping Table

| Exception Class | HTTP Status | ErrorCode |
|---|---|---|
| `BadRequestException` (non-validation) | 400 | `BAD_REQUEST` |
| `BadRequestException` (array message = validation) | 400 | `VALIDATION_ERROR` |
| `UnauthorizedException` | 401 | `UNAUTHORIZED` |
| `ForbiddenException` | 403 | `FORBIDDEN` |
| `NotFoundException` | 404 | `NOT_FOUND` |
| `ConflictException` | 409 | `CONFLICT` |
| `InternalServerErrorException` | 500 | `INTERNAL_SERVER_ERROR` |
| Any other `HttpException` | (status from exception) | `BAD_REQUEST` (fallback) |
| `PrismaClientKnownRequestError` P2002 | 409 | `CONFLICT` |
| `PrismaClientKnownRequestError` P2025 | 404 | `NOT_FOUND` |
| `PrismaClientKnownRequestError` P2003 | 409 | `CONFLICT` |
| `PrismaClientInitializationError` | 503 | `SERVICE_UNAVAILABLE` |
| Unknown `Error` | 500 | `INTERNAL_SERVER_ERROR` |

---

## Logging Rules

| Scenario | Log Level | What to log |
|---|---|---|
| 5xx unhandled error | `error` | `method`, `path`, `statusCode`, `error.name`, `error.message`, stack (dev only in log) |
| 4xx HttpException | None (default) | Skip — expected client errors |
| Prisma known error mapped to 4xx | None | Skip — handled gracefully |
| Prisma unknown error | `error` | Same as unhandled 5xx |

Secret exclusions: Authorization headers, token values, passwords, raw JWT claims — NEVER logged.
