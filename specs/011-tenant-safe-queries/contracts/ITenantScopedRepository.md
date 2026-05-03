# Contract: ITenantScopedRepository<T>

**Feature**: 011 — Tenant-Safe Query Enforcement
**Version**: 1.0.0
**Type**: TypeScript interface (internal architecture contract)

---

## Overview

`ITenantScopedRepository<T>` is the architectural contract that all Prisma repository implementations for tenant-scoped business models must satisfy.

This is an **internal developer contract** — not a public HTTP API. Its consumers are use cases in the application layer. Its implementors are Prisma repositories in the infrastructure layer.

---

## Contract Location

```
apps/api/src/common/repositories/tenant-scoped.repository.interface.ts
```

---

## Method Signatures

```typescript
interface ITenantScopedRepository<T> {
  findMany(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>
  findById(id: string, tenantId: string): Promise<T | null>
  create(tenantId: string, data: Record<string, unknown>): Promise<T>
  update(id: string, tenantId: string, data: Record<string, unknown>): Promise<T | null>
  delete(id: string, tenantId: string): Promise<boolean>
}
```

---

## Method Contracts

### `findMany(tenantId, filters?)`

| Field | Value |
|-------|-------|
| Input: tenantId | Non-empty string. Required. |
| Input: filters | Optional additional where conditions (beyond tenantId). |
| Output | Array of T. Empty array if no records found (never null). |
| Tenant Safety | Implementation MUST include `tenantFilter(tenantId)` in the Prisma where clause. |
| Side Effects | None. |

### `findById(id, tenantId)`

| Field | Value |
|-------|-------|
| Input: id | Record UUID. Required. |
| Input: tenantId | Non-empty string. Required. |
| Output | `T` if found and owned by tenant, `null` otherwise. |
| Tenant Safety | Must NOT return a record belonging to a different tenant. Returns null for both "not found" and "wrong tenant" — these are indistinguishable to callers. |
| Side Effects | None. |

### `create(tenantId, data)`

| Field | Value |
|-------|-------|
| Input: tenantId | Non-empty string. Required. Injected by repository, NOT from data payload. |
| Input: data | Record fields excluding `id`, `tenantId`, `createdAt`, `updatedAt`. |
| Output | The newly created record T with all fields including generated ones. |
| Tenant Safety | Implementation MUST set `tenantId` from the parameter, never from `data`. |
| Side Effects | Inserts one row into the database. |

### `update(id, tenantId, data)`

| Field | Value |
|-------|-------|
| Input: id | Record UUID. Required. |
| Input: tenantId | Non-empty string. Required. |
| Input: data | Partial record fields (excluding id, tenantId). |
| Output | Updated record T if found and owned by tenant, `null` otherwise. |
| Tenant Safety | Implementation MUST include both `id` and `tenantId` in the where clause atomically. The query MUST NOT execute as two steps (lookup then update). |
| Side Effects | Updates one row. If row does not belong to tenant, no rows are modified. |

### `delete(id, tenantId)`

| Field | Value |
|-------|-------|
| Input: id | Record UUID. Required. |
| Input: tenantId | Non-empty string. Required. |
| Output | `true` if the record was deleted, `false` if not found or not owned by tenant. |
| Tenant Safety | Implementation MUST include both `id` and `tenantId` in the where clause atomically. |
| Side Effects | Deletes one row. If row does not belong to tenant, no rows are deleted. |

---

## Forbidden Patterns

These patterns violate the contract and MUST NOT appear in any implementation:

```typescript
// ❌ FORBIDDEN — id-only update (cross-tenant risk)
await prisma.property.update({ where: { id }, data })

// ❌ FORBIDDEN — id-only delete (cross-tenant risk)
await prisma.property.delete({ where: { id } })

// ❌ FORBIDDEN — missing tenantId in findMany
await prisma.property.findMany()

// ❌ FORBIDDEN — tenantId from data payload
create(data: { tenantId: string, ...rest })
```

---

## Implementation Pattern (Prisma)

```typescript
// Example: PrismaPropertyRepository implements ITenantScopedRepository<Property>

findMany(tenantId: string): Promise<Property[]> {
  return this.prisma.property.findMany({
    where: { ...tenantFilter(tenantId) },
  });
}

findById(id: string, tenantId: string): Promise<Property | null> {
  return this.prisma.property.findFirst({
    where: { id, ...tenantFilter(tenantId) },
  });
}

async create(tenantId: string, data: CreatePropertyData): Promise<Property> {
  return this.prisma.property.create({
    data: { ...data, tenantId },
  });
}

async update(id: string, tenantId: string, data: UpdatePropertyData): Promise<Property | null> {
  const result = await this.prisma.property.updateMany({
    where: { id, ...tenantFilter(tenantId) },
    data,
  });
  if (result.count === 0) return null;
  return this.findById(id, tenantId);
}

async delete(id: string, tenantId: string): Promise<boolean> {
  const result = await this.prisma.property.deleteMany({
    where: { id, ...tenantFilter(tenantId) },
  });
  return result.count > 0;
}
```

---

## Version History

| Version | Change |
|---------|--------|
| 1.0.0 | Initial contract — `findMany`, `findById`, `create`, `update`, `delete` |
