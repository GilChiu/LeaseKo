# Data Model: Get Renter Contact by ID

**Feature**: 042-get-contact-by-id | **Date**: 2026-06-05

---

## No Schema Changes

The `TenantContact` model and all indices were created in US 12.1. No migration needed.

---

## Repository Interface Addition (`application/repositories/tenant-contact.repository.ts`)

Add to `TenantContactRepository`:

```typescript
/**
 * Find an active (non-archived) contact by ID within a workspace.
 * Returns null when: ID does not exist, ID belongs to a different tenant,
 * or the contact has been archived (deletedAt IS NOT NULL).
 * All three cases return null intentionally — callers cannot distinguish them.
 */
findById(id: string, tenantId: string): Promise<TenantContact | null>;
```

No new type definitions needed — method signature uses existing `TenantContact` entity.

---

## Use Case (`application/use-cases/get-tenant-contact-by-id.use-case.ts`)

```typescript
export interface GetTenantContactByIdUseCaseInput {
  id: string;
  tenantId: string;
}
```

**Logic**:
1. Call `repository.findById(input.id, input.tenantId)`
2. If result is `null` → throw `NotFoundException('Contact not found.')`
3. Return `TenantContact`

---

## Prisma Query Pattern (inside `PrismaTenantContactRepository`)

```typescript
async findById(id: string, tenantId: string): Promise<TenantContact | null> {
  const record = await this.prisma.tenantContact.findFirst({
    where: {
      id,
      ...tenantFilter(tenantId),
      deletedAt: null,
    },
  });
  return record ? this.toEntity(record) : null;
}
```

**Key invariants**:
- `tenantFilter(tenantId)` ensures tenant isolation — cross-tenant IDs return null
- `deletedAt: null` ensures archived contacts return null
- `findFirst` (not `findUnique`) to allow the compound WHERE clause with tenantId

---

## Controller Addition (`presentation/contacts.controller.ts`)

```
@Get(':id')
@HttpCode(200)
@RequiresTenant()
findOne(@CurrentTenant() tenantId: string, @Param('id') id: string)
  → returns TenantContactResponseDto
  → throws NotFoundException if use case returns null
```

No new DTOs — reuses `TenantContactResponseDto.fromDomain(contact)`.
