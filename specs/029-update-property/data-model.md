# Data Model: Update Property

**Feature**: 029-update-property
**Date**: 2026-06-04

---

## No Schema Changes

No new Prisma models, columns, or migrations are required.

---

## Existing Infrastructure Used

### `PropertyRepository.update` (already exists)

```typescript
update(
  id: string,
  tenantId: string,
  input: UpdatePropertyInput,
): Promise<Property | null>
```

Returns the updated `Property` entity on success. Returns `null` when no matching non-deleted record exists for the given `id + tenantId` combination (Prisma P2025). Both "not found" and "wrong tenant" cases return `null` — intentionally indistinguishable.

### `UpdatePropertyInput` (already exists in `property-repository.types.ts`)

```typescript
export interface UpdatePropertyInput {
  name?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  propertyType?: string;
  description?: string | null;
}
```

---

## New Presentation Layer

### `UpdatePropertyDto` (new)

File: `presentation/dto/update-property.dto.ts`

All fields optional. Class-level validator enforces at least one field present. `tenantId` is intentionally absent — rejected by the global `ValidationPipe` with `forbidNonWhitelisted: true`.

| Field | Type | Constraints |
|-------|------|-------------|
| name | string? | `@IsOptional`, `@IsString`, `@MaxLength(120)` |
| addressLine1 | string? | `@IsOptional`, `@IsString`, `@MaxLength(255)` |
| addressLine2 | string? | `@IsOptional`, `@IsString`, `@MaxLength(255)` |
| city | string? | `@IsOptional`, `@IsString`, `@MaxLength(120)` |
| state | string? | `@IsOptional`, `@IsString`, `@MaxLength(120)` |
| postalCode | string? | `@IsOptional`, `@IsString`, `@MaxLength(30)` |
| country | string? | `@IsOptional`, `@IsString`, `@MaxLength(120)` |
| propertyType | string? | `@IsOptional`, `@IsString`, `@MaxLength(80)` |
| description | string? | `@IsOptional`, `@IsString`, `@MaxLength(1000)` |
| *(class-level)* | — | `@Validate(AtLeastOnePropertyFieldConstraint)` |

---

## Error Behaviour

| Condition | Repository returns | Use case throws | HTTP status |
|---|---|---|---|
| Valid update, correct tenant | Updated `Property` entity | — (returns DTO) | 200 OK |
| Empty body (no fields) | — (never called) | ValidationPipe rejects | 400 Bad Request |
| Property not found | `null` | `NotFoundException` | 404 Not Found |
| Property found, wrong tenant | `null` | `NotFoundException` | 404 Not Found |
| Soft-deleted property | `null` | `NotFoundException` | 404 Not Found |
