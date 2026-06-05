# Developer Quickstart: Get Unit by ID (Feature 033)

## What This Feature Adds

`GET /units/:id` — flat path, tenant-scoped unit lookup. New `UnitController` at `@Controller('units')` alongside the existing `UnitsController`. No schema changes.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/modules/units/application/use-cases/get-unit-by-id.use-case.ts` | Use case: findById → 404 if null |
| `apps/api/src/modules/units/application/use-cases/get-unit-by-id.use-case.spec.ts` | Unit tests (3 scenarios) |
| `apps/api/src/modules/units/presentation/unit.controller.ts` | `@Controller('units')` with `@Get(':id')` |

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/modules/units/application/repositories/unit.repository.ts` | Add `findById(id, tenantId)` signature |
| `apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` | Implement `findById()` — `findFirst({ where: { id, tenantId } })` |
| `apps/api/src/modules/units/units.module.ts` | Add `UnitController` + `GetUnitByIdUseCase` |

## Key Constraints (Non-Negotiable)

1. `findById` WHERE clause MUST include BOTH `id` AND `tenantId`
2. `findById` MUST NOT include a `deletedAt` filter — units have no soft-delete
3. Returns `null` for both non-existent AND cross-tenant units (indistinguishable)
4. `UnitController` is at `@Controller('units')` (NOT `@Controller('properties/:propertyId/units')`)
5. Both `UnitController` and `UnitsController` are registered in `UnitsModule.controllers`
6. Reuse `UnitResponseDto` — do NOT create a new response DTO

## Test Scenarios

| Scenario | Expected Outcome |
|----------|-----------------|
| Unit exists and belongs to tenant | 200 with full unit record |
| Unit does not exist | 404 Not Found |
| Unit exists but belongs to another tenant | 404 (same as above — indistinguishable) |

## Verification Commands

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```
