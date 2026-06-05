# Implementation Plan: List Units by Property

**Branch**: `feature/list-properties` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/032-list-units-by-property/spec.md`

## Summary

Expose `GET /properties/:propertyId/units` to return a paginated, unit-number-ordered list of units under a specific property. The property must be verified (exists, belongs to tenant, not archived) **before** the unit query is issued — the implementation must never rely on an empty unit result as a proxy for an inaccessible property. Returns HTTP 200 with an empty array when the property is accessible but has no units. Returns HTTP 404 for non-existent, other-tenant, and archived properties (all three indistinguishable). No new Prisma schema changes are required — this feature reads from the existing `units` table and extends the existing `UnitsModule` and `UnitRepository` with a new `findManyByProperty` method.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: NestJS 10, Prisma 5, class-validator, class-transformer, @nestjs/swagger
**Storage**: PostgreSQL via Prisma ORM — reads `units` table; no schema changes required
**Testing**: Jest — direct class instantiation, no NestJS TestingModule, no Prisma
**Target Platform**: Linux server (API container)
**Project Type**: NestJS modular monolith web service
**Performance Goals**: Standard synchronous REST response
**Constraints**: All queries must carry `tenant_id` filter; property ownership check MUST precede unit query
**Scale/Scope**: Extends existing `UnitsModule` and `UnitRepository` with one new method and one new use case

## Constitution Check

_GATE: Must pass before Phase 0 research._

**Architecture**

- [x] Module follows four-layer Clean Architecture — changes are contained within `units/` module layers
- [x] Domain layer imports no NestJS or Prisma packages — `Unit` entity unchanged; no domain changes needed
- [x] Controllers are thin — new GET handler delegates entirely to `ListUnitsByPropertyUseCase`
- [x] Cross-module interaction uses explicit interfaces only — `ListUnitsByPropertyUseCase` injects `PROPERTY_REPOSITORY` from `PropertiesModule` (already imported by `UnitsModule`)

**Multi-Tenancy (CRITICAL)**

- [x] No new DB tables — existing `units` table already has `tenant_id`
- [x] `findManyByProperty()` filters by both `propertyId` AND `tenantId` — defense-in-depth even though property ownership was already verified
- [x] Request context injected via `@RequiresTenant()` guard before any business logic

**Authentication & Authorization**

- [x] Clerk JWT verified by existing `ClerkJwtGuard` infrastructure
- [x] `@RequiresTenant()` gates all unit endpoints — no change required

**Data Layer**

- [x] All DB access through repository interfaces — `ListUnitsByPropertyUseCase` depends on `UNIT_REPOSITORY` and `PROPERTY_REPOSITORY` tokens only
- [x] No Prisma schema changes — existing indexes (`@@index([tenantId])`, `@@index([propertyId])`) already cover the new query

**API & Async**

- [x] New endpoint documented with full Swagger/OpenAPI decorators
- [x] `ListUnitsQueryDto` uses `class-validator` + `@Type(() => Number)` for page/limit coercion and validation
- [x] No async/queue operations — lightweight read query; BullMQ N/A

**Testing**

- [x] Unit tests cover all five scenarios in `list-units-by-property.use-case.spec.ts`
- [ ] Integration tests — deferred (outside current feature scope)
- [ ] E2E tests — deferred (outside current feature scope)

**Security**

- [x] No secrets in source code
- [x] Rate limiting via existing global infrastructure
- [x] All query inputs validated via `ListUnitsQueryDto`; path param is a safe string binding

## Project Structure

### Documentation (this feature)

```text
specs/032-list-units-by-property/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── list-units-by-property.yaml
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
apps/api/src/modules/units/
  application/
    types/
      unit-repository.types.ts          ← ADD: FindManyByPropertyOptions, PagedUnits
    repositories/
      unit.repository.ts                ← ADD: findManyByProperty() method signature
    use-cases/
      list-units-by-property.use-case.ts       ← NEW
      list-units-by-property.use-case.spec.ts  ← NEW (5 test scenarios)
  infrastructure/
    repositories/
      prisma-unit.repository.ts         ← ADD: findManyByProperty() implementation
  presentation/
    dto/
      list-units-query.dto.ts           ← NEW (page, limit with coercion)
      paginated-units-response.dto.ts   ← NEW (items, total, page, limit, hasMore)
    units.controller.ts                 ← ADD: @Get() handler
```

No changes to `units.module.ts`, `app.module.ts`, `unit.entity.ts`, or `schema.prisma`.

**Structure Decision**: Feature extends the existing `units/` module in-place. No new module registration needed. The GET and POST handlers coexist on the same `@Controller('properties/:propertyId/units')` — NestJS route matching differentiates them by HTTP method.

## Complexity Tracking

> **No violations requiring justification.** All constitution checks pass.

---

## Phase 0: Research

See [research.md](./research.md) for full findings. Key decisions summarised:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Property check strategy | `findById(propertyId, tenantId)` before unit query | Spec requirement: must not rely on empty unit set as inaccessibility proxy |
| Unit query tenant filter | Filter by `propertyId + tenantId` (both) | Defense-in-depth; constitution requires all queries to include `tenant_id` |
| Ordering | `orderBy: { unitNumber: 'asc' }` | Spec requirement; Prisma string sort is lexicographic (documented as assumption) |
| Pagination defaults | `page = 1`, `limit = 50`, `max = 100` | Per spec; differs from properties (default 20) since unit counts per property are typically small |
| Response envelope | Same shape as `PaginatedPropertiesResponseDto`: `{ items, total, page, limit, hasMore }` | Consistency with existing list endpoint pattern |
| Use case dependencies | `UNIT_REPOSITORY` + `PROPERTY_REPOSITORY` | Property check needed; `PropertiesModule` already imported by `UnitsModule` |

---

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md) — New types, interface additions, repository query design
- [contracts/list-units-by-property.yaml](./contracts/list-units-by-property.yaml) — OpenAPI contract for `GET /properties/:propertyId/units`
- [quickstart.md](./quickstart.md) — Files to create/modify, key constraints checklist
