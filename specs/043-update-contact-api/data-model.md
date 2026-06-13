# Data Model: Update Renter Contact API

**Feature**: 043-update-contact-api | **Date**: 2026-06-05

---

## No Schema Changes

All fields exist. `updatedAt` is auto-managed by Prisma `@updatedAt`.

---

## New Repository Type (`application/types/tenant-contact-repository.types.ts`)

```typescript
export interface UpdateTenantContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;   // always lowercased before reaching the repository
  phone?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}
```

---

## Repository Interface Addition

```typescript
/**
 * Partially update an active contact. Compound WHERE ensures tenant isolation.
 * Returns null when: id not found, belongs to different tenant, or archived.
 */
update(
  id: string,
  tenantId: string,
  data: UpdateTenantContactInput,
): Promise<TenantContact | null>;
```

---

## Use Case Logic (`update-tenant-contact.use-case.ts`)

```typescript
input: { id, tenantId, firstName?, lastName?, email?, phone?, idNumber?, notes? }
```

1. If all fields `undefined` → throw `BadRequestException('At least one field must be provided.')`
2. Call `repository.findById(id, tenantId)` → null → throw `NotFoundException('Contact not found.')`
3. If `email` provided:
   - `normalizedEmail = email.toLowerCase().trim()`
   - `existing = findByEmail(tenantId, normalizedEmail)`
   - If `existing && existing.id !== id` → throw `ConflictException('A contact with this email already exists in this workspace.')`
4. Build `patchData` with only defined fields (email replaced by `normalizedEmail`)
5. Call `repository.update(id, tenantId, patchData)` → returns updated entity

---

## Prisma Repository Implementation

```typescript
async update(
  id: string,
  tenantId: string,
  data: UpdateTenantContactInput,
): Promise<TenantContact | null> {
  try {
    const record = await this.prisma.tenantContact.update({
      where: { id, tenantId },
      data,
    });
    return this.toEntity(record);
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
      return null;
    }
    throw e;
  }
}
```

---

## Update DTO (`presentation/dto/update-tenant-contact.dto.ts`)

```typescript
class UpdateTenantContactDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  firstName?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  lastName?: string;

  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string | null;

  @IsOptional() @IsString() @MaxLength(50)
  idNumber?: string | null;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string | null;
}
```

**Key**: `tenantId` is absent — stripped by `ValidationPipe(whitelist: true)`.

---

## Controller Addition

```
@Patch(':id')
@HttpCode(200)
@RequiresTenant()
update(@CurrentTenant() tenantId, @Param('id') id, @Body() dto: UpdateTenantContactDto)
  → returns TenantContactResponseDto
```
