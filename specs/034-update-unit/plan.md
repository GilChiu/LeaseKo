# Implementation Plan: Update Unit

**Branch**: `feature/list-properties` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/034-update-unit/spec.md`

## Summary

Expose `PATCH /units/:id` to partially update a unit belonging to the current tenant. All seven updatable fields are optional; only provided fields change. Optional numeric/text fields may be explicitly set to null to clear their values. An empty payload is rejected. A duplicate `unitNumber` within the same property is rejected with a conflict error. Non-existent and cross-tenant units both produce identical 404 responses. No schema changes are required. The feature adds `UpdateUnitInput` type, extends `UnitRepository` with `update()`, implements it in `PrismaUnitRepository` (following the `PrismaPropertyRepository.update()` pattern exactly), adds `UpdateUnitDto`, `UpdateUnitUseCase`, and a `PATCH :id` handler to the existing `UnitController`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: NestJS 10, Prisma 5, class-validator, class-transformer, @nestjs/swagger
**Storage**: PostgreSQL via Prisma ORM — updates `units` table; no schema changes
**Testing**: Jest — direct class instantiation, no NestJS TestingModule, no Prisma
**Target Platform**: Linux server (API container)
**Project Type**: NestJS modular monolith web service
**Constraints**: Null-clearing for optional fields; P2025 → null; P2002 → ConflictException; `tenantId`/`propertyId`/`id` immutable
**Scale/Scope**: Minimal — one new type, one interface extension, one use case, one DTO, one handler

## Constitution Check

**Architecture**

- [x] Module follows four-layer Clean Architecture — all changes within `units/` module
- [x] Domain `Unit` entity unchanged; `UnitStatus` type already defined
- [x] `UnitController.update()` is thin — delegates to `UpdateUnitUseCase`; empty-payload check only
- [x] No new cross-module dependencies — only `UNIT_REPOSITORY` injected

**Multi-Tenancy (CRITICAL)**

- [x] `update()` WHERE clause uses `{ id, tenantId }` — tenant scoping built into the query
- [x] `tenantId` is immutable and never included in `UpdateUnitInput`
- [x] `@RequiresTenant()` applied to the new handler

**Data Layer**

- [x] All DB access through `UNIT_REPOSITORY` interface
- [x] No schema changes — existing `@@unique([propertyId, unitNumber])` enforces conflict detection

**API & Async**

- [x] New handler documented with full Swagger decorators
- [x] `UpdateUnitDto` uses `class-validator` with `@ValidateIf` for nullable optional fields
- [x] No async/queue operations

**Testing**

- [x] Unit tests for all six scenarios in `update-unit.use-case.spec.ts`
- [ ] Integration / E2E — deferred

**Security**

- [x] `forbidNonWhitelisted: true` in global `ValidationPipe` rejects any `id`/`tenantId`/`propertyId` in request body
- [x] `tenantId` and `id` from JWT + path only — never from body

## Project Structure

### Documentation (this feature)

```text
specs/034-update-unit/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── update-unit.yaml
└── tasks.md
```

### Source Code Changes

```text
apps/api/src/modules/units/
  application/
    types/
      unit-repository.types.ts          ← ADD: UpdateUnitInput interface
    repositories/
      unit.repository.ts                ← ADD: update() method signature
    use-cases/
      update-unit.use-case.ts           ← NEW
      update-unit.use-case.spec.ts      ← NEW (6 scenarios)
  infrastructure/
    repositories/
      prisma-unit.repository.ts         ← ADD: update() implementation
  presentation/
    dto/
      update-unit.dto.ts                ← NEW (@ValidateIf for nullable fields)
    unit.controller.ts                  ← ADD: PATCH :id handler
  units.module.ts                       ← ADD: UpdateUnitUseCase to providers
```

No changes to: `unit.entity.ts`, `units.controller.ts`, `app.module.ts`, `schema.prisma`.

**Structure Decision**: `PATCH /units/:id` is added to the existing `UnitController` alongside `GET :id`. Both handle the flat `/units/` route.

## Complexity Tracking

> No violations. All constitution checks pass.

---

## Phase 0: Research

See [research.md](./research.md). Key decisions:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Null-clearing validation | `@IsOptional() @ValidateIf(o => o.field !== null)` + validators | Allows `undefined` (omit) and `null` (clear); rejects invalid non-null values |
| `UpdateUnitInput` null semantics | `undefined` = no change; `null` = clear to null | Aligns with Prisma's `update` data semantics |
| P2025 handling | Catch in repository → return null → NotFoundException in use case | Same pattern as `PrismaPropertyRepository.update()` |
| P2002 handling | Catch in repository → throw ConflictException | Same pattern as `PrismaUnitRepository.create()` |
| Empty payload check | Controller checks `Object.values(dto).every(v => v === undefined)` | Same pattern as `PropertiesController.update()` |
| `monthlyRent` Decimal | Pass `number | null | undefined` directly; Prisma auto-converts | No special handling needed; repository passes value through |

---

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md)
- [contracts/update-unit.yaml](./contracts/update-unit.yaml)
- [quickstart.md](./quickstart.md)
