# Feature Specification: NestJS API Foundation Setup

**Feature Branch**: `004-nestjs-api-setup`
**Created**: 2026-05-02
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer Runs and Verifies the API (Priority: P1)

As a developer, I want to start the NestJS API locally using a single command and immediately confirm it is running by calling the health endpoint.

**Why this priority**: This is the foundational capability — no other development work is possible until the API starts and responds correctly.

**Independent Test**: Run `pnpm dev` from the monorepo root; call `GET /api/v1/health`; receive a structured JSON response confirming the API is up.

**Acceptance Scenarios**:

1. **Given** the developer has copied `.env.example` to `.env`, **When** they run `pnpm dev`, **Then** the API starts on the configured port with no errors logged.
2. **Given** the API is running, **When** a client sends `GET /api/v1/health`, **Then** the response is HTTP 200 with `{ "status": "ok", "service": "api", "timestamp": "<ISO date>" }`.
3. **Given** a required environment variable is missing, **When** the API starts, **Then** it exits immediately with a clear error message naming the missing variable.

---

### User Story 2 — Developer Builds and Lints the API (Priority: P1)

As a developer, I want the API to build and lint cleanly so that CI/CD pipelines can validate it at any time.

**Why this priority**: Build and lint health are table stakes for any shared codebase — failures block all team members.

**Independent Test**: Run `pnpm build` in `apps/api`; confirm exit code 0 and compiled output exists.

**Acceptance Scenarios**:

1. **Given** the source code is valid TypeScript, **When** `pnpm build` runs, **Then** the build exits with code 0 and produces a compiled output directory.
2. **Given** the source code follows the linting rules, **When** `pnpm lint` runs, **Then** zero errors and zero warnings are reported.
3. **Given** the monorepo root, **When** `turbo build` runs, **Then** the API is included in the build graph and builds successfully.

---

### User Story 3 — Developer Works in a Clean Architecture (Priority: P2)

As a developer, I want the backend organized into well-defined layers so that business logic, data access, and HTTP handling are clearly separated across every module.

**Why this priority**: Architecture decisions made at setup time are hard to change later; correct separation prevents cross-cutting coupling in all future feature modules.

**Independent Test**: Inspect `apps/api/src/`; verify each business module contains four architecture layers; verify no controller imports data access code directly.

**Acceptance Scenarios**:

1. **Given** a developer adds a new feature, **When** they look at any business module, **Then** they find four subdirectories: `domain`, `application`, `infrastructure`, and `presentation`.
2. **Given** the project conventions are established, **When** a developer needs to add a use case, domain rule, repository, or controller, **Then** the correct layer is immediately apparent from the folder structure.
3. **Given** a developer inspects the `common/` directory, **When** they need a reusable decorator, guard, filter, or pipe, **Then** they find a dedicated subdirectory for each category.

---

### User Story 4 — Developer Handles Errors Consistently (Priority: P2)

As a developer, I want all API errors to return a standardized JSON envelope so that the frontend always knows what shape to expect.

**Why this priority**: Inconsistent error shapes force the frontend to special-case multiple formats — standardizing early prevents this technical debt across every feature.

**Independent Test**: Send an invalid request (missing required field) and a request to a non-existent route; confirm both return the same JSON error structure.

**Acceptance Scenarios**:

1. **Given** a request fails payload validation, **When** the API responds, **Then** the body is `{ "statusCode": number, "message": string, "error": string }`.
2. **Given** an unhandled exception occurs at runtime, **When** the API responds, **Then** a 500 response uses the same error shape and the raw stack trace is never exposed to the client.
3. **Given** a non-existent route is requested, **When** the API responds, **Then** a 404 response uses the standard error shape.

---

### User Story 5 — Developer Integrates Future Services (Priority: P3)

As a developer, I want database, queue, and authentication integration points scaffolded so that future tasks have clearly defined entry points and follow established conventions.

**Why this priority**: Scaffolded placeholders communicate intended architecture to the whole team and prevent ad-hoc integration patterns.

**Independent Test**: Inspect `apps/api/src/database/` and `apps/api/src/queues/`; confirm placeholder modules exist and are registered by the app module.

**Acceptance Scenarios**:

1. **Given** the database module is scaffolded, **When** a future Prisma task is implemented, **Then** only the infrastructure layer files need to change — the module entry point already exists.
2. **Given** the queue module is scaffolded, **When** a future BullMQ task adds a processor, **Then** the module entry point already exists.
3. **Given** the request context type is defined, **When** a controller needs the authenticated user's `userId` or `tenantId`, **Then** the TypeScript interface is already importable from `common/types`.

---

### Edge Cases

- What happens when the API starts without a `.env` file? → Startup MUST fail fast with a descriptive error naming the missing variables.
- What happens when a database connection cannot be established at startup? → The database placeholder module MUST NOT cause startup failure — actual connection is deferred to the Prisma integration task.
- What happens when an exception is thrown inside a background worker? → Out of scope for this feature; documented as a responsibility of the BullMQ integration task.
- What happens when the CORS origin is misconfigured? → All browser requests from the frontend will fail; the `FRONTEND_URL` environment variable MUST be clearly documented and validated.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The API MUST start successfully when all required environment variables are present.
- **FR-002**: The API MUST exit at startup with a descriptive error when any required environment variable is missing, naming the missing variable.
- **FR-003**: The API MUST expose a public `GET /api/v1/health` endpoint that returns a structured status response without authentication.
- **FR-004**: The API MUST reject requests with invalid payloads (missing required fields, wrong types) with a 400 response.
- **FR-005**: The API MUST strip unknown fields from incoming request payloads.
- **FR-006**: The API MUST return all errors using a consistent JSON envelope containing `statusCode`, `message`, and an optional `error` field.
- **FR-007**: The API MUST NOT expose raw stack traces or internal error details in any response.
- **FR-008**: The API MUST accept cross-origin requests from the configured frontend URL.
- **FR-009**: All business modules MUST be organized into `domain`, `application`, `infrastructure`, and `presentation` sub-layers.
- **FR-010**: No controller MUST directly import or use data access code; all data access MUST go through the infrastructure layer.
- **FR-011**: A `RequestContext` interface MUST define the shape of `userId`, `tenantId`, and `role` for future authenticated routes.
- **FR-012**: A database module placeholder MUST exist and be registered in the application module.
- **FR-013**: A queue module placeholder MUST exist and be registered in the application module.
- **FR-014**: A configuration module MUST centralize all environment variable access and validate required variables at startup.
- **FR-015**: All environment variables MUST be documented in a `.env.example` file at `apps/api/.env.example`.
- **FR-016**: The API MUST be runnable via Turborepo's `dev` and `build` pipeline commands from the monorepo root.
- **FR-017**: The `common/` directory MUST provide dedicated subdirectories for: config, decorators, filters, guards, interceptors, middleware, pipes, types, and utils.

### Key Entities

- **Request Context**: Carries `userId` (string), `tenantId` (string), and `role` (string) for every authenticated request. Attached to the request object by an auth guard.
- **Module**: A bounded unit of functionality with its own `domain`, `application`, `infrastructure`, and `presentation` layers. Each module owns its business logic entirely.
- **Configuration**: The validated set of environment variables governing API behavior — port, database URL, Redis URL, Clerk credentials, and frontend URL.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The API starts and the health endpoint responds in under 5 seconds on a developer machine.
- **SC-002**: `pnpm build` exits with code 0 and zero TypeScript errors.
- **SC-003**: `pnpm lint` exits with code 0 and zero warnings.
- **SC-004**: 100% of error responses (4xx and 5xx) conform to the standardized error envelope shape.
- **SC-005**: A developer can identify the correct layer for any type of code contribution (use case, repository, controller, domain rule) in under 30 seconds by inspecting the folder structure.
- **SC-006**: Startup fails within 2 seconds when a required environment variable is missing.
- **SC-007**: The API is reachable through `turbo dev` without any additional manual setup beyond copying `.env.example`.

---

## Assumptions

- The NestJS application already exists in `apps/api` with basic scaffolding (bootstrap, health endpoint, Swagger integration, global validation pipe) from Features 001 and 002; this feature formalizes and completes the missing foundation.
- Swagger/OpenAPI integration is already complete (Feature 002) and must not be broken.
- Clerk JWT verification is NOT implemented in this feature; the existing stub bearer guard from Feature 002 remains as the auth placeholder.
- Prisma database connection is NOT established in this feature; only a module placeholder and service shell are created.
- BullMQ queue workers are NOT created in this feature; only the module placeholder and connection configuration are scaffolded.
- The frontend URL for CORS is `http://localhost:3000` in development, controlled by the `FRONTEND_URL` environment variable.
- TypeScript strict mode is used throughout.
- The API runs on port 3001 in development, configurable via the `PORT` environment variable.
- The Docker Compose infrastructure (PostgreSQL, Redis) is defined but does not need to be running for the API to start in placeholder/stub mode.

---

## Dependencies

- **Feature 001 (Monorepo Init)**: pnpm + Turborepo workspace must be functional — already complete.
- **Feature 002 (Swagger Integration)**: Swagger is already configured; this feature must not break it.
- **Feature 003 (Next.js Web Setup)**: Frontend URL (`http://localhost:3000`) is the CORS origin for development.
- **Future: Prisma Integration**: The database module scaffolded here is the entry point for that task.
- **Future: BullMQ Integration**: The queue module scaffolded here is the entry point for that task.
- **Future: Clerk Auth Integration**: The request context types and auth module scaffolded here define the contract for that task.
