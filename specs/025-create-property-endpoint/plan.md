# Implementation Plan: Create Property Use Case & API Endpoint

**Branch**: `feature/create-property-endpoint` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/025-create-property-endpoint/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add the `CreatePropertyUseCase`, `CreatePropertyDto`, `PropertyResponseDto`, and `PropertiesController` (POST /properties) inside the existing `properties` NestJS module. The Prisma model, domain entity, repository interface, and `PrismaPropertyRepository` all exist from Feature 024. This feature exposes the first Property API endpoint — a tenant-scoped, auth-protected `POST /properties` that delegates through Clean Architecture layers and returns a typed response.

## Technical Context

**Language/Version**: TypeScript 5.0, Node.js 18+
**Primary Dependencies**: NestJS 10, class-validator 0.14, class-transformer, @nestjs/swagger, Prisma 5.22 (infrastructure-only)
**Storage**: PostgreSQL via `PrismaPropertyRepository` (Feature 024) — no schema changes in this task
**Testing**: Jest 29 + ts-jest 29 + @nestjs/testing 10; 37 existing tests must remain passing
**Target Platform**: Node.js (Linux/macOS/Windows)
**Project Type**: NestJS modular monolith (Clean Architecture per module)
**Performance Goals**: < 500ms p95 for create (single DB insert)
**Constraints**: No controller or use case may import PrismaService; `tenantId` must never appear in `CreatePropertyDto`; endpoint must not be `@Public()`
**Scale/Scope**: 4 new files + 1 modified file (`PropertiesModule`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture — `properties/` now adds the `presentation/` layer (controller + DTOs); application layer adds `use-cases/`
- [x] Domain layer imports no NestJS or Prisma packages — no domain changes in this task
- [x] Controllers are thin — `PropertiesController.create()` reads tenant context, calls use case, maps response; no business logic
- [x] Cross-module interaction uses explicit interfaces only — `CreatePropertyUseCase` depends on `PROPERTY_REPOSITORY` token

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` — N/A (no schema change; `properties` table already has `tenant_id` from Feature 023)
- [x] All repository queries filter by `tenant_id` — done in Feature 024; `create()` stores `tenantId` from use case input
- [x] Request context injected via guard — `ClerkJwtGuard` (APP_GUARD) runs on every request; `@RequiresTenant()` enforces non-null `tenantId`; controller uses `@CurrentTenant()` to pass `tenantId` to use case

**Authentication & Authorization**

- [x] Clerk JWT verified against JWKS — existing `ClerkJwtGuard` handles this
- [x] Role/permission checks enforced in backend — `@RequiresTenant()` enforces tenant context server-side; no frontend trust

**Data Layer**

- [x] All DB access through repository interfaces — `CreatePropertyUseCase` injects `PropertyRepository` via `PROPERTY_REPOSITORY` token; never PrismaService
- [x] Prisma schema changes include `tenant_id` index — N/A (no schema change)

**API & Async**

- [x] All new endpoints documented with Swagger — `PropertiesController` uses `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiCreatedResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiInternalServerErrorResponse`
- [x] All DTOs use `class-validator` — `CreatePropertyDto` uses `@IsString`, `@IsNotEmpty`, `@MaxLength`, `@IsOptional`
- [x] Heavy operations offloaded to BullMQ — N/A (property creation is synchronous and fast)
- [x] BullMQ jobs are idempotent — N/A

**Testing**

- [ ] Unit tests cover application layer logic — **DEFERRED**: `CreatePropertyUseCase` has no branching logic to unit-test at this stage; unit tests are explicitly scoped to a future task per spec
- [ ] Integration tests cover repository interactions — **DEFERRED** (covered by existing `PrismaPropertyRepository` foundation)
- [ ] E2E tests cover new API endpoints — **DEFERRED**: no E2E framework configured yet; manual curl/Swagger validation is sufficient for this task

**Security**

- [x] No secrets or credentials in source code
- [x] Rate limiting — N/A at this stage (rate limiting is a future infrastructure concern)
- [x] All inputs validated — `CreatePropertyDto` with `class-validator`; global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` strips and rejects unknown fields including any `tenantId` in body

**Constitution Check Result**: PASS (testing deferred with justification — thin use case with no branching logic; deferred per spec scope)

## Project Structure

### Documentation (this feature)

```text
specs/025-create-property-endpoint/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code

```text
apps/api/src/modules/properties/
├── domain/
│   └── entities/
│       └── property.entity.ts                    # EXISTING — no change
├── application/
│   ├── repositories/
│   │   └── property.repository.ts                # EXISTING — no change
│   ├── types/
│   │   └── property-repository.types.ts          # EXISTING — no change
│   └── use-cases/
│       └── create-property.use-case.ts           # NEW
├── infrastructure/
│   └── repositories/
│       └── prisma-property.repository.ts         # EXISTING — no change
├── presentation/
│   ├── dto/
│   │   ├── create-property.dto.ts                # NEW
│   │   └── property-response.dto.ts              # NEW
│   └── properties.controller.ts                  # NEW
└── properties.module.ts                          # MODIFIED — add controller + use case
```

**Structure Decision**: NestJS monolith, scoped to `apps/api`. No new top-level projects. Adds `use-cases/` to application layer and full `presentation/` layer to the `properties` module.

## Complexity Tracking

No constitution violations. No unjustified complexity.
