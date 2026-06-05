# Developer Quickstart: Create Unit (Feature 031)

## What This Feature Adds

A `POST /properties/:propertyId/units` endpoint that creates a rentable unit under a property. New `units` NestJS module with Clean Architecture layers, a Prisma `Unit` model, and unit tests for all five specified scenarios.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/modules/units/domain/entities/unit.entity.ts` | Unit domain entity interface + UnitStatus union type |
| `apps/api/src/modules/units/application/repositories/unit.repository.ts` | UNIT_REPOSITORY token + UnitRepository interface |
| `apps/api/src/modules/units/application/types/unit-repository.types.ts` | CreateUnitInput |
| `apps/api/src/modules/units/application/use-cases/create-unit.use-case.ts` | Use case: validate property, create unit |
| `apps/api/src/modules/units/application/use-cases/create-unit.use-case.spec.ts` | Unit tests (5 scenarios) |
| `apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts` | Prisma implementation; catches P2002 → ConflictException |
| `apps/api/src/modules/units/presentation/dto/create-unit.dto.ts` | Validated request body DTO |
| `apps/api/src/modules/units/presentation/dto/unit-response.dto.ts` | Response DTO with fromDomain() |
| `apps/api/src/modules/units/presentation/units.controller.ts` | Thin HTTP adapter; @Controller('properties/:propertyId/units') |
| `apps/api/src/modules/units/units.module.ts` | Module registration; imports PropertiesModule |

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Add `UnitStatus` enum, `Unit` model, `units Unit[]` to Property and Tenant |
| `apps/api/src/app.module.ts` | Import UnitsModule |

## Migration

```powershell
pnpm db:up         # ensure Docker DB is running
pnpm db:migrate    # prisma migrate dev — generates and applies migration
```

## Verification Commands

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```

## Key Constraints (Non-Negotiable)

1. `CreateUnitDto` MUST NOT have a `tenantId` field
2. `CreateUnitDto` MUST NOT have a `propertyId` field (comes from URL path only)
3. `CreateUnitDto` MUST NOT have a `status` field (always AVAILABLE on creation)
4. The use case MUST call `propertyRepository.findById(propertyId, tenantId)` first
5. The unit's `tenantId` in `CreateUnitInput` MUST be set to `property.tenantId`, not to the JWT tenantId directly
6. `PrismaUnitRepository` MUST catch `P2002` and throw `ConflictException`
7. All repository queries MUST use `tenantFilter()` utility

## Test Scenarios

| Scenario | Expected Outcome |
|----------|-----------------|
| Valid request, new unit number | 201 Created with full unit record |
| Valid request, duplicate unit number | 409 Conflict |
| propertyId not found | 404 Not Found |
| propertyId belongs to another tenant | 404 Not Found (same as above) |
| propertyId is archived (deletedAt set) | 404 Not Found (same as above) |
