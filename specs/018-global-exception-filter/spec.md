# Feature Specification: Global Exception Filter and Standard API Error Responses

**Feature Branch**: `018-global-exception-filter`
**Created**: 2026-05-06
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Frontend developer receives predictable, structured error responses from every endpoint (Priority: P1)

A frontend developer is building the login form. When the user submits invalid data, the frontend receives a consistent JSON error response with a machine-readable `code`, a human-readable `message`, and field-level `details` — regardless of which endpoint was called. The developer can write a single error-handling utility for the entire application.

**Why this priority**: Inconsistent error shapes force the frontend to guess the structure of every response. A single standard shape is the most fundamental contract the backend provides to the client.

**Independent Test**: Call any API endpoint with intentionally invalid input (e.g., missing required field). Verify the response body always has the shape `{ success: false, error: { code, message, statusCode, timestamp, path } }`.

**Acceptance Scenarios**:

1. **Given** a POST request with an invalid body (missing required field), **When** the endpoint is called, **Then** the response is `400` with body `{ success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: { fields: [...] }, statusCode: 400, timestamp: "...", path: "..." } }`.
2. **Given** an authenticated request to a non-existent route, **When** the endpoint is called, **Then** the response is `404` with `{ success: false, error: { code: "NOT_FOUND", message: "...", statusCode: 404, timestamp: "...", path: "..." } }`.
3. **Given** a request to a protected endpoint with no token, **When** the endpoint is called, **Then** the response is `401` with `{ success: false, error: { code: "UNAUTHORIZED", statusCode: 401, ... } }`.
4. **Given** a request to a tenant-protected endpoint with a valid token but no tenant context, **When** the endpoint is called, **Then** the response is `403` with `{ success: false, error: { code: "FORBIDDEN", statusCode: 403, ... } }`.
5. **Given** any two different endpoints that both return errors, **When** the frontend receives both responses, **Then** both responses share the same top-level shape.

---

### User Story 2 — Security engineer reviews the API and confirms no sensitive information leaks through error responses in production (Priority: P1)

A security engineer calls an endpoint that triggers an unexpected database error in production. The response is a generic `500` with a safe message — no stack trace, no SQL query details, no Prisma internals, no environment values. The actual error is logged server-side with full context for debugging.

**Why this priority**: Leaking internal errors is an OWASP Top 10 risk. This is a P1 security gate — production deployments must never expose internals.

**Independent Test**: Trigger an unhandled exception (e.g., throw `new Error("raw crash")` from a test endpoint). In production mode, verify the client receives only `{ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred", statusCode: 500, ... } }` — no stack trace, no internal message.

**Acceptance Scenarios**:

1. **Given** an unhandled exception is thrown in a service, **When** in production mode (`NODE_ENV=production`), **Then** the client receives `500` with a generic message and no stack trace.
2. **Given** a Prisma unique constraint violation occurs (e.g., duplicate email), **When** the exception propagates, **Then** the client receives `409 Conflict` with `code: "CONFLICT"` — no raw Prisma error message, no SQL detail.
3. **Given** a Prisma record-not-found error occurs, **When** the exception propagates, **Then** the client receives `404 Not Found` — no Prisma error name visible to the client.
4. **Given** an unhandled exception in development mode, **When** the server logs the error, **Then** the full stack trace and error context appear in the server log.
5. **Given** a `401 Unauthorized` from the Clerk JWT guard, **When** the exception is caught, **Then** the response contains no JWT claims, no token fragments, no Clerk API details.

---

### User Story 3 — Backend developer writes a new use case and throws a domain error without writing custom HTTP response logic (Priority: P2)

A backend developer implements a `CreateLease` use case. When a business rule is violated (e.g., unit is already occupied), the use case throws a `ConflictException`. The global filter automatically maps this to a `409` response in the standard shape — the developer writes no HTTP response code in the use case or controller.

**Why this priority**: The filter's value multiplies as more modules are added. Ensuring thin controllers and standard throws is P2 — dependent on P1 infrastructure being in place.

**Independent Test**: Throw `new ConflictException("Unit is already occupied")` from a test use case. Verify the response is `409` with `{ success: false, error: { code: "CONFLICT", message: "Unit is already occupied", statusCode: 409, ... } }`.

**Acceptance Scenarios**:

1. **Given** a use case throws `new ConflictException("message")`, **When** the request reaches the filter, **Then** the response is `409` with `code: "CONFLICT"` and `message: "message"`.
2. **Given** a use case throws `new NotFoundException("Resource not found")`, **When** the request reaches the filter, **Then** the response is `404` with `code: "NOT_FOUND"`.
3. **Given** an infrastructure service throws `new BadRequestException("Invalid input")`, **When** the request reaches the filter, **Then** the response is `400` with `code: "BAD_REQUEST"`.
4. **Given** a validation pipe rejects the request body, **When** the exception is caught, **Then** field-level validation messages appear in `error.details.fields` as an array of `{ field, messages }` objects.

---

### User Story 4 — Developer adds a new error code for a domain-specific scenario (Priority: P3)

A developer needs a custom error code `TENANT_CONTEXT_REQUIRED` for requests missing tenant context. They find a central error codes file, add their code, and throw a `ForbiddenException` with the code as metadata — the filter picks it up and includes it in the response.

**Why this priority**: Extensibility without structural changes is nice-to-have but not blocking. The standard HTTP codes cover most scenarios; custom codes are incremental.

**Independent Test**: Add `TENANT_CONTEXT_REQUIRED` to the error codes registry and throw a `ForbiddenException` with it. Verify the response `code` field reflects the custom code.

**Acceptance Scenarios**:

1. **Given** a centralized error codes file/enum exists, **When** a developer adds a new code, **Then** they can use it from any module without modifying the filter logic.
2. **Given** a `ForbiddenException` is thrown with a domain-specific code in its payload, **When** the filter catches it, **Then** the response `error.code` reflects the custom code rather than the generic `FORBIDDEN`.
3. **Given** no custom code is provided, **When** the filter catches a `ForbiddenException`, **Then** the response `error.code` defaults to `FORBIDDEN`.

---

### Edge Cases

- What if an exception is thrown outside the HTTP request lifecycle (e.g., in a BullMQ job)? → The global filter only handles HTTP exceptions; job errors are handled separately. This feature does not cover non-HTTP errors.
- What if a `ValidationPipe` error has no field details (e.g., a simple string message)? → The filter normalizes it as a flat `message` without `details.fields`.
- What if a Prisma error type is not in the mapping table? → Fall through to the generic `500 INTERNAL_SERVER_ERROR` handler with server-side logging.
- What if `request.url` is not available (e.g., non-HTTP context)? → Use `"unknown"` as the `path` fallback — the filter must not throw on missing context.
- What if the response has already been sent when the filter runs? → Check `response.headersSent` and skip sending a second response.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All API error responses MUST share a single standard shape: `{ success: false, error: { code, message, statusCode, timestamp, path } }`.
- **FR-002**: `error.details` MUST be included only when safe, structured information is available (e.g., validation field errors). It MUST be omitted when empty.
- **FR-003**: The global exception filter MUST catch ALL thrown exceptions — including `HttpException`, validation pipe errors, Prisma errors, and unhandled `Error` instances.
- **FR-004**: `HttpException` subclasses MUST be mapped to their corresponding HTTP status codes and stable error codes (e.g., `400 → BAD_REQUEST`, `401 → UNAUTHORIZED`, `403 → FORBIDDEN`, `404 → NOT_FOUND`, `409 → CONFLICT`, `500 → INTERNAL_SERVER_ERROR`).
- **FR-005**: Validation pipe errors (`400 BadRequestException` with array message) MUST be normalized into `{ code: "VALIDATION_ERROR", details: { fields: [{ field, messages }] } }`.
- **FR-006**: In production (`NODE_ENV=production`), unhandled exceptions MUST return `{ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred", statusCode: 500 }` — no stack trace, no internal message.
- **FR-007**: In development (`NODE_ENV!=production`), unhandled exceptions MAY include the original `message` in the response for easier debugging, but MUST NOT include raw stack traces in the response body.
- **FR-008**: All unhandled exceptions MUST be logged server-side with: HTTP method, path, status code, error name, and error message. Stack traces MUST be logged in development but MUST NOT be logged in production response bodies.
- **FR-009**: Common Prisma errors MUST be mapped to safe HTTP responses: unique constraint violation → `409`, record not found → `404`, connection error → `503`. Raw Prisma error messages MUST NOT reach the client.
- **FR-010**: A stable error code registry (enum or constant object) MUST exist as the single source of truth for all error codes used across the backend.
- **FR-011**: The global filter MUST be registered in `main.ts` (already done via `app.useGlobalFilters(new GlobalExceptionFilter())`); this registration MUST be preserved.
- **FR-012**: Error responses MUST include `timestamp` (ISO 8601 string) and `path` (request URL) on every error.
- **FR-013**: The existing `GlobalExceptionFilter` class MUST be refactored in place — its file path and class name MUST remain unchanged so `main.ts` registration is unaffected.

### Key Entities

- **ApiErrorResponse**: The standard TypeScript interface for all error response bodies.
- **ErrorCode**: A registry of stable uppercase snake_case error code strings.
- **GlobalExceptionFilter**: The `@Catch()` NestJS exception filter that intercepts all exceptions and produces `ApiErrorResponse`.
- **PrismaErrorMapper**: A helper function/utility that maps Prisma-specific error codes to safe HTTP status + `ErrorCode` values.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Calling any endpoint with invalid input consistently returns a response matching the standard shape — verifiable by a single shared response shape check across all error scenarios.
- **SC-002**: A production-mode unhandled exception returns `500` with `message: "An unexpected error occurred"` and zero stack trace content in the response body.
- **SC-003**: All existing tests continue to pass (100% pass rate) — verifiable by test runner output.
- **SC-004**: The backend builds successfully (`pnpm --filter @leaseKo/api build` exits 0) after all changes.
- **SC-005**: A validation error on a DTO field includes the field name and message in `error.details.fields` — verifiable by sending a request with a missing required field.
- **SC-006**: A Prisma unique constraint violation returns `409` with `code: "CONFLICT"` and no database internals in the response body.
- **SC-007**: The error code registry contains at minimum: `VALIDATION_ERROR`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`, `SERVICE_UNAVAILABLE`, `TENANT_CONTEXT_REQUIRED`.
- **SC-008**: Server logs include method, path, status code, and error name for every `5xx` response — verifiable by log output during test.

---

## Assumptions

- The existing `GlobalExceptionFilter` at `apps/api/src/common/filters/global-exception.filter.ts` is the target for refactoring — it already handles `HttpException` and unknown errors but lacks the standard shape, error codes, structured validation errors, and Prisma mapping.
- `app.useGlobalFilters(new GlobalExceptionFilter())` registration in `main.ts` is already in place — no change needed.
- `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` is already registered globally in `main.ts` — validation errors are already `BadRequestException` with an array message body from `class-validator`.
- Prisma (`@prisma/client`) is already installed — Prisma error mapping should be implemented (not just stubbed).
- `NestJS Logger` is already available — no external logging library is required for this feature.
- `requestId` middleware does not yet exist — the `requestId` field in error responses is omitted for now (left as optional future addition).
- Stack traces are never included in response bodies (production or development) — development gets the original error message, production gets the generic message.
- Test files (`.spec.ts`) are permitted to use `process.env` and NestJS testing utilities — no constraint from feature 017 applies here.
