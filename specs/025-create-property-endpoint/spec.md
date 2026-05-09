# Feature Specification: Create Property Use Case & API Endpoint

**Feature Branch**: `025-create-property-endpoint`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Implement the Create Property backend flow in the NestJS API — CreateProperty use case, CreateProperty DTO, POST /properties endpoint, validation rules, Swagger documentation, tenant isolation, and Sprint 2 backlog update."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Authenticated Tenant User Can Create a Property (Priority: P1)

A landlord who is authenticated and has an active tenant context submits a POST request to create a property. The backend validates the request body, reads the tenant context from the verified JWT, creates the property under that tenant, and returns a 201 response with the created property details.

**Why this priority**: This is the core deliverable of the feature. Without it, no property management functionality exists. All subsequent property API operations depend on a property being creatable.

**Independent Test**: Send a valid authenticated POST request with a well-formed body to POST /properties. Confirm a 201 response is returned with the property data matching the submitted fields and the correct tenantId from the session — not from the body.

**Acceptance Scenarios**:

1. **Given** an authenticated user with a valid Clerk JWT and active tenant context, **When** they POST to `/api/v1/properties` with a valid body, **Then** they receive a 201 response with the created property data including `id`, `name`, `addressLine1`, `city`, `country`, `propertyType`, `createdAt`, and `updatedAt`
2. **Given** a valid request, **When** the property is created, **Then** the property is stored with the `tenantId` from the verified request context — not from any value in the request body
3. **Given** a valid request, **When** the property is created, **Then** the returned property does not include fields from other tenants and is queryable only within the same tenant context
4. **Given** an authenticated user submits a request with optional fields (`addressLine2`, `state`, `postalCode`, `description`) omitted, **When** the request is processed, **Then** those fields default to `null` and the property is still created successfully

---

### User Story 2 - Invalid Request Body is Rejected with a Structured Error (Priority: P2)

A user submits a POST request with missing required fields or fields that exceed allowed lengths. The API rejects the request with a 400 status and a structured validation error response that identifies the specific fields that failed validation — without exposing internal database details.

**Why this priority**: Input validation is essential for data integrity and user experience. Without it, malformed data could reach the database or cause unhandled errors.

**Independent Test**: POST to `/api/v1/properties` with a missing `name` field. Confirm a 400 response is returned with an error message identifying `name` as a required field. Repeat for `addressLine1`, `city`, `country`, and `propertyType`.

**Acceptance Scenarios**:

1. **Given** a request body missing the `name` field, **When** POST /api/v1/properties is called, **Then** the response is 400 with a validation error indicating `name` is required
2. **Given** a request body where `name` exceeds 120 characters, **When** the request is submitted, **Then** the response is 400 with a validation error for `name`
3. **Given** a request body missing `country`, **When** the request is submitted, **Then** the response is 400 with a validation error for `country`
4. **Given** a completely empty request body, **When** the request is submitted, **Then** the response is 400 listing all required fields that are missing
5. **Given** a request with an extra field `tenantId` in the body, **When** processed, **Then** the `tenantId` from the body is ignored and the tenant context value is used instead

---

### User Story 3 - Unauthenticated or Tenant-less Requests Are Rejected (Priority: P3)

A request without a valid Clerk JWT, or with a JWT that lacks tenant context, is rejected before any business logic executes. No property is created, and no internal system details are leaked.

**Why this priority**: Security enforcement must be airtight. If unauthenticated or tenant-less requests could reach the use case, tenant isolation would be broken.

**Independent Test**: POST to `/api/v1/properties` without an Authorization header. Confirm 401. POST with a valid JWT but without an active organization/tenant context. Confirm 403.

**Acceptance Scenarios**:

1. **Given** a request with no Authorization header, **When** POST /api/v1/properties is called, **Then** the response is 401 Unauthorized
2. **Given** a request with an invalid or expired Clerk JWT, **When** POST /api/v1/properties is called, **Then** the response is 401 Unauthorized
3. **Given** a request with a valid JWT but no tenant/organization context, **When** the request is processed, **Then** the response is 403 Forbidden
4. **Given** POST /api/v1/properties is called by a correctly authenticated tenant user, **When** the property is created, **Then** the property is associated with that tenant's `tenantId` only — another tenant cannot access or retrieve it

---

### Edge Cases

- What happens when `create()` is called and the `tenantId` does not match an existing tenant in the database? → PostgreSQL FK constraint violation; the repository allows the error to propagate; the global exception filter normalizes it to 500 (since this indicates a system data inconsistency, not a user error)
- What happens when the same property name is submitted twice for the same tenant? → No uniqueness constraint on `name` — both records are created (deduplication is a future concern)
- What happens when optional fields are sent as empty strings? → Validation rules apply `@IsOptional()` + `@IsString()` + `@MaxLength()` — empty strings pass length validation; consider whether `@IsNotEmpty()` should also apply to optional fields (decision: optional fields may be null/undefined but if provided must be non-empty strings)
- What happens when the request body includes `tenantId`? → The field is not present on `CreatePropertyDto`; NestJS `ValidationPipe` with `whitelist: true` strips it silently

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose a `POST /api/v1/properties` endpoint that creates a new property record
- **FR-002**: The endpoint MUST require a valid Clerk JWT — unauthenticated requests MUST receive 401
- **FR-003**: The endpoint MUST require an active tenant context — requests without tenant context MUST receive 403
- **FR-004**: The `tenantId` MUST be sourced exclusively from the verified request context — never from the request body, query parameters, or custom headers
- **FR-005**: A `CreatePropertyUseCase` MUST exist in the application layer and MUST NOT import `PrismaService` or any Prisma-generated types
- **FR-006**: `CreatePropertyUseCase` MUST depend on `PropertyRepository` through the `PROPERTY_REPOSITORY` DI token
- **FR-007**: A `CreatePropertyDto` MUST exist in the presentation layer with `class-validator` decorators enforcing field-level validation rules
- **FR-008**: `CreatePropertyDto` MUST NOT include a `tenantId` field
- **FR-009**: Required fields in `CreatePropertyDto`: `name`, `addressLine1`, `city`, `country`, `propertyType`
- **FR-010**: Optional fields in `CreatePropertyDto`: `addressLine2`, `state`, `postalCode`, `description`
- **FR-011**: A `PropertyResponseDto` MUST exist and map the domain `Property` entity to a response-safe shape
- **FR-012**: A `PropertiesController` MUST exist in the presentation layer, expose `POST /properties`, and delegate all business logic to `CreatePropertyUseCase`
- **FR-013**: The controller MUST NOT use `PrismaService` directly
- **FR-014**: The endpoint MUST be documented with Swagger decorators including `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiCreatedResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`
- **FR-015**: `PropertiesModule` MUST be updated to provide `CreatePropertyUseCase` and declare `PropertiesController`
- **FR-016**: The global `ValidationPipe` (configured with `whitelist: true`) MUST strip unknown fields including any `tenantId` submitted in the body

### Key Entities

- **Property** (domain entity): Already defined in Feature 024 — `id`, `tenantId`, `name`, `addressLine1`, `addressLine2?`, `city`, `state?`, `postalCode?`, `country`, `propertyType`, `description?`, `createdAt`, `updatedAt`, `deletedAt?`
- **CreatePropertyDto** (presentation): Request body shape — all fields except `tenantId`. Decorated with `class-validator` rules.
- **PropertyResponseDto** (presentation): Response body shape — all safe-to-expose fields from `Property`. Used in Swagger documentation and as controller return type.
- **CreatePropertyUseCase** (application): Receives `tenantId` + DTO fields, calls `PropertyRepository.create()`, returns `Property`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `POST /api/v1/properties` with valid auth + tenant + body returns 201 in under 500ms
- **SC-002**: `POST /api/v1/properties` without an Authorization header returns 401
- **SC-003**: `POST /api/v1/properties` without tenant context returns 403
- **SC-004**: `POST /api/v1/properties` with a missing required field returns 400 with a field-level error message
- **SC-005**: `pnpm --filter @leaseKo/api build` exits with code 0 — TypeScript compiles without errors
- **SC-006**: `pnpm --filter @leaseKo/api test` exits with code 0 — all existing tests continue to pass
- **SC-007**: Swagger UI at `/api/docs` shows POST /properties with Bearer auth, request body schema, and all documented response codes
- **SC-008**: A grep for `@prisma/client` in the `application/` and `presentation/` layers of the `properties` module returns zero import matches

## Assumptions

- Feature 024 is complete: `Property` domain entity, `PropertyRepository` interface, `PROPERTY_REPOSITORY` token, `PrismaPropertyRepository`, and `PropertiesModule` are already in place
- The global `ValidationPipe` is configured with `whitelist: true` and `transform: true` — extra fields including `tenantId` are stripped from request bodies
- The global `ClerkJwtGuard` is the `APP_GUARD` — all endpoints are protected by default; no `@Public()` decorator needed (and must NOT be added)
- The `@CurrentTenant()` decorator (or equivalent) is available in the NestJS request context to extract `tenantId` from the verified JWT
- The Swagger module is configured at `/api/docs` with Bearer auth already set up in the Swagger config
- `propertyType` is stored as a plain `String` in the Prisma model — no enum validation is enforced at the DB level; the DTO accepts any non-empty string for now (enum validation is a future enhancement)
- The global exception filter handles `PrismaClientKnownRequestError` and maps it to appropriate HTTP responses where applicable
- `tenantId` will be included in `PropertyResponseDto` for API transparency (consistent with how the existing `User` response exposes `clerkId` etc.)
