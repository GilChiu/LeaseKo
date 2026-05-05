# Contract: TenantRepository

**Layer**: Application
**Owner**: TenantsModule
**DI Token**: `TENANT_REPOSITORY`
**Token Location**: `apps/api/src/modules/tenants/application/repositories/tenant.repository.ts`
**Interface Location**: `apps/api/src/modules/tenants/application/repositories/tenant.repository.ts`
**Implementation**: `PrismaTenantRepository` at `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant.repository.ts`

---

## Purpose

Defines the data access contract for the `Tenant` domain entity. `Tenant` is a global identity/infrastructure model — it represents the organization boundary itself and does not carry a `tenantId` filter.

Tenants are looked up by `clerkOrgId` for Clerk organization sync operations and by `id` for internal relationships.

---

## Interface Definition

```typescript
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');

export interface TenantRecord {
  id: string;
  clerkOrgId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  clerkOrgId: string;
  name: string;
}

export interface TenantRepository {
  findById(id: string): Promise<TenantRecord | null>;
  findByClerkOrgId(clerkOrgId: string): Promise<TenantRecord | null>;
  create(input: CreateTenantInput): Promise<TenantRecord>;
  updateName(id: string, name: string): Promise<TenantRecord | null>;
}
```

---

## Method Contracts

### `findById(id: string): Promise<TenantRecord | null>`
- Returns the tenant record with the given internal UUID.
- Returns `null` if no tenant with that ID exists.
- Used when resolving internal relationships (e.g., loading tenant context).

### `findByClerkOrgId(clerkOrgId: string): Promise<TenantRecord | null>`
- Returns the tenant record matching the given Clerk organization ID.
- Returns `null` if no matching tenant exists.
- Used by Clerk organization sync and JWT guard tenant resolution.

### `create(input: CreateTenantInput): Promise<TenantRecord>`
- Creates a new tenant record from Clerk organization data.
- Throws (normalized from Prisma P2002) if `clerkOrgId` already exists.
- Returns the created `TenantRecord`.

### `updateName(id: string, name: string): Promise<TenantRecord | null>`
- Updates the `name` field for the tenant with the given ID.
- Returns `null` if no tenant with that ID exists.
- Returns the updated `TenantRecord` on success.

---

## Constraints

- MUST NOT import `@prisma/client` or any Prisma type.
- MUST NOT accept `Request`, `ExecutionContext`, or JWT token as a parameter.
- MUST return `null` for not-found scenarios.
- MUST be mockable with a plain TypeScript object for unit testing.

---

## NestJS Provider Wiring

```typescript
// In TenantsModule providers:
{
  provide: TENANT_REPOSITORY,
  useClass: PrismaTenantRepository,
}
```
