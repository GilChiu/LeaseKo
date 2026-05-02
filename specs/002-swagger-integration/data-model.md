# Data Model: Swagger (OpenAPI) Integration

**Feature**: `002-swagger-integration`
**Date**: 2026-05-02

---

## Scope

This feature introduces **no database tables or Prisma schema changes**. All data structures are in-memory TypeScript classes used for:

1. API response serialization (response DTOs)
2. Swagger schema documentation
3. Runtime validation (via `ValidationPipe`)

---

## DTO Definitions

### ErrorResponseDto

**Location**: `apps/api/src/shared/dto/error-response.dto.ts`
**Purpose**: Reusable error envelope. Mirrors the shape produced by NestJS's built-in `HttpException` filter. Referenced by all endpoint error response decorators.

| Field        | Type     | Required | Description                      | Example                             |
| ------------ | -------- | -------- | -------------------------------- | ----------------------------------- |
| `statusCode` | `number` | Yes      | HTTP status code                 | `401`                               |
| `message`    | `string` | Yes      | Short human-readable description | `"Unauthorized"`                    |
| `error`      | `string` | No       | Additional detail or error code  | `"Missing or invalid Bearer token"` |

**Used by**: `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiNotFoundResponse` on all controllers.

---

### HealthResponseDto

**Location**: `apps/api/src/modules/health/presentation/dto/health-response.dto.ts`
**Purpose**: Documents the response shape of `GET /health`. Response only — not a request body.

| Field       | Type     | Required | Description                        | Example                      |
| ----------- | -------- | -------- | ---------------------------------- | ---------------------------- |
| `status`    | `string` | Yes      | API liveness status                | `"ok"`                       |
| `timestamp` | `string` | Yes      | ISO 8601 timestamp of the response | `"2026-05-02T12:00:00.000Z"` |

**Used by**: `@ApiOkResponse` on `HealthController.check()`.

---

### MeResponseDto

**Location**: `apps/api/src/modules/system/presentation/dto/me-response.dto.ts`
**Purpose**: Documents the response shape of `GET /me`. Represents the authenticated caller's identity context extracted from the Bearer token. In this phase the values are stubs; Epic 2 replaces them with real Clerk-derived values.

| Field      | Type     | Required | Description                                         | Example           |
| ---------- | -------- | -------- | --------------------------------------------------- | ----------------- |
| `userId`   | `string` | Yes      | Clerk user ID of the authenticated caller           | `"user_abc123"`   |
| `tenantId` | `string` | Yes      | Tenant ID derived from the Clerk organisation claim | `"tenant_xyz789"` |

**Note**: `tenantId` is derived exclusively from the JWT — it is never a manual input. This field must not appear in any request DTO or Swagger UI input form.

**Used by**: `@ApiOkResponse` on `SystemController.me()`.

---

## Runtime Context Shape

The `StubBearerGuard` (and, in Epic 2, the real Clerk guard) attaches the following object to `request.user`. This is not a persisted entity — it exists only for the lifetime of a single HTTP request:

| Field      | Type     | Source (this phase)  | Source (Epic 2)          |
| ---------- | -------- | -------------------- | ------------------------ |
| `userId`   | `string` | Hardcoded stub value | Clerk JWT `sub` claim    |
| `tenantId` | `string` | Hardcoded stub value | Clerk JWT `org_id` claim |

---

## Future Data Model Preview

The following are introduced in subsequent features and referenced here for structural awareness only — **not implemented in this phase**:

- **Epic 2 (Clerk Auth)**: The real `userId` and `tenantId` will be extracted from verified Clerk JWTs. The `request.user` shape above is designed to match the Clerk JWT structure so controllers need no changes.
- **Epic 4 (Prisma)**: A `User` entity and a `Tenant` entity will be persisted. The `userId` and `tenantId` values from request context will become foreign keys against those entities.

---

## Notes

- No migrations exist after this feature.
- No Prisma client usage in this feature.
- `ErrorResponseDto`, `HealthResponseDto`, and `MeResponseDto` are TypeScript classes (not interfaces) — required for `ValidationPipe` and `SwaggerModule` TypeScript reflection to work at runtime.
