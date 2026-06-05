# Developer Quickstart: List Units by Property (Feature 032)

## What This Feature Adds

A `GET /properties/:propertyId/units` endpoint returning a paginated, unit-number-ordered list of units. Extends the existing `units/` module — no new module, no schema changes.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/modules/units/application/use-cases/list-units-by-property.use-case.ts` | Use case: verify property, then page units |
| `apps/api/src/modules/units/application/use-cases/list-units-by-property.use-case.spec.ts` | Unit tests (5 scenarios) |
| `apps/api/src/modules/units/presentation/dto/list-units-query.dto.ts` | `page` + `limit` query params with coercion |
| `apps/api/src/modules/units/presentation/dto/paginated-units-response.dto.ts` | Response envelope with `fromDomain()` |

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/modules/units/application/types/unit-repository.types.ts` | Add `FindManyByPropertyOptions` + `PagedUnits` |
| `apps/api/src/modules/units/application/repositories/unit.repository.ts` | Add `findManyByProperty()` method signature |
| `apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` | Implement `findManyByProperty()` |
| `apps/api/src/modules/units/presentation/units.controller.ts` | Add `@Get()` handler + inject `ListUnitsByPropertyUseCase` |
| `apps/api/src/modules/units/units.module.ts` | Add `ListUnitsByPropertyUseCase` to providers |

## Key Constraints (Non-Negotiable)

1. The use case MUST call `propertyRepository.findById(propertyId, tenantId)` FIRST
2. If `findById` returns null → throw `NotFoundException('Property not found.')`; do NOT query units
3. `findManyByProperty()` WHERE clause MUST include BOTH `propertyId` AND `tenantId`
4. An accessible property with no units returns `{ items: [], total: 0 }` — NOT a 404
5. `page` and `limit` query params MUST be coerced via `@Type(() => Number)` before validation
6. Default `limit` is **50** (not 20 — differs from the properties endpoint)
7. Maximum `limit` is **100**; requests above this cap are rejected (not silently clamped)
8. `hasMore` = `page * limit < total`

## Test Scenarios

| Scenario | Expected Outcome |
|----------|-----------------|
| Property has 2+ units | 200 with units array, correct total, ordered by unitNumber asc |
| Property exists but has no units | 200 with empty array, total = 0 |
| propertyId not found | 404 Not Found |
| propertyId belongs to another tenant | 404 (same as above — indistinguishable) |
| propertyId is archived | 404 (same as above — indistinguishable) |

## Verification Commands

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```
