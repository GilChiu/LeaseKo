# Implementation Plan: Swagger (OpenAPI) Integration

**Branch**: `002-swagger-integration` | **Date**: 2026-05-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-swagger-integration/spec.md`

## Summary

Integrate `@nestjs/swagger` into the NestJS backend (`apps/api`) to produce a fully documented, contract-driven API. The integration covers: Swagger bootstrap in `main.ts` with conditional production disable; Bearer JWT security scheme for the Authorize button; a reusable `ErrorResponseDto` for consistent error envelopes; a `StubBearerGuard` stub for the `GET /me` endpoint (full Clerk JWT verification deferred to Epic 2); and complete decorator coverage on existing controllers and DTOs. The `GET /health` endpoint remains public; `GET /me` demonstrates protected-endpoint auth. Swagger UI is accessible at `/api/docs` in development only.

## Technical Context

**Language/Version**: TypeScript 5.x (NestJS 10)
**Primary Dependencies**: `@nestjs/swagger` (bundles `swagger-ui-express`), `class-validator`, `class-transformer` (for `ValidationPipe transform`)
**Storage**: N/A — no database changes in this feature
**Testing**: Manual verification via Swagger UI; no automated tests written in this phase
**Target Platform**: NestJS API in `apps/api` (established in feature 001)
**Project Type**: API documentation layer within existing monorepo
**Performance Goals**: Swagger UI loads in < 3 seconds locally; schema generation adds < 100ms to startup
**Constraints**: Swagger disabled in `NODE_ENV=production`; no business logic in Swagger setup; `tenant_id` never a manual input; `ignoreGlobalPrefix: true` to avoid double-prefixing with `/api/v1`; global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`
**Scale/Scope**: 2 controllers (HealthController, new SystemController for `/me`), 3 DTOs (HealthResponseDto, MeResponseDto, ErrorResponseDto), 1 guard (StubBearerGuard), 1 Swagger bootstrap update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Scope note**: This feature adds Swagger documentation and a stub for the `/me` endpoint. No Prisma, no DB tables, no BullMQ. Applicable checks all pass; N/A items are justified by feature scope.

**Architecture**
- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  — New DTOs live in `modules/system/presentation/`. The `StubBearerGuard` lives in `common/guards/`. No domain or application layers added (no business logic in this feature).
- [x] Domain layer imports no NestJS or Prisma packages
  — No domain layer added in this feature.
- [x] Controllers are thin — all logic delegated to use cases
  — `HealthController` returns a static object. `SystemController` (`/me`) returns a mock identity object from the guard-injected context. No logic delegated because there is no logic.
- [x] Cross-module interaction uses explicit interfaces or events only (no direct internal imports)
  — No cross-module interaction introduced.

**Multi-Tenancy (CRITICAL)**
- N/A All new DB tables include `tenant_id` column with index
  — No DB tables created.
- N/A All repository queries filter by `tenant_id` — no unscoped queries
  — No repository queries.
- N/A Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic
  — The `StubBearerGuard` injects a mock `userId` and `tenantId` into request context. Real enforcement is Epic 2 (Clerk). Stub pattern is explicitly documented in spec Assumptions.

**Authentication & Authorization**
- N/A Clerk JWT is verified against JWKS — client-supplied identity is never trusted
  — Clerk JWKS integration is deferred to Epic 2. This feature uses a stub guard that accepts any Bearer token. The stub is explicitly scoped in the spec.
- N/A Role/permission checks are enforced in backend guards, not in frontend
  — No role checks in this phase.

**Data Layer**
- N/A All DB access goes through repository interfaces
  — No DB access.
- N/A Prisma schema changes include `tenant_id` index
  — No Prisma changes.

**API & Async**
- [x] All new endpoints are documented with Swagger/OpenAPI decorators
  — This feature establishes the Swagger infrastructure. Both `/health` and `/me` receive full decorator coverage.
- [x] All DTOs use `class-validator` decorators for strict validation
  — `HealthResponseDto` and `MeResponseDto` are response-only (no input validation needed). `ErrorResponseDto` is documentation-only. All carry `@ApiProperty()` decorators.
- N/A Heavy/non-critical operations are offloaded to BullMQ
  — No async operations in this feature.
- N/A BullMQ jobs are idempotent
  — No jobs.

**Testing**
- N/A Unit tests cover domain and application layer logic
  — No domain or application logic.
- N/A Integration tests cover repository and module interactions
  — No repositories.
- N/A E2E tests cover new API endpoints with auth + tenant context
  — Not in scope for this feature. Manual verification via Swagger UI is sufficient at this stage.

**Security**
- [x] No secrets or credentials in source code
  — No secrets. JWT is passed at runtime via browser Authorize dialog; never stored in code.
- [x] Rate limiting applied to new public-facing endpoints
  — `/health` is a monitoring endpoint only; rate limiting is not required at this stage (no external-facing endpoint with sensitive data). To be revisited when public APIs are added.
- [x] All inputs validated and sanitised before processing
  — Global `ValidationPipe` enabled with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. No user-supplied inputs in this feature's endpoints.

## Project Structure

### Documentation (this feature)

```text
specs/002-swagger-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output — OpenAPI endpoint contracts
│   ├── GET_health.md
│   └── GET_me.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code Changes (apps/api)

```text
apps/api/
├── package.json                         # + @nestjs/swagger, class-validator, class-transformer
├── src/
│   ├── main.ts                          # MODIFIED — Swagger bootstrap + global ValidationPipe
│   │
│   ├── common/
│   │   └── guards/
│   │       └── stub-bearer.guard.ts     # NEW — stub guard for /me (accepts any Bearer token)
│   │
│   └── modules/
│       ├── health/
│       │   ├── health.controller.ts     # MODIFIED — add Swagger decorators, HealthResponseDto
│       │   ├── health.module.ts         # unchanged
│       │   └── presentation/
│       │       └── dto/
│       │           └── health-response.dto.ts   # NEW
│       │
│       └── system/                      # NEW module — owns /me endpoint
│           ├── system.controller.ts     # NEW — GET /me with @ApiBearerAuth(), @UseGuards
│           ├── system.module.ts         # NEW
│           └── presentation/
│               └── dto/
│                   └── me-response.dto.ts       # NEW
│
│   ── shared/
│       └── dto/
│           └── error-response.dto.ts    # NEW — reusable error envelope DTO
```

**Structure Decision**: The `system` module owns the `/me` endpoint because it represents cross-cutting system context (who am I, what tenant am I in) rather than a domain-specific bounded context. The `ErrorResponseDto` lives in `shared/dto/` so every module can reference it for `@ApiResponse` decorators without cross-module imports.

## Complexity Tracking

No constitution violations. All applicable checks pass. N/A items are justified:

| N/A Item | Justification |
|----------|--------------|
| Clerk JWKS verification | Stub guard is the explicitly agreed-upon approach for this phase. Epic 2 replaces the stub. Documented in spec Assumptions. |
| Multi-tenancy DB checks | No DB changes in this feature — scaffold only. |
| BullMQ | No async operations required for documentation infrastructure. |
| E2E tests | Manual Swagger UI verification is sufficient; automated E2E belongs with Epic 2 when real auth exists. |
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
