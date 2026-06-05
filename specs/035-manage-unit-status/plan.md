# Implementation Plan: Manage Unit Status Lifecycle

**Branch**: `feature/list-properties` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/035-manage-unit-status/spec.md`

## Summary

Enforce a unit status lifecycle by adding INACTIVE as a fourth status value and introducing a transition guard in `UpdateUnitUseCase`. The guard reads the current status via `findById`, applies a domain-layer transition table, rejects invalid transitions with HTTP 422, and treats same-status updates as idempotent no-ops. No new endpoint, no new repository method, and no data migration for existing rows — only an additive enum value in the Prisma schema.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS  
**Primary Dependencies**: NestJS 10, Prisma 5, class-validator, class-transformer, @nestjs/swagger  
**Storage**: PostgreSQL via Prisma ORM — additive `INACTIVE` value to `UnitStatus` enum; no new columns  
**Testing**: Jest — direct class instantiation, no NestJS TestingModule, no Prisma  
**Target Platform**: Linux server (API container)  
**Project Type**: NestJS modular monolith web service  
**Constraints**: Transition guard must run only when `status` is in the request; INACTIVE units can still have non-status fields updated  
**Scale/Scope**: Minimal — one new domain constant, guard logic in one use case, one enum value addition

## Constitution Check

**Architecture**

- [x] Module follows four-layer Clean Architecture — all changes within `units/` module
- [x] Domain `Unit` entity is updated; new `unit-status-transitions.ts` pure constant in `domain/`
- [x] `UnitController.update()` is thin — transition guard stays in `UpdateUnitUseCase`
- [x] No new cross-module dependencies — only `UNIT_REPOSITORY` injected (same as before)

**Multi-Tenancy (CRITICAL)**

- [x] No new DB tables; existing `tenantId` column and index unchanged
- [x] `findById(id, tenantId)` call in the guard path is tenant-scoped — null covers both not-found and cross-tenant
- [x] `@RequiresTenant()` on the PATCH handler unchanged — tenantId still comes from JWT only

**Authentication & Authorization**

- [x] Clerk JWT verification unchanged — no new guards or endpoints
- [x] Role/permission enforcement unchanged

**Data Layer**

- [x] All DB access through `UNIT_REPOSITORY` interface (no direct Prisma in use case)
- [x] Prisma schema change: additive `INACTIVE` value — no new index required
- [x] `findById` is an existing repository method; no new methods added

**API & Async**

- [x] PATCH /units/:id gains a new `@ApiUnprocessableEntityResponse` decorator
- [x] `UpdateUnitDto` updated to include `INACTIVE` in `@IsEnum`
- [x] No async/queue operations — synchronous read-guard-write is appropriate here

**Testing**

- [x] Unit tests for all transition guard scenarios added to `update-unit.use-case.spec.ts`
- [ ] Integration / E2E — deferred (consistent with existing unit test strategy)

**Security**

- [x] `forbidNonWhitelisted: true` in global `ValidationPipe` unchanged
- [x] Tenant isolation: `findById` uses both `id` and `tenantId`; null → 404

## Project Structure

### Documentation (this feature)

```text
specs/035-manage-unit-status/
├── plan.md               ← this file
├── research.md           ← Phase 0: key decisions
├── data-model.md         ← Phase 1: schema and transition table
├── quickstart.md         ← Phase 1: usage examples
├── contracts/
│   └── update-unit-status.yaml  ← Phase 1: API contract (PATCH /units/:id extension)
└── tasks.md              ← Phase 2 (/speckit-tasks output — not yet created)
```

### Source Code Changes

```text
apps/api/
  prisma/
    schema.prisma                             ← ADD: INACTIVE to UnitStatus enum
    migrations/<timestamp>_add_inactive_unit_status/
      migration.sql                           ← NEW: ALTER TYPE "UnitStatus" ADD VALUE 'INACTIVE'

  src/modules/units/
    domain/
      entities/
        unit.entity.ts                        ← ADD: 'INACTIVE' to UnitStatus type
      unit-status-transitions.ts              ← NEW: ALLOWED_TRANSITIONS constant
    application/
      use-cases/
        update-unit.use-case.ts               ← ADD: transition guard (findById + table lookup)
        update-unit.use-case.spec.ts          ← ADD: 8 new transition guard test scenarios
    presentation/
      dto/
        update-unit.dto.ts                    ← ADD: INACTIVE to @IsEnum array + Swagger enum
      unit.controller.ts                      ← ADD: @ApiUnprocessableEntityResponse to PATCH handler
```

**No changes to**: `unit.repository.ts`, `unit-repository.types.ts`, `prisma-unit.repository.ts`, `units.module.ts`, `unit-response.dto.ts`, `create-unit.dto.ts`.

**Structure Decision**: Transition table as a pure `domain/` constant. Guard logic in `application/` use case. No new repository method — `findById` already exists.

## Complexity Tracking

> No violations. All constitution checks pass.

---

## Phase 0: Research

See [research.md](./research.md). Key decisions:

| Decision | Choice | Rationale |
|---|---|---|
| Transition guard location | `domain/` table + use-case enforcement | Domain logic belongs in domain layer |
| Invalid transition error | HTTP 422 `UnprocessableEntityException` | Distinct from 400 (validation) and 409 (conflict) |
| INACTIVE schema change | Prisma additive enum migration | No data migration needed; existing rows unaffected |
| Same-status update | No-op — return current unit, skip `update()` | Idempotency; spec FR-005 |
| Current status source | `findById` before guard | No client-supplied state; tenant-scoped |
| Combined field + status | Reject entire request if transition invalid | Spec FR-010: no partial writes |
| INACTIVE non-status edits | Guard skips when no `status` in input | Spec FR-011: metadata still editable |

---

## Phase 1: Design Artifacts

See:
- [data-model.md](./data-model.md)
- [contracts/update-unit-status.yaml](./contracts/update-unit-status.yaml)
- [quickstart.md](./quickstart.md)

### Transition Table (domain constant)

```typescript
// apps/api/src/modules/units/domain/unit-status-transitions.ts
export const ALLOWED_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  AVAILABLE:   ['OCCUPIED', 'MAINTENANCE', 'INACTIVE'],
  OCCUPIED:    ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE', 'INACTIVE'],
  INACTIVE:    [],
};
```

### UpdateUnitUseCase Guard Logic (pseudocode)

```
execute(input: { id, tenantId, data }):
  if data.status is defined:
    current = findById(id, tenantId)
    if current is null → throw NotFoundException('Unit not found.')
    if current.status === data.status → return current  // no-op
    allowed = ALLOWED_TRANSITIONS[current.status]
    if data.status not in allowed:
      throw UnprocessableEntityException(
        `Unit status cannot transition from ${current.status} to ${data.status}.`
      )
  result = update(id, tenantId, data)
  if result is null → throw NotFoundException('Unit not found.')
  return result
```

### Test Scenarios to Add

| ID | Description | Mock setup | Expected |
|---|---|---|---|
| TC-GUARD-1 | Valid transition (AVAILABLE → OCCUPIED) | findById→unit(AVAILABLE), update→unit(OCCUPIED) | returns updated unit |
| TC-GUARD-2 | Same status no-op (AVAILABLE → AVAILABLE) | findById→unit(AVAILABLE) | returns current unit; update NOT called |
| TC-GUARD-3 | Invalid transition (OCCUPIED → INACTIVE) | findById→unit(OCCUPIED) | throws UnprocessableEntityException |
| TC-GUARD-4 | INACTIVE terminal state (INACTIVE → AVAILABLE) | findById→unit(INACTIVE) | throws UnprocessableEntityException |
| TC-GUARD-5 | findById null before guard (not found) | findById→null | throws NotFoundException |
| TC-GUARD-6 | No status in input — guard skips | update→unit | update called directly, findById NOT called |
| TC-GUARD-7 | Valid transition + other fields combined | findById→unit(MAINTENANCE), update→unit(AVAILABLE+newRent) | returns fully updated unit |
| TC-GUARD-8 | Invalid transition + other fields combined | findById→unit(OCCUPIED) | throws UnprocessableEntityException; update NOT called |
