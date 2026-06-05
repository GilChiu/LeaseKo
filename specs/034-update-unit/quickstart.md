# Developer Quickstart: Update Unit (Feature 034)

## What This Feature Adds

`PATCH /units/:id` — partial update of a unit's mutable fields. Added to existing `UnitController`. No schema changes.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/modules/units/application/use-cases/update-unit.use-case.ts` | Use case: `update()` → 404 if null; propagates ConflictException |
| `apps/api/src/modules/units/application/use-cases/update-unit.use-case.spec.ts` | Unit tests (6 scenarios) |
| `apps/api/src/modules/units/presentation/dto/update-unit.dto.ts` | Optional fields; `@ValidateIf` for nullable clearable fields |

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/modules/units/application/types/unit-repository.types.ts` | Add `UpdateUnitInput` |
| `apps/api/src/modules/units/application/repositories/unit.repository.ts` | Add `update()` signature |
| `apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` | Implement `update()` — P2025 → null; P2002 → ConflictException |
| `apps/api/src/modules/units/presentation/unit.controller.ts` | Add `PATCH :id` handler + inject `UpdateUnitUseCase` |
| `apps/api/src/modules/units/units.module.ts` | Add `UpdateUnitUseCase` to providers |

## Key Constraints (Non-Negotiable)

1. `UpdateUnitInput` MUST NOT include `tenantId`, `propertyId`, or `id`
2. Clearable fields (`floorArea`, `bedrooms`, `bathrooms`, `monthlyRent`, `description`) use `| null` type — passing null clears the value
3. `unitNumber` and `status` do NOT allow null
4. `UpdateUnitDto` uses `@ValidateIf(o => o.field !== null)` for clearable numeric/text fields
5. Controller MUST reject empty payload (all values undefined) with `BadRequestException`
6. Repository catches `P2025` → returns `null` (not found or cross-tenant, indistinguishable)
7. Repository catches `P2002` → throws `ConflictException` (duplicate unitNumber)
8. Use case propagates `ConflictException` unchanged (does NOT catch it)

## Test Scenarios

| Scenario | Expected Outcome |
|----------|-----------------|
| Valid update with multiple fields | 200 with updated unit record |
| Set clearable field to null | 200 with field as null in response |
| Empty payload `{}` | 400 Bad Request |
| Duplicate unitNumber (conflict) | 409 Conflict |
| Non-existent unit | 404 Not Found |
| Cross-tenant unit | 404 (same as non-existent — indistinguishable) |

## Verification Commands

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```
