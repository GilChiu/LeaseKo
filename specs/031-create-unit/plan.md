# Implementation Plan: Create Unit

**Branch**: `feature/list-properties` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/031-create-unit/spec.md`

## Summary

Expose `POST /properties/:propertyId/units` to create a rentable unit under a landlord's property. The unit number must be unique within a property. The property lookup is tenant-scoped and excludes archived records — non-existent, other-tenant, and archived properties are all indistinguishable 404s. The `tenantId` on the created unit is always derived from the property's `tenantId`, not accepted from any client-supplied source. The implementation introduces a new `units` NestJS module with its own Clean Architecture layers, a new Prisma `Unit` model, a `UnitStatus` enum, and unit tests for all five scenarios specified in the spec.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: NestJS 10, Prisma 5, class-validator, class-transformer, @nestjs/swagger
**Storage**: PostgreSQL via Prisma ORM — new `units` table with `tenant_id`, `property_id` indexed columns
**Testing**: Jest — direct class instantiation, no NestJS TestingModule, no Prisma
**Target Platform**: Linux server (API container)
**Project Type**: NestJS modular monolith web service
**Performance Goals**: Standard synchronous REST response (<200ms p95 under normal load)
**Constraints**: All queries must carry `tenant_id` filter; no direct Prisma in application/domain/presentation layers
**Scale/Scope**: Consistent with existing property module patterns; single tenant-scoped unit at a time

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
- [x] Domain layer imports no NestJS or Prisma packages — `unit.entity.ts` uses plain TypeScript only
- [x] Controllers are thin — all logic delegated to `CreateUnitUseCase`
- [x] Cross-module interaction uses explicit interfaces only — `UnitsModule` imports `PropertiesModule` and receives `PROPERTY_REPOSITORY` via NestJS DI; no direct internal service imports

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column with index — `units` model includes `@@index([tenantId])`
- [x] All repository queries filter by `tenant_id` — `tenantFilter()` utility used in all `PrismaUnitRepository` queries
- [x] Request context (`userId`, `tenantId`, `role`) is injected via `@RequiresTenant()` guard before any business logic

**Authentication & Authorization**

- [x] Clerk JWT is verified against JWKS — handled by existing `ClerkJwtGuard` infrastructure
- [x] Role/permission checks are enforced in backend guards, not in frontend — `@RequiresTenant()` gates all unit endpoints

**Data Layer**

- [x] All DB access goes through repository interfaces — `CreateUnitUseCase` depends on `UNIT_REPOSITORY` and `PROPERTY_REPOSITORY` tokens only
- [x] Prisma schema changes include `tenant_id` index on affected models — `@@index([tenantId])` on `Unit` model

**API & Async**

- [x] All new endpoints are documented with Swagger/OpenAPI decorators — full `@Api*` decorator coverage on `UnitsController`
- [x] All DTOs use `class-validator` decorators for strict validation — `CreateUnitDto` validated with `@IsString`, `@IsNotEmpty`, `@IsNumber`, `@IsInt`, `@IsPositive`, `@Min`, `@IsOptional`
- [x] Heavy/non-critical operations offloaded to BullMQ — **N/A**: unit creation is a lightweight synchronous write; no async processing required
- [x] BullMQ jobs are idempotent — **N/A**: no queue jobs introduced

**Testing**

- [x] Unit tests cover domain and application layer logic — `create-unit.use-case.spec.ts` covers all five scenarios (success, duplicate number, non-existent property, other-tenant property, archived property)
- [ ] Integration tests cover repository and module interactions — **deferred**: spec only requires unit tests; integration tests tracked in SPRINT-2-BACKLOG.md
- [ ] E2E tests cover new API endpoints — **deferred**: outside current feature scope

**Security**

- [x] No secrets or credentials in source code
- [x] Rate limiting applied — global rate limiting applied by existing infrastructure; no per-endpoint override needed
- [x] All inputs validated and sanitised before processing — `CreateUnitDto` with `class-validator`; `@Param('propertyId')` is a string binding with no further injection risk

## Project Structure

### Documentation (this feature)

```text
specs/031-create-unit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── create-unit.yaml # Phase 1 OpenAPI contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/api/src/
  modules/
    units/                                  ← NEW bounded context module
      domain/
        entities/
          unit.entity.ts                    ← Unit interface + UnitStatus union type
      application/
        repositories/
          unit.repository.ts                ← UNIT_REPOSITORY token + UnitRepository interface
        types/
          unit-repository.types.ts          ← CreateUnitInput
        use-cases/
          create-unit.use-case.ts
          create-unit.use-case.spec.ts
      infrastructure/
        repositories/
          prisma-unit.repository.ts         ← Prisma implementation; catches P2002 → ConflictException
      presentation/
        dto/
          create-unit.dto.ts
          unit-response.dto.ts
        units.controller.ts                 ← @Controller('properties/:propertyId/units')
      units.module.ts                       ← imports PropertiesModule for PROPERTY_REPOSITORY
    properties/                             ← EXISTING — minor additions only
      domain/
        entities/
          property.entity.ts                ← no changes required
      infrastructure/
        repositories/
          prisma-property.repository.ts     ← no changes required
      properties.module.ts                  ← no changes; already exports PROPERTY_REPOSITORY

  app.module.ts                             ← import UnitsModule

apps/api/prisma/
  schema.prisma                             ← add Unit model + UnitStatus enum; add units[] to Property
  migrations/
    <timestamp>_add_units_table/
      migration.sql                         ← generated by prisma migrate dev
```

**Structure Decision**: New `units/` module under `apps/api/src/modules/` following the identical four-layer layout used by `properties/`. Endpoints are served under `/properties/:propertyId/units` via a controller-level route prefix, keeping the HTTP resource hierarchy consistent with the data hierarchy (units belong to properties) while maintaining module independence.

## Complexity Tracking

> **No violations requiring justification.** All constitution checks pass.

---

## Phase 0: Research

See [research.md](./research.md) for full findings. Key decisions summarised:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Module placement | New `units/` module | Constitution: Units is a distinct bounded context |
| Cross-module dependency | Import `PropertiesModule`, inject `PROPERTY_REPOSITORY` via DI | Constitution: cross-module via explicit interfaces/DI only |
| UnitStatus | TypeScript string union in domain; Prisma native enum in schema | Domain stays framework-free; DB enforces valid values |
| Decimal vs Float for rent | `Decimal @db.Decimal(12,2)` in Prisma; `number` in domain | Monetary precision in DB; domain avoids Prisma type coupling |
| Conflict detection | `PrismaUnitRepository` catches `P2002` → throws `ConflictException` | Consistent with global exception filter pattern; explicit over implicit |
| Property validation in use case | Call `propertyRepository.findById(propertyId, tenantId)` | Reuses existing tenant-scoped, soft-delete-aware lookup; single check covers all three 404 scenarios |
| tenantId derivation | `property.tenantId` passed to `unitRepository.create()` | Spec explicitly requires tenantId derived from property, not from JWT directly |

---

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md) — Unit entity, Prisma schema additions, field types, constraints
- [contracts/create-unit.yaml](./contracts/create-unit.yaml) — OpenAPI contract for `POST /properties/:propertyId/units`
- [quickstart.md](./quickstart.md) — Developer quickstart for this feature
