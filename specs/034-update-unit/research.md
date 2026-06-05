# Research: Update Unit (Feature 034)

## Decision 1: Null-Clearing Validation Strategy

**Decision**: For optional clearable fields (`floorArea`, `bedrooms`, `bathrooms`, `monthlyRent`, `description`), use `@IsOptional()` + `@ValidateIf(o => o.field !== null)` + field-specific validators in `UpdateUnitDto`.

**Rationale**: `@IsOptional()` skips all subsequent validators when the value is `undefined` (field omitted). `@ValidateIf(o => o.field !== null)` skips subsequent validators when the value is explicitly `null`. Combined, this allows:
- `undefined` → field omitted → skips all validators → field unchanged in DB
- `null` → explicit null sent → skips validators → null stored in DB (clear the field)
- valid value → validators run → stored in DB

For non-clearable fields (`unitNumber`, `status`), only `@IsOptional()` is used. Since `null` is not a valid string or enum value, the type validators (`@IsString()`, `@IsEnum()`) naturally reject null.

**Alternatives considered**:
- Custom decorator — overkill for a standard use case; `@ValidateIf` is idiomatic class-validator
- Global transform to strip nulls — rejected; would prevent legitimate null-clearing operations

---

## Decision 2: `UpdateUnitInput` Undefined vs Null Semantics

**Decision**: `UpdateUnitInput` uses `undefined` to mean "do not update this field" and `null` to mean "clear this field to null." Non-clearable fields (`unitNumber`, `status`) only allow `undefined` (omit) or a valid value.

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

**Rationale**: This aligns precisely with Prisma's `update` data semantics: `undefined` fields are omitted from the generated SQL; `null` fields generate `SET field = NULL`. No translation layer is needed in the repository.

**Alternatives considered**:
- Separate "clear" flags (e.g. `clearFloorArea: boolean`) — more verbose, harder to validate and document; the `null` convention is the REST/JSON standard

---

## Decision 3: P2025 and P2002 Handling in Repository

**Decision**: `PrismaUnitRepository.update()` catches `PrismaClientKnownRequestError`:
- `P2025` (record not found on update) → return `null` → use case throws `NotFoundException`
- `P2002` (unique constraint violation on `[propertyId, unitNumber]`) → throw `ConflictException('Unit number already exists under this property.')`

**Rationale**: Mirrors the patterns established in `PrismaPropertyRepository.update()` (P2025 → null) and `PrismaUnitRepository.create()` (P2002 → ConflictException). Consistent error handling across all repository methods.

**Why P2002 doesn't fire when unitNumber is unchanged**: When updating `unitNumber` to its current value (e.g. "101" → "101"), the `@@unique([propertyId, unitNumber])` constraint is not violated because the record already holds that combination. Prisma's update is applied to the same row, so the unique check passes.

**Alternatives considered**:
- Pre-check for duplicate before update (SELECT + UPDATE) — rejected; TOCTOU race condition; DB constraint + catch is atomic

---

## Decision 4: Empty Payload Rejection Location

**Decision**: The controller checks for an empty payload before calling the use case and throws `BadRequestException` directly.

**Rationale**: This is exactly how `PropertiesController.update()` handles it: `const fields = Object.values(dto).filter(v => v !== undefined); if (fields.length === 0) throw new BadRequestException(...)`. Keeping this check in the controller keeps the use case pure (no HTTP concern). The check counts fields where the value is not `undefined` — a payload with all fields as `null` IS valid (clearing all optional fields), so only `undefined` values are "empty".

**Alternatives considered**:
- Custom class-validator decorator on `UpdateUnitDto` — possible but adds complexity; controller check is simpler and follows existing project patterns
- Move check to use case — rejected; use cases should not throw HTTP-specific exceptions like `BadRequestException`

---

## Decision 5: `monthlyRent` Decimal Handling in Update

**Decision**: The repository passes `input.monthlyRent` directly to Prisma's `data` object. Prisma auto-converts `number` to `Decimal`, `null` sets the field to null, and `undefined` omits the field from the update.

**Rationale**: No special conversion needed on write. The `toEntity()` method already converts `Prisma.Decimal` → `number` on read (via `.toNumber()`). This is the same pattern used in `create()`.
