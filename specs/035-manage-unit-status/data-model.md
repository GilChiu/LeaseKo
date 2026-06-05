# Data Model: Manage Unit Status Lifecycle

**Feature**: `specs/035-manage-unit-status/spec.md`
**Date**: 2026-06-04

---

## Schema Changes

### UnitStatus Enum (Additive Migration)

**Before**:
```
AVAILABLE | OCCUPIED | MAINTENANCE
```

**After**:
```
AVAILABLE | OCCUPIED | MAINTENANCE | INACTIVE
```

`INACTIVE` is an additive value. Existing rows are unaffected. PostgreSQL `ALTER TYPE ... ADD VALUE` is used under the hood by Prisma's migration engine. No data migration required.

---

## Domain Transition Table

Lives in `apps/api/src/modules/units/domain/unit-status-transitions.ts` — no framework imports, pure data.

```
ALLOWED_TRANSITIONS: Record<UnitStatus, UnitStatus[]>

AVAILABLE   → [OCCUPIED, MAINTENANCE, INACTIVE]
OCCUPIED    → [AVAILABLE, MAINTENANCE]
MAINTENANCE → [AVAILABLE, INACTIVE]
INACTIVE    → []   ← terminal state
```

**Guard logic** (applied in `UpdateUnitUseCase` when `status` is present in the update input):

```
1. findById(id, tenantId) → if null → NotFoundException
2. if current === requested → return current unit (no-op)
3. allowedNext = ALLOWED_TRANSITIONS[current]
4. if requested not in allowedNext → UnprocessableEntityException
5. proceed with update()
```

---

## Entity Reference

**Unit** (no new fields — only enum value added):

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| tenantId | UUID | Multi-tenancy FK — indexed |
| propertyId | UUID | FK to Property — indexed |
| unitNumber | String (50) | Unique per property |
| status | UnitStatus | AVAILABLE (default) — now includes INACTIVE |
| floorArea | Float? | Nullable — clearable |
| bedrooms | Int? | Nullable — clearable |
| bathrooms | Float? | Nullable — clearable |
| monthlyRent | Decimal(12,2)? | Nullable — clearable |
| description | String? | Nullable — clearable |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto-updated on write |

---

## Files Affected by Schema Change

| File | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | Add `INACTIVE` to `UnitStatus` enum |
| New Prisma migration | `ALTER TYPE "UnitStatus" ADD VALUE 'INACTIVE'` |
| `apps/api/src/modules/units/domain/entities/unit.entity.ts` | Add `\| 'INACTIVE'` to `UnitStatus` type |
| `apps/api/src/modules/units/domain/unit-status-transitions.ts` | NEW — transition table constant |
| `apps/api/src/modules/units/application/use-cases/update-unit.use-case.ts` | Add transition guard logic |
| `apps/api/src/modules/units/presentation/dto/update-unit.dto.ts` | Add `INACTIVE` to `@IsEnum` array |
| `apps/api/src/modules/units/presentation/unit.controller.ts` | Add `@ApiUnprocessableEntityResponse` to PATCH handler |
| `apps/api/src/modules/units/application/use-cases/update-unit.use-case.spec.ts` | Add transition guard test scenarios |
