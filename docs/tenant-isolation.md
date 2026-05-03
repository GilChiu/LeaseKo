# Tenant Isolation Architecture

> **Status**: Living document. Updated as new modules are added.
> **Constitution reference**: Principle VI — Multi-Tenancy & Data Isolation (CRITICAL — NON-NEGOTIABLE)

---

## Overview

LeaseKo is a multi-tenant SaaS. Every database table that stores business data owned by a tenant MUST include a `tenantId` field. Every query against such a table MUST filter by `tenantId`.

A query that returns data **without** a `tenantId` filter is a **critical security failure** — treated as a P0 incident requiring immediate rollback.

---

## Model Classification

### Tenant-Scoped Models

These models store data owned by a specific tenant. They MUST include:

- `tenantId  String   @map("tenant_id")` field
- `@@index([tenantId])` block-level index for query performance

| Model | Module | Notes |
|-------|--------|-------|
| `Property` | `properties` | Core tenant asset — all CRUD scoped to tenantId |
| `Unit` | `units` | Child of Property; inherits tenant scope |
| `Lease` | `leases` | Links Unit to a lessee within a tenant |
| `Payment` | `payments` | Financial records owned by tenant |
| `MaintenanceRequest` | `maintenance` | Service requests per property/tenant |
| `Notification` | `notifications` | Alerts and messages scoped to tenant |
| `Document` | `documents` | File attachments owned by tenant |
| `TenantSettings` | `config` | Tenant-specific configuration values |

**Prisma schema pattern for every tenant-scoped model**:

```prisma
model Property {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  // ... other fields
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([tenantId])
  @@map("properties")
}
```

> **Naming rule**: Use `tenantId` (camelCase) in the Prisma TypeScript model. Prisma maps this to `tenant_id` (snake_case) in PostgreSQL via `@map("tenant_id")`. All TypeScript code — including `tenantFilter` — uses `tenantId` and Prisma handles the column name automatically.

---

### Global / Identity Models (Explicit Exceptions)

These models are NOT scoped to a single tenant. They do NOT have a `tenantId` field.

| Model | Reason for Exception |
|-------|---------------------|
| `Tenant` | Represents the organisation itself. Adding `tenantId` to a `Tenant` row would be circular — the tenant IS the ownership boundary. |
| `User` | A user can belong to multiple tenants. The user's identity is cross-tenant. Tenant membership is expressed via `TenantMembership`, not by adding `tenantId` to `User`. |
| `TenantMembership` | Junction table that maps `userId ↔ tenantId` with a role. It *contains* a `tenantId` foreign key but this is a relationship field, not a data-isolation field. The model itself is not owned by any single tenant. |

**Cross-tenant query rule**: To query global models on behalf of a tenant — for example "find all members of tenant X" — filter via the `TenantMembership` table, never by adding `tenantId` to `User`:

```typescript
// ✅ Correct: filter via the junction table
prisma.tenantMembership.findMany({ where: { tenantId: 'org_123' } })

// ❌ Wrong: do not add tenantId to User
prisma.user.findMany({ where: { tenantId: 'org_123' } })  // User has no tenantId
```

---

## `tenantFilter` Utility

**Import path**: `apps/api/src/common/utils/tenant-filter.util`

```typescript
import { tenantFilter } from '@/common/utils/tenant-filter.util';
```

**Signature**:

```typescript
function tenantFilter(tenantId: string): { tenantId: string }
```

Throws `Error` if `tenantId` is empty or whitespace-only.

**Usage** — spread into every Prisma `where` clause for a tenant-scoped model:

```typescript
// findMany
await prisma.property.findMany({
  where: { ...tenantFilter(tenantId) },
})

// findFirst (by id + tenant)
await prisma.property.findFirst({
  where: { id, ...tenantFilter(tenantId) },
})

// updateMany (atomic compound where — check count for not-found)
const result = await prisma.property.updateMany({
  where: { id, ...tenantFilter(tenantId) },
  data,
})
if (result.count === 0) return null

// deleteMany (atomic compound where)
const result = await prisma.property.deleteMany({
  where: { id, ...tenantFilter(tenantId) },
})
return result.count > 0

// create (inject tenantId, never from data payload)
await prisma.property.create({
  data: { ...dto, tenantId },
})
```

---

## `ITenantScopedRepository<T>` Interface

**Import path**: `apps/api/src/common/repositories/tenant-scoped.repository.interface`

```typescript
import { ITenantScopedRepository } from '@/common/repositories/tenant-scoped.repository.interface';
```

**Method signatures** (all require `tenantId`):

```typescript
interface ITenantScopedRepository<T> {
  findMany(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>
  findById(id: string, tenantId: string): Promise<T | null>
  create(tenantId: string, data: Record<string, unknown>): Promise<T>
  update(id: string, tenantId: string, data: Record<string, unknown>): Promise<T | null>
  delete(id: string, tenantId: string): Promise<boolean>
}
```

**How to extend for a module-specific interface**:

```typescript
// apps/api/src/modules/properties/domain/property.repository.interface.ts
import { ITenantScopedRepository } from '@/common/repositories/tenant-scoped.repository.interface';
import { Property } from './property.entity';
import { CreatePropertyDto } from '../application/dto/create-property.dto';
import { UpdatePropertyDto } from '../application/dto/update-property.dto';

export interface IPropertyRepository extends ITenantScopedRepository<Property> {
  // Typed overrides replace the generic Record<string, unknown>
  create(tenantId: string, data: CreatePropertyDto): Promise<Property>;
  update(id: string, tenantId: string, data: UpdatePropertyDto): Promise<Property | null>;
}
```

---

## tenantId Data Flow

```
Clerk-issued JWT (org claim: o.id)
  ↓
ClerkJwtGuard.canActivate()
  → verifyToken(jwt) → payload.o?.id → tenantId
  → request.user = { userId, tenantId, role }
  ↓
@RequiresTenant() decorator on controller/method
  → guard throws ForbiddenException if tenantId is null
  ↓
@CurrentUser() / @CurrentTenant() parameter decorator
  → injects IRequestContext (or string tenantId) into controller method
  ↓
Controller (thin — no business logic)
  → calls use case with IRequestContext
  ↓
Use Case (application layer)
  → extracts context.tenantId
  → calls repository.findMany(context.tenantId)
  ↓
Repository interface boundary (application → infrastructure)
  → tenantId is now a plain string — no HTTP types cross this boundary
  ↓
Prisma repository implementation (infrastructure)
  → tenantFilter(tenantId) in every where clause
  → Prisma generates: WHERE tenant_id = $1
  ↓
PostgreSQL — tenant-scoped row(s) returned
```

---

## Safe Query Patterns

```typescript
// ✅ findMany — always include tenantFilter
prisma.property.findMany({ where: { ...tenantFilter(tenantId) } })

// ✅ findFirst by id — include tenantId in compound where
prisma.property.findFirst({ where: { id, ...tenantFilter(tenantId) } })

// ✅ create — inject tenantId from parameter, NEVER from dto
prisma.property.create({ data: { ...dto, tenantId } })

// ✅ updateMany — atomic compound where, count check prevents silent miss
const r = await prisma.property.updateMany({
  where: { id, ...tenantFilter(tenantId) },
  data,
})
if (r.count === 0) return null  // not found OR wrong tenant — intentionally ambiguous

// ✅ deleteMany — atomic compound where
const r = await prisma.property.deleteMany({
  where: { id, ...tenantFilter(tenantId) },
})
return r.count > 0
```

---

## Forbidden Query Patterns

```typescript
// ❌ Unscoped findMany — returns ALL tenants' data
prisma.property.findMany()

// ❌ id-only update — attacker can overwrite any tenant's record
prisma.property.update({ where: { id }, data })

// ❌ id-only delete — attacker can delete any tenant's record
prisma.property.delete({ where: { id } })

// ❌ tenantId from request body — client controls tenant scope
@Post()
create(@Body() dto: { tenantId: string; name: string }) { ... }

// ❌ tenantId from query param — client controls tenant scope
@Get()
list(@Query('tenantId') tenantId: string) { ... }

// ❌ Prisma in use case — bypasses repository abstraction
class GetPropertiesUseCase {
  constructor(private readonly prisma: PrismaClient) {}  // FORBIDDEN
}

// ❌ Prisma in controller — bypasses both use case and repository
@Controller('properties')
class PropertiesController {
  constructor(private readonly prisma: PrismaClient) {}  // FORBIDDEN
}
```

---

## Clean Architecture Layer Rules

| Layer | May import | Must NOT import |
|-------|-----------|-----------------|
| **Domain** (`domain/`) | Nothing external | NestJS, Prisma, Express, `IRequestContext`, HTTP types |
| **Application** (`application/`) | Domain entities, repository interfaces, `IRequestContext` | `@prisma/client`, Express, HTTP request objects |
| **Infrastructure** (`infrastructure/`) | Application interfaces, `@prisma/client`, NestJS providers | `IRequestContext` (receives plain `tenantId: string`), HTTP |
| **Presentation** (`presentation/`) | Application use cases, DTOs, NestJS decorators | `@prisma/client`, repository implementations (inject interfaces only) |

**Key rule**: The repository interface is the boundary between Application and Infrastructure. `tenantId` crosses this boundary as a plain `string`, not as part of `IRequestContext`.

---

## Future Prisma Setup Notes (Feature 012)

When installing Prisma, follow these steps to align with this architecture:

1. **Install**: `pnpm --filter api add @prisma/client` + `pnpm --filter api add -D prisma`
2. **Init**: `pnpm --filter api exec prisma init` → creates `apps/api/prisma/schema.prisma`
3. **Generator**: `generator client { provider = "prisma-client-js" }` (default — no extra config needed for `@map`)
4. **Every tenant-scoped model must have**:
   ```prisma
   tenantId  String   @map("tenant_id")
   @@index([tenantId])
   ```
5. **Global models** (`Tenant`, `User`, `TenantMembership`) — no `tenantId` field, but `TenantMembership` has `tenantId` as a plain FK
6. **PrismaService** lives in `apps/api/src/database/` (already exists) — inject it in repository implementations only
7. **All repository implementations** import `tenantFilter` from `@/common/utils/tenant-filter.util`
8. **`updateMany`/`deleteMany`** are the safe mutation pattern — use them with `{ id, tenantId }` compound where
