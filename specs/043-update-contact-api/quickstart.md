# Quickstart: Implement Update Renter Contact API

**Feature**: 043-update-contact-api | **Endpoint**: `PATCH /api/v1/contacts/:id`

All changes are additive. No migration.

## Step 1 — Add UpdateTenantContactInput type

Append to `tenant-contact-repository.types.ts`:
```typescript
export interface UpdateTenantContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}
```

## Step 2 — Add update to repository interface

Add to `TenantContactRepository`:
```typescript
update(id: string, tenantId: string, data: UpdateTenantContactInput): Promise<TenantContact | null>;
```

## Step 3 — Implement update in Prisma repository

```typescript
async update(id, tenantId, data): Promise<TenantContact | null> {
  try {
    const record = await this.prisma.tenantContact.update({ where: { id, tenantId }, data });
    return this.toEntity(record);
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') return null;
    throw e;
  }
}
```

## Step 4 — Create UpdateTenantContactUseCase

Logic: empty-check → findById → email uniqueness (self-excluded) → update → return entity.

## Step 5 — Create UpdateTenantContactDto

All fields `@IsOptional()`. No `tenantId` field.

## Step 6 — Add PATCH /:id to controller + register use case in module

## Verification

```powershell
pnpm lint; pnpm typecheck; pnpm build; pnpm --filter @leaseKo/api test
```
