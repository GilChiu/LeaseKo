# Data Model: Get Unit by ID (Feature 033)

## No Schema Changes

No new Prisma models, enums, fields, or migrations required. The existing `units` table and `@@index([tenantId])` index already cover the `WHERE id = ? AND tenant_id = ?` query.

---

## Updated: `UnitRepository` Interface

**File**: `apps/api/src/modules/units/application/repositories/unit.repository.ts`

Add one method:

```typescript
/**
 * Find a single Unit by its ID, scoped to a tenant.
 * Returns null if the record does not exist or belongs to a different tenant.
 * Both cases are intentionally indistinguishable.
 *
 * NOTE: Units have no deletedAt field — no soft-delete filter is applied.
 */
findById(id: string, tenantId: string): Promise<Unit | null>;
```

---

## Updated: `PrismaUnitRepository`

**File**: `apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts`

Add:

```typescript
async findById(id: string, tenantId: string): Promise<Unit | null> {
  const record = await this.prisma.unit.findFirst({
    where: { id, tenantId },
  });
  return record ? this.toEntity(record) : null;
}
```

`findFirst` with `{ id, tenantId }` returns null for both non-existent and cross-tenant cases. No `deletedAt` filter — units have no soft-delete.

---

## New: `GetUnitByIdUseCase`

**File**: `apps/api/src/modules/units/application/use-cases/get-unit-by-id.use-case.ts`

```typescript
async execute(input: { id: string; tenantId: string }): Promise<Unit> {
  const unit = await this.units.findById(input.id, input.tenantId);
  if (!unit) {
    throw new NotFoundException('Unit not found.');
  }
  return unit;
}
```

Injects `UNIT_REPOSITORY` only — no `PROPERTY_REPOSITORY` needed.

---

## New: `UnitController`

**File**: `apps/api/src/modules/units/presentation/unit.controller.ts`

```typescript
@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
export class UnitController {
  constructor(private readonly getUnitById: GetUnitByIdUseCase) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  // ... Swagger decorators ...
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<UnitResponseDto> {
    const unit = await this.getUnitById.execute({ id, tenantId });
    return UnitResponseDto.fromDomain(unit);
  }
}
```

---

## Updated: `UnitsModule`

**File**: `apps/api/src/modules/units/units.module.ts`

- Add `UnitController` to `controllers` array
- Add `GetUnitByIdUseCase` to `providers` array

---

## Query Pattern

```sql
-- Prisma generates:
SELECT * FROM units WHERE id = $1 AND tenant_id = $2 LIMIT 1;
```

Covered by the existing `@@index([tenantId])` on the `units` table. For a query by both `id` (PK) and `tenantId`, PostgreSQL uses the primary key index on `id` first (O(log n)), then checks the `tenantId` constraint — highly efficient.
