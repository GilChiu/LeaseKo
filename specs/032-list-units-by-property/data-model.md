# Data Model: List Units by Property (Feature 032)

## No Schema Changes

No new Prisma models, enums, or migrations are required. The existing `units` table with its `@@index([tenantId])` and `@@index([propertyId])` indexes covers the new query pattern.

---

## New: `FindManyByPropertyOptions` and `PagedUnits` (application types)

**File**: `apps/api/src/modules/units/application/types/unit-repository.types.ts`

Add to the existing file:

```typescript
export interface FindManyByPropertyOptions {
  page: number;
  limit: number;
}

export interface PagedUnits {
  items: Unit[];
  total: number;
}
```

`PagedUnits` mirrors `PagedProperties` in the properties module. `total` reflects the full count of matching units (not just the current page).

---

## Updated: `UnitRepository` Interface

**File**: `apps/api/src/modules/units/application/repositories/unit.repository.ts`

Add one method to the existing interface:

```typescript
/**
 * Return a paginated list of Units belonging to a property, scoped to a tenant.
 * Results are ordered by unitNumber ascending (lexicographic).
 * Returns an empty items array (not null) when no units exist.
 * tenantId MUST come from verified request context — never from client payload.
 *
 * IMPORTANT: The caller (use case) MUST verify property ownership via
 * PropertyRepository.findById() before calling this method. This method does
 * NOT check property existence — it only queries units.
 */
findManyByProperty(
  propertyId: string,
  tenantId: string,
  options: FindManyByPropertyOptions,
): Promise<PagedUnits>;
```

---

## Updated: `PrismaUnitRepository` Implementation

**File**: `apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts`

Add the `findManyByProperty()` method:

```typescript
async findManyByProperty(
  propertyId: string,
  tenantId: string,
  options: FindManyByPropertyOptions,
): Promise<PagedUnits> {
  const { page, limit } = options;
  const skip = (page - 1) * limit;
  const where = { propertyId, tenantId };

  const [records, total] = await this.prisma.$transaction([
    this.prisma.unit.findMany({
      where,
      orderBy: { unitNumber: 'asc' },
      skip,
      take: limit,
    }),
    this.prisma.unit.count({ where }),
  ]);

  return { items: records.map((r) => this.toEntity(r)), total };
}
```

The `where` clause uses both `propertyId` and `tenantId` — defense-in-depth per constitution rule VI. The `$transaction` ensures the `findMany` and `count` run atomically and return a consistent total.

---

## New: `ListUnitsByPropertyUseCase`

**File**: `apps/api/src/modules/units/application/use-cases/list-units-by-property.use-case.ts`

```typescript
async execute(input: {
  tenantId: string;
  propertyId: string;
  page: number;
  limit: number;
}): Promise<PagedUnits> {
  // Step 1: Verify property accessibility (existence + tenant + not archived)
  const property = await this.properties.findById(input.propertyId, input.tenantId);
  if (!property) {
    throw new NotFoundException('Property not found.');
  }

  // Step 2: Query units (property is confirmed accessible)
  return this.units.findManyByProperty(input.propertyId, input.tenantId, {
    page: input.page,
    limit: input.limit,
  });
}
```

Injects both `UNIT_REPOSITORY` and `PROPERTY_REPOSITORY`. The two-step pattern is mandatory — see research.md Decision 1.

---

## New: `ListUnitsQueryDto`

**File**: `apps/api/src/modules/units/presentation/dto/list-units-query.dto.ts`

```typescript
export class ListUnitsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 50;
}
```

Follows the exact pattern of `ListPropertiesQueryDto`. `@Type(() => Number)` coerces string query params to numbers before class-validator runs.

---

## New: `PaginatedUnitsResponseDto`

**File**: `apps/api/src/modules/units/presentation/dto/paginated-units-response.dto.ts`

```typescript
export class PaginatedUnitsResponseDto {
  items: UnitResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;

  static fromDomain(
    pagedResult: PagedUnits,
    page: number,
    limit: number,
  ): PaginatedUnitsResponseDto {
    const dto = new PaginatedUnitsResponseDto();
    dto.items = pagedResult.items.map(UnitResponseDto.fromDomain);
    dto.total = pagedResult.total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < pagedResult.total;
    return dto;
  }
}
```

Mirrors `PaginatedPropertiesResponseDto` exactly, substituting `Unit` for `Property`.

---

## Controller Addition

**File**: `apps/api/src/modules/units/presentation/units.controller.ts`

Add a `@Get()` handler alongside the existing `@Post()`:

```typescript
@Get()
@HttpCode(HttpStatus.OK)
@RequiresTenant()
// ... Swagger decorators ...
async list(
  @CurrentTenant() tenantId: string,
  @Param('propertyId') propertyId: string,
  @Query() query: ListUnitsQueryDto,
): Promise<PaginatedUnitsResponseDto> {
  const result = await this.listUnitsByProperty.execute({
    tenantId,
    propertyId,
    page: query.page,
    limit: query.limit,
  });
  return PaginatedUnitsResponseDto.fromDomain(result, query.page, query.limit);
}
```

`ListUnitsByPropertyUseCase` is added to the controller constructor. The `units.module.ts` providers array must also include `ListUnitsByPropertyUseCase`.

---

## Query Execution Plan

For a property with N units, requesting page P with limit L:

```sql
-- Equivalent SQL (Prisma generates this)
SELECT * FROM units
WHERE property_id = $1 AND tenant_id = $2
ORDER BY unit_number ASC
LIMIT $3 OFFSET $4;

SELECT COUNT(*) FROM units
WHERE property_id = $1 AND tenant_id = $2;
-- Both run in a single transaction
```

Covered by existing indexes:
- `@@index([propertyId])` on the `units` table — covers the `WHERE property_id = ?` filter
- `@@index([tenantId])` — covers the `AND tenant_id = ?` defense-in-depth filter
