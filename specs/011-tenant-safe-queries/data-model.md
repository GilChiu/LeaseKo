# Data Model: Tenant-Safe Query Enforcement

**Feature**: 011 — Tenant-Safe Query Enforcement
**Created**: 2026-05-03

---

## Model Classification

### Tenant-Scoped Models

These models represent business data owned by a tenant. They MUST have:
- `tenantId String` field mapped to `tenant_id` in PostgreSQL
- `@@index([tenantId])` for query performance

| Model | Bounded Context | Notes |
|-------|-----------------|-------|
| `Property` | Properties | Owned by tenant; all CRUD scoped to tenantId |
| `Unit` | Units | Child of Property; inherits tenant scope |
| `Lease` | Leases | Links tenant-scoped Unit + external Tenant |
| `Payment` | Payments | Financial records owned by tenant |
| `MaintenanceRequest` | Maintenance | Service requests per tenant |
| `Notification` | Notifications | Alerts/messages scoped to tenant |
| `Document` | Documents | File attachments owned by tenant |
| `TenantSettings` | Config | Tenant-specific configuration |

### Global / Identity Models (Exceptions)

These models are NOT scoped to a single tenant. They do NOT have `tenantId`.

| Model | Reason for Exception |
|-------|---------------------|
| `Tenant` | Represents the org itself — adding `tenantId` to a tenant would be circular |
| `User` | A user can belong to multiple tenants via `TenantMembership` — the user identity is cross-tenant |
| `TenantMembership` | Junction table mapping `userId ↔ tenantId` with a role — the relationship IS the cross-tenant concept |

**Rule**: When querying a global model ON BEHALF of a tenant (e.g. "find all members of this tenant"), filter by the `tenantId` column in the `TenantMembership` table — not by adding `tenantId` to the `User` model.

---

## Core Shared Infrastructure

### `tenantFilter` Utility

**File**: `apps/api/src/common/utils/tenant-filter.util.ts`

```typescript
export interface TenantWhereClause {
  tenantId: string;
}

/**
 * Returns a Prisma-compatible where clause fragment that scopes a query to a tenant.
 * Use this in every repository method for tenant-scoped models.
 *
 * @param tenantId - The verified tenant ID from request context. Must be non-empty.
 * @throws Error if tenantId is empty or null-like.
 */
export function tenantFilter(tenantId: string): TenantWhereClause {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('tenantId is required for tenant-scoped queries');
  }
  return { tenantId };
}
```

**Usage in Prisma repository**:
```typescript
// findMany
await prisma.property.findMany({
  where: { ...tenantFilter(tenantId) }
})

// findFirst (by id + tenant)
await prisma.property.findFirst({
  where: { id, ...tenantFilter(tenantId) }
})

// updateMany (scoped — check count for not-found)
const result = await prisma.property.updateMany({
  where: { id, ...tenantFilter(tenantId) },
  data,
})
if (result.count === 0) return null

// deleteMany (scoped — check count for not-found)
const result = await prisma.property.deleteMany({
  where: { id, ...tenantFilter(tenantId) },
})
return result.count > 0
```

---

### `ITenantScopedRepository<T>` Interface

**File**: `apps/api/src/common/repositories/tenant-scoped.repository.interface.ts`

```typescript
/**
 * Base interface for all tenant-scoped Prisma repository implementations.
 *
 * Rules enforced by this interface:
 * - Every read method requires tenantId.
 * - Every mutation method requires both id and tenantId.
 * - No method accepts an HTTP Request object or JWT token.
 */
export interface ITenantScopedRepository<T> {
  /**
   * Return all records belonging to a tenant, with optional additional filters.
   */
  findMany(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Find a single record by its ID, scoped to a tenant.
   * Returns null if the record does not exist OR belongs to a different tenant.
   */
  findById(id: string, tenantId: string): Promise<T | null>;

  /**
   * Create a new record for a tenant.
   * tenantId is injected by the repository — it must NOT come from the caller's data payload.
   */
  create(tenantId: string, data: Record<string, unknown>): Promise<T>;

  /**
   * Update a record by id, scoped to a tenant.
   * Returns null if the record does not exist OR belongs to a different tenant.
   * This prevents leaking whether a record exists in another tenant.
   */
  update(id: string, tenantId: string, data: Record<string, unknown>): Promise<T | null>;

  /**
   * Delete a record by id, scoped to a tenant.
   * Returns false if the record does not exist OR belongs to a different tenant.
   */
  delete(id: string, tenantId: string): Promise<boolean>;
}
```

---

## Clean Architecture Data Flow

```
Clerk verified JWT
  → ClerkJwtGuard (guard layer)
    → request.user = { userId, tenantId, role }
      → @CurrentTenant() decorator (presentation layer)
        → Controller method receives tenantId
          → Use Case called with tenantId (application layer)
            → Repository interface called with tenantId (application → infrastructure boundary)
              → Prisma repository uses tenantFilter(tenantId) in every where clause
                → tenant_id-filtered SQL query to PostgreSQL
```

**Layer rules**:

| Layer | May import | Must NOT import |
|-------|-----------|-----------------|
| Domain | Nothing | NestJS, Prisma, Express, IRequestContext |
| Application | Domain, repository interfaces | Prisma, Express, NestJS decorators |
| Infrastructure | Application interfaces, Prisma | IRequestContext, HTTP |
| Presentation | Application use cases, DTOs | Prisma, repository implementations |

---

## State Transitions

Not applicable for this feature — no new state machines or workflow entities are introduced. This feature defines shared infrastructure interfaces and utilities only.
