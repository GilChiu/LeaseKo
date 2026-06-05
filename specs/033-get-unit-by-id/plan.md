# Implementation Plan: Get Unit by ID

**Branch**: `feature/list-properties` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/033-get-unit-by-id/spec.md`

## Summary

Expose `GET /units/:id` to return a single unit record by its globally unique ID, scoped to the current tenant. The lookup returns null for both non-existent and cross-tenant units — identical 404 responses in both cases. Units have no soft-delete; no `deletedAt` filter is applied. No schema changes are required. The feature adds `findById()` to the existing `UnitRepository` interface, implements it in `PrismaUnitRepository`, introduces `GetUnitByIdUseCase`, and adds a new `UnitController` at `@Controller('units')` registered alongside the existing `UnitsController` in `UnitsModule`. `UnitResponseDto` is reused — no new response DTO needed.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: NestJS 10, Prisma 5, @nestjs/swagger
**Storage**: PostgreSQL via Prisma ORM — reads `units` table; no schema changes
**Testing**: Jest — direct class instantiation, no NestJS TestingModule, no Prisma
**Target Platform**: Linux server (API container)
**Project Type**: NestJS modular monolith web service
**Performance Goals**: Standard synchronous REST response
**Constraints**: All queries filter by `tenant_id`; no `deletedAt` filter (units have no soft-delete)
**Scale/Scope**: Minimal extension — one new method, one new use case, one new controller class

## Constitution Check

**Architecture**

- [x] Module follows four-layer Clean Architecture — changes contained in `units/` module only
- [x] Domain layer unchanged — `Unit` entity and `UnitStatus` type untouched
- [x] New controller (`UnitController`) is thin — delegates entirely to `GetUnitByIdUseCase`
- [x] No cross-module imports beyond existing `PROPERTY_REPOSITORY` pattern — `GetUnitByIdUseCase` needs only `UNIT_REPOSITORY`

**Multi-Tenancy (CRITICAL)**

- [x] No new DB tables — existing `units` table already has `tenant_id`
- [x] `findById()` WHERE clause filters by both `id` AND `tenantId`
- [x] Request context injected via `@RequiresTenant()` before any business logic

**Authentication & Authorization**

- [x] Clerk JWT verified by existing infrastructure
- [x] `@RequiresTenant()` applied to new endpoint

**Data Layer**

- [x] All DB access through `UNIT_REPOSITORY` interface token
- [x] No schema changes — existing `@@index([tenantId])` covers the new query

**API & Async**

- [x] New endpoint documented with full Swagger decorators
- [x] No request body — path param only; no DTO validation needed beyond existing guards
- [x] No async/queue operations

**Testing**

- [x] Unit tests for all three scenarios in `get-unit-by-id.use-case.spec.ts`
- [ ] Integration / E2E — deferred

**Security**

- [x] No secrets in source
- [x] Rate limiting via existing global infrastructure
- [x] Path param is a string binding with no injection risk; malformed IDs return 404

## Project Structure

### Documentation (this feature)

```text
specs/033-get-unit-by-id/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── get-unit-by-id.yaml
└── tasks.md
```

### Source Code Changes

```text
apps/api/src/modules/units/
  application/
    repositories/
      unit.repository.ts            ← ADD: findById() method signature
    use-cases/
      get-unit-by-id.use-case.ts    ← NEW
      get-unit-by-id.use-case.spec.ts ← NEW (3 scenarios)
  infrastructure/
    repositories/
      prisma-unit.repository.ts     ← ADD: findById() implementation
  presentation/
    unit.controller.ts              ← NEW: @Controller('units'), GET /:id only
  units.module.ts                   ← ADD: UnitController to controllers array;
                                         ADD: GetUnitByIdUseCase to providers
```

No changes to: `unit.entity.ts`, `unit-repository.types.ts`, `units.controller.ts`, `app.module.ts`, `schema.prisma`.

**Structure Decision**: A second controller class `UnitController` (singular, flat path `@Controller('units')`) coexists with `UnitsController` (plural, nested path). Both are registered in `UnitsModule.controllers`. NestJS allows multiple controllers per module.

## Complexity Tracking

> No violations. All constitution checks pass.

---

## Phase 0: Research

See [research.md](./research.md). Key decisions:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Controller naming | `UnitController` at `@Controller('units')` | Singular name distinguishes it from `UnitsController` (collection); flat path per spec |
| Module placement | Add to existing `UnitsModule` | Same bounded context; no new module registration in `AppModule` |
| `findById` null semantics | Returns `null` for both non-existent and cross-tenant | Matches `PropertyRepository.findById()` pattern exactly |
| `deletedAt` filter | None — units have no soft-delete | Spec explicitly states units have no archive mechanism |
| DTO reuse | `UnitResponseDto.fromDomain()` | Shape is identical to create/list responses; no new DTO needed |

---

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md)
- [contracts/get-unit-by-id.yaml](./contracts/get-unit-by-id.yaml)
- [quickstart.md](./quickstart.md)
