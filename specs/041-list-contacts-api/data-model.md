# Data Model: List Renter Contacts API

**Feature**: 041-list-contacts-api | **Date**: 2026-06-05

---

## No Schema Changes

The `TenantContact` Prisma model, `tenant_contacts` table, and all indices were created in US 12.1. No migration is needed for this feature.

---

## New Repository Types (`application/types/tenant-contact-repository.types.ts`)

Add to the existing file:

```typescript
export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
}

export interface PagedTenantContacts {
  items: TenantContact[];
  total: number;
}
```

---

## Repository Interface Addition (`application/repositories/tenant-contact.repository.ts`)

Add to `TenantContactRepository`:

```typescript
/**
 * Returns a paginated slice of active (non-archived) contacts for a tenant,
 * ordered by createdAt DESC.
 * tenantId MUST come from verified request context — never from client payload.
 */
findPagedByTenant(
  tenantId: string,
  options: FindPagedByTenantOptions,
): Promise<PagedTenantContacts>;
```

---

## Use Case (`application/use-cases/list-tenant-contacts.use-case.ts`)

```typescript
export interface ListTenantContactsUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
}
```

**Logic**: Delegates directly to `repository.findPagedByTenant(tenantId, { page, limit })`. No business rules beyond what the repository enforces — the repository owns soft-delete filtering and tenant scoping.

---

## Query DTO (`presentation/dto/list-contacts-query.dto.ts`)

```typescript
class ListContactsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;         // default 1, minimum 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;       // default 20, minimum 1, maximum 100
}
```

**Coercion**: `@Type(() => Number)` converts query string values to numbers before validation. Non-numeric strings become `NaN` and fail `@IsInt()`. The global `ValidationPipe` is already configured with `transform: true`.

---

## Response DTO (`presentation/dto/paginated-tenant-contacts-response.dto.ts`)

```typescript
class PaginatedTenantContactsResponseDto {
  items: TenantContactResponseDto[];   // array of active contacts (deletedAt excluded)
  total: number;                        // total active contacts in workspace (ignoring pagination)
  page: number;                         // current page (echoed from query)
  limit: number;                        // current limit (echoed from query)

  static fromDomain(
    result: PagedTenantContacts,
    page: number,
    limit: number,
  ): PaginatedTenantContactsResponseDto;
}
```

---

## Controller Addition (`presentation/contacts.controller.ts`)

```
@Get()
@HttpCode(200)
@RequiresTenant()
list(@CurrentTenant() tenantId: string, @Query() query: ListContactsQueryDto)
  → returns PaginatedTenantContactsResponseDto
```

---

## Prisma Query Pattern (inside `PrismaTenantContactRepository`)

```typescript
async findPagedByTenant(
  tenantId: string,
  { page, limit }: FindPagedByTenantOptions,
): Promise<PagedTenantContacts> {
  const skip = (page - 1) * limit;
  const where = { ...tenantFilter(tenantId), deletedAt: null };

  const [records, total] = await this.prisma.$transaction([
    this.prisma.tenantContact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.tenantContact.count({ where }),
  ]);

  return { items: records.map((r) => this.toEntity(r)), total };
}
```

**Key invariants**:
- `tenantFilter(tenantId)` ensures tenant isolation in every query
- `deletedAt: null` excludes archived contacts from both `findMany` and `count`
- `$transaction` guarantees `items` and `total` are consistent snapshots
- `orderBy: { createdAt: 'desc' }` matches spec requirement (newest first)
