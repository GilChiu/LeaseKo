# Data Model — LeaseKo

**Last Updated**: Feature 013 (Prisma Base Models)
**Schema**: `apps/api/prisma/schema.prisma`

---

## Overview

LeaseKo uses a Prisma + PostgreSQL data model structured around three base identity and tenancy models. All future business models are tenant-scoped and must follow the pattern documented in this file.

---

## Base Models (Global — No `tenantId`)

The following three models are explicitly exempt from the tenant-scoping requirement. They represent the identity and organisational structure of the system.

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Internal user record mapped to a Clerk identity |
| `Tenant` | `tenants` | Internal tenant record mapped to a Clerk organisation |
| `TenantMembership` | `tenant_memberships` | Junction — maps which users belong to which tenants and with what role |

**Rule**: Any future model added to this list must be explicitly documented here with a justification.

---

## User

**Table**: `users`

Represents an authenticated application user. Each `User` maps to exactly one Clerk user account via `clerkUserId`. A user can belong to multiple tenants through `TenantMembership`.

### Why `User` is not directly tenant-scoped

A user may be a member of multiple organisations (e.g., a contractor working for two landlords). Making `User` tenant-scoped would require duplicating user records per tenant, which violates normalisation and makes cross-tenant identity management complex. The `TenantMembership` junction is the correct location for user-tenant access.

### Clerk Mapping

| Prisma field | Clerk equivalent | Notes |
|-------------|-----------------|-------|
| `clerkUserId` | `user.id` from Clerk JWT | Unique; guaranteed by Clerk |
| `email` | `user.emailAddresses[0]` | Optional — may be absent on phone-auth accounts |
| `firstName` | `user.firstName` | Optional — may not be set on creation |
| `lastName` | `user.lastName` | Optional — may not be set on creation |

### Fields

| Field | Type | DB Column | Notes |
|-------|------|-----------|-------|
| `id` | `String` UUID PK | `id` | Internal application ID |
| `clerkUserId` | `String` `@unique` | `clerk_user_id` | Clerk user identity |
| `email` | `String?` | `email` | Nullable — synced from Clerk |
| `firstName` | `String?` | `first_name` | Nullable |
| `lastName` | `String?` | `last_name` | Nullable |
| `createdAt` | `DateTime` | `created_at` | Auto-set on insert |
| `updatedAt` | `DateTime` | `updated_at` | Auto-updated |

---

## Tenant

**Table**: `tenants`

Represents a property management organisation (landlord, company, or individual) mapped to a Clerk organisation. The `Tenant` record is the root of all tenant-scoped business data. Every `Property`, `Unit`, `Lease`, etc. belongs to exactly one `Tenant`.

### Clerk Mapping

| Prisma field | Clerk equivalent | Notes |
|-------------|-----------------|-------|
| `clerkOrgId` | `org.id` from Clerk JWT | Unique; guaranteed by Clerk; extracted as `tenantId` in request context |
| `name` | `org.name` | Display name; required |

### Fields

| Field | Type | DB Column | Notes |
|-------|------|-----------|-------|
| `id` | `String` UUID PK | `id` | Internal application ID |
| `clerkOrgId` | `String` `@unique` | `clerk_org_id` | Clerk organisation identity |
| `name` | `String` | `name` | Organisation display name |
| `createdAt` | `DateTime` | `created_at` | Auto-set on insert |
| `updatedAt` | `DateTime` | `updated_at` | Auto-updated |

---

## TenantMembership

**Table**: `tenant_memberships`

Junction model linking a `User` to a `Tenant`. A user can be a member of many tenants; a tenant can have many users. The `role` field prepares for backend RBAC — authorization is owned by the backend, not by Clerk.

### Why TenantMembership exists

- A user may legitimately belong to multiple tenants (multi-org support)
- The backend must own authorization decisions — Clerk roles are for identity only
- `role` in this table enables fine-grained permission checks without a separate permissions service
- Prevents direct coupling between the global `User` record and any single tenant

### Role Strategy

`role` is stored as a plain `String` (not an enum) with a default of `"member"`. This allows future RBAC roles (e.g., `"admin"`, `"owner"`, `"viewer"`) to be added without a database migration. Role enforcement happens in backend guards — never in the frontend.

### Fields

| Field | Type | DB Column | Notes |
|-------|------|-----------|-------|
| `id` | `String` UUID PK | `id` | Internal ID |
| `userId` | `String` FK → `users.id` | `user_id` | Cascade delete |
| `tenantId` | `String` FK → `tenants.id` | `tenant_id` | Cascade delete; indexed |
| `role` | `String` | `role` | Default: `"member"` |
| `createdAt` | `DateTime` | `created_at` | Auto-set on insert |
| `updatedAt` | `DateTime` | `updated_at` | Auto-updated |

### Constraints and Indexes

| Constraint / Index | Purpose |
|-------------------|---------|
| `@@unique([userId, tenantId])` | Prevents duplicate membership rows |
| `@@index([tenantId])` | Fast lookup: all members of a tenant |
| `@@index([userId])` | Fast lookup: all tenants a user belongs to |

---

## Naming Convention

| Context | Convention | Example |
|---------|-----------|---------|
| Prisma field (TypeScript) | `camelCase` | `clerkUserId` |
| PostgreSQL column | `snake_case` via `@map` | `clerk_user_id` |
| PostgreSQL table | `snake_case` via `@@map` | `tenant_memberships` |

---

## Tenant-Scoped Model Pattern (MANDATORY for Feature 014+)

Every business model that stores tenant data **MUST** follow this pattern exactly. No exceptions.

### Prisma Schema Template

```prisma
model ExampleModel {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  // ... domain-specific fields ...
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("example_models")
}
```

### Requirements

| Requirement | Reason |
|------------|--------|
| `tenantId String @map("tenant_id")` | **MANDATORY** — data isolation field |
| `tenant Tenant @relation(...)` | **MANDATORY** — referential integrity; cascade delete when tenant removed |
| `@@index([tenantId])` | **MANDATORY** — all tenant-scoped queries filter by `tenantId`; index is essential for performance |
| `@@map("snake_case_plural")` | **MANDATORY** — naming convention |

### Repository Template

All repository methods for tenant-scoped models **MUST** use `tenantFilter()`:

```typescript
import { tenantFilter } from '@/common/utils/tenant-filter.util';

@Injectable()
export class PropertyPrismaRepository implements IPropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(tenantId: string): Promise<Property[]> {
    return this.prisma.property.findMany({
      where: tenantFilter(tenantId),
    });
  }

  async findById(tenantId: string, id: string): Promise<Property | null> {
    return this.prisma.property.findFirst({
      where: { ...tenantFilter(tenantId), id },
    });
  }
}
```

> **Security rule**: `tenantId` is extracted from the verified Clerk JWT in the request context. It is **NEVER** accepted from the request body, query parameters, or headers.

---

## Global Model Exception Register

The following models are explicitly approved as global (no `tenantId`):

| Model | Approved In | Justification |
|-------|------------|---------------|
| `User` | Feature 013 | Global Clerk identity; multi-tenant access via `TenantMembership` |
| `Tenant` | Feature 013 | IS the tenant boundary; cannot scope itself |
| `TenantMembership` | Feature 013 | Junction table; `tenantId` is a FK reference, not an isolation field |

Any future model added to this list requires explicit sign-off and documentation here.

---

## Planned Business Models (Feature 014+)

All of the following will carry `tenantId` + `@@index([tenantId])`:

| Model | Feature | Module |
|-------|---------|--------|
| `Property` | 014 | Properties |
| `Unit` | 015 | Units |
| `Lease` | 016 | Leases |
| `Payment` | 017 | Payments |
| `MaintenanceRequest` | 018 | Maintenance |
| `Notification` | 019 | Notifications |

---

## See Also

- [docs/tenant-isolation.md](tenant-isolation.md) — tenant-safe query enforcement, forbidden patterns, architecture rules
- [apps/api/src/common/utils/tenant-filter.util.ts](../apps/api/src/common/utils/tenant-filter.util.ts) — `tenantFilter()` utility
- [apps/api/src/common/repositories/tenant-scoped.repository.interface.ts](../apps/api/src/common/repositories/tenant-scoped.repository.interface.ts) — `ITenantScopedRepository<T>` interface
- [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma) — full Prisma schema
