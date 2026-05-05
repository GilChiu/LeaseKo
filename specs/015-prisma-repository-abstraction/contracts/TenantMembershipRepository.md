# Contract: TenantMembershipRepository

**Layer**: Application
**Owner**: TenantsModule
**DI Token**: `TENANT_MEMBERSHIP_REPOSITORY`
**Token Location**: `apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts`
**Interface Location**: `apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts`
**Implementation**: `PrismaTenantMembershipRepository` at `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant-membership.repository.ts`

---

## Purpose

Defines the data access contract for the `TenantMembership` join model. This model represents the relationship between a `User` and a `Tenant`, including the user's role within that tenant.

Unlike future tenant-scoped business models, `TenantMembership` is a global identity model that uses `userId + tenantId` as a composite lookup key — not as a tenant isolation filter in the `ITenantScopedRepository` sense.

---

## Interface Definition

```typescript
export const TENANT_MEMBERSHIP_REPOSITORY = Symbol('TENANT_MEMBERSHIP_REPOSITORY');

export interface TenantMembershipRecord {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantMembershipInput {
  userId: string;
  tenantId: string;
  role?: string; // defaults to "member"
}

export interface TenantMembershipRepository {
  findMembership(userId: string, tenantId: string): Promise<TenantMembershipRecord | null>;
  create(input: CreateTenantMembershipInput): Promise<TenantMembershipRecord>;
  findUserTenants(userId: string): Promise<TenantMembershipRecord[]>;
  findTenantUsers(tenantId: string): Promise<TenantMembershipRecord[]>;
}
```

---

## Method Contracts

### `findMembership(userId: string, tenantId: string): Promise<TenantMembershipRecord | null>`
- Returns the membership record for the given user-tenant pair.
- Returns `null` if no membership exists.
- Uses the composite unique index `[userId, tenantId]`.
- Used by auth guards to verify a user's membership and role in a tenant.

### `create(input: CreateTenantMembershipInput): Promise<TenantMembershipRecord>`
- Creates a new membership record.
- Throws (normalized from Prisma P2002) if the `[userId, tenantId]` pair already exists.
- Defaults `role` to `"member"` if not provided.
- Returns the created `TenantMembershipRecord`.

### `findUserTenants(userId: string): Promise<TenantMembershipRecord[]>`
- Returns all membership records for a given user across all tenants.
- Used to list all organizations a user belongs to.
- Returns empty array if the user has no memberships.

### `findTenantUsers(tenantId: string): Promise<TenantMembershipRecord[]>`
- Returns all membership records for a given tenant.
- Used for member listing and role lookups within a tenant.
- Returns empty array if the tenant has no members.

---

## Important Note: Not an `ITenantScopedRepository`

`TenantMembership` is a **global identity model** — it is not a business model owned by a single tenant in the `ITenantScopedRepository<T>` sense. The `userId + tenantId` pair in this repository's methods are **lookup keys**, not tenant isolation filters.

Future tenant-owned business models (`Property`, `Unit`, `Lease`, etc.) WILL extend `ITenantScopedRepository<T>` and use `tenantFilter()` for all queries.

---

## Constraints

- MUST NOT import `@prisma/client` or any Prisma type.
- MUST NOT accept `Request`, `ExecutionContext`, or JWT token as a parameter.
- MUST return `null` for not-found scenarios (single record lookups).
- MUST return empty array `[]` for not-found scenarios (multi-record lookups).
- MUST be mockable with a plain TypeScript object for unit testing.

---

## NestJS Provider Wiring

```typescript
// In TenantsModule providers:
{
  provide: TENANT_MEMBERSHIP_REPOSITORY,
  useClass: PrismaTenantMembershipRepository,
}
```
