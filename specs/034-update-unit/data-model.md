# Data Model: Update Unit (Feature 034)

## No Schema Changes

No new Prisma models, enums, fields, or migrations required.

---

## New: `UpdateUnitInput` (application types)

**File**: `apps/api/src/modules/units/application/types/unit-repository.types.ts`

Add to existing file (import `UnitStatus` from domain entity):

```typescript
export interface UpdateUnitInput {
  unitNumber?: string;
  floorArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  monthlyRent?: number | null;
  description?: string | null;
  status?: UnitStatus;
}
```

- `undefined` = do not change this field
- `null` = clear this field (set to null in DB) — only valid for optional numeric/text fields
- `unitNumber` and `status` do not allow null (neither appears as `| null`)

---

## Updated: `UnitRepository` Interface

**File**: `apps/api/src/modules/units/application/repositories/unit.repository.ts`

Add one method:

```typescript
/**
 * Partially update a Unit's mutable fields, scoped to a tenant.
 * Returns null if the record does not exist or belongs to a different tenant.
 * Both cases are intentionally indistinguishable.
 * tenantId MUST NOT be included in input — it is immutable.
 */
update(
  id: string,
  tenantId: string,
  input: UpdateUnitInput,
): Promise<Unit | null>;
```

---

## Updated: `PrismaUnitRepository`

**File**: `apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts`

Add (follows `PrismaPropertyRepository.update()` pattern exactly):

```typescript
async update(
  id: string,
  tenantId: string,
  input: UpdateUnitInput,
): Promise<Unit | null> {
  try {
    const record = await this.prisma.unit.update({
      where: { id, tenantId },
      data: input,
    });
    return this.toEntity(record);
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return null;
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Unit number already exists under this property.',
        );
      }
    }
    throw e;
  }
}
```

`where: { id, tenantId }` — Prisma throws P2025 if no row matches `id AND tenant_id = tenantId`. Both non-existent and cross-tenant cases produce P2025 → null → NotFoundException in use case.

---

## New: `UpdateUnitUseCase`

**File**: `apps/api/src/modules/units/application/use-cases/update-unit.use-case.ts`

```typescript
async execute(input: {
  id: string;
  tenantId: string;
  data: UpdateUnitInput;
}): Promise<Unit> {
  const updated = await this.units.update(input.id, input.tenantId, input.data);
  if (!updated) {
    throw new NotFoundException('Unit not found.');
  }
  return updated;
}
```

Mirrors `UpdatePropertyUseCase` exactly. Propagates `ConflictException` from the repository unchanged.

---

## New: `UpdateUnitDto`

**File**: `apps/api/src/modules/units/presentation/dto/update-unit.dto.ts`

Nullable optional fields use `@ValidateIf(o => o.field !== null)` to permit explicit null (clear) while still validating non-null values:

```typescript
export class UpdateUnitDto {
  // Non-clearable: null rejected by @IsString() + @IsNotEmpty()
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(50)
  unitNumber?: string;

  // Clearable: null allowed; positive number required if non-null
  @IsOptional()
  @ValidateIf(o => o.floorArea !== null)
  @IsNumber() @IsPositive()
  floorArea?: number | null;

  @IsOptional()
  @ValidateIf(o => o.bedrooms !== null)
  @IsInt() @Min(1)
  bedrooms?: number | null;

  @IsOptional()
  @ValidateIf(o => o.bathrooms !== null)
  @IsNumber() @IsPositive()
  bathrooms?: number | null;

  @IsOptional()
  @ValidateIf(o => o.monthlyRent !== null)
  @IsNumber() @IsPositive()
  monthlyRent?: number | null;

  @IsOptional()
  @ValidateIf(o => o.description !== null)
  @IsString() @MaxLength(1000)
  description?: string | null;

  // Non-clearable: null rejected by @IsEnum()
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;
}
```

`UnitStatus` is imported from `../../domain/entities/unit.entity`.

---

## Controller Addition

**File**: `apps/api/src/modules/units/presentation/unit.controller.ts`

Add `PATCH :id` handler alongside existing `GET :id`:

```typescript
@Patch(':id')
@HttpCode(HttpStatus.OK)
@RequiresTenant()
// ... Swagger decorators ...
async update(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
  @Body() dto: UpdateUnitDto,
): Promise<UnitResponseDto> {
  const hasFields = Object.values(dto).some(v => v !== undefined);
  if (!hasFields) {
    throw new BadRequestException('At least one field must be provided to update a unit.');
  }
  const updated = await this.updateUnit.execute({ id, tenantId, data: { ...dto } });
  return UnitResponseDto.fromDomain(updated);
}
```

`UpdateUnitUseCase` added to constructor alongside `GetUnitByIdUseCase`.
