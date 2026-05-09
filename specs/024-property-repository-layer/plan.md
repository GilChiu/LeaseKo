# Implementation Plan: Property Domain & Repository Layer

**Branch**: `feature/property-repository-layer` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/024-property-repository-layer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add the Property domain entity, repository interface, and `PrismaPropertyRepository` inside a new `properties` NestJS module. This establishes the data-access foundation for all property-related use cases without introducing a controller, DTO, or endpoint. The Prisma `Property` model and migration already exist from Feature 023. This feature wires the Clean Architecture layers from domain down to infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.0, Node.js 18+
**Primary Dependencies**: NestJS 10, Prisma 5.22, @prisma/client 5.22
**Storage**: PostgreSQL via PrismaService (globally provided by `DatabaseModule @Global`)
**Testing**: Jest 29 + ts-jest 29 + @nestjs/testing 10; 37 existing tests must remain passing
**Target Platform**: Node.js (Linux/macOS/Windows, Docker in production)
**Project Type**: NestJS modular monolith (Clean Architecture per module)
**Performance Goals**: N/A for repository layer; no bulk/batch operations in this task
**Constraints**: Prisma may only appear in `infrastructure/` layer; no controller/use case/endpoint in this task
**Scale/Scope**: Single new module; 5 new files + 1 modified file (AppModule)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation` — `properties/` module uses all four layers (presentation is empty/placeholder; no controller yet)
- [x] Domain layer imports no NestJS or Prisma packages — `property.entity.ts` is pure TypeScript interface
- [x] Controllers are thin — N/A (no controller in this task)
- [x] Cross-module interaction uses explicit interfaces or events only — `PROPERTY_REPOSITORY` token exported for future use case modules

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column with index — done in Feature 023 (`properties.tenant_id` indexed)
- [x] All repository queries filter by `tenant_id` — `tenantFilter()` used in `findManyByTenant` and `findById`; `update` and `softDelete` use `{ id, tenantId }` compound where clause
- [x] Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic — N/A (no controller/use case in this task; enforcement is at use-case layer, deferred)

**Authentication & Authorization**

- [x] Clerk JWT is verified against JWKS — N/A (no endpoint in this task)
- [x] Role/permission checks are enforced in backend guards, not in frontend — N/A

**Data Layer**

- [x] All DB access goes through repository interfaces — `PropertyRepository` interface is the only contract; `PrismaPropertyRepository` is the sole implementation
- [x] Prisma schema changes include `tenant_id` index — done in Feature 023

**API & Async**

- [x] All new endpoints documented with Swagger — N/A (no endpoint in this task)
- [x] All DTOs use `class-validator` — N/A (no DTO in this task)
- [x] Heavy operations offloaded to BullMQ — N/A
- [x] BullMQ jobs are idempotent — N/A

**Testing**

- [ ] Unit tests cover domain and application layer logic — **DEFERRED**: domain entity is a plain interface (no logic to test); repository interface tests belong to use-case tasks that exercise the contract
- [ ] Integration tests cover repository and module interactions — **DEFERRED** to CreateProperty use-case task where a real test subject exists
- [ ] E2E tests cover new API endpoints — **DEFERRED** (no endpoint in this task)

**Security**

- [x] No secrets or credentials in source code
- [x] Rate limiting applied to new public-facing endpoints — N/A
- [x] All inputs validated — N/A (validation belongs to DTOs in presentation layer, deferred)

**Constitution Check Result**: PASS (with justified deferrals for testing — no testable logic introduced in this task; test coverage added in CreateProperty use-case task)

## Project Structure

### Documentation (this feature)

```text
specs/024-property-repository-layer/
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
│       └── property.entity.ts             # NEW — Property TypeScript interface
├── application/
│   ├── repositories/
│   │   └── property.repository.ts         # NEW — PROPERTY_REPOSITORY token + PropertyRepository interface
│   └── types/
│       └── property-repository.types.ts   # NEW — CreatePropertyInput, UpdatePropertyInput
├── infrastructure/
│   └── repositories/
│       └── prisma-property.repository.ts  # NEW — PrismaPropertyRepository (@Injectable)
└── properties.module.ts                   # NEW — PropertiesModule wiring

apps/api/src/app.module.ts                 # MODIFIED — add PropertiesModule import
```

**Structure Decision**: NestJS monolith, scoped to `apps/api`. Four-layer Clean Architecture per module. No `presentation/` layer created (no controller in this task).

## Complexity Tracking

No constitution violations. No unjustified complexity.
