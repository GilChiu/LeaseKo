# Data Model: Repository Abstraction with Prisma Implementations

**Feature**: 015-prisma-repository-abstraction
**Date**: 2026-05-05

This document describes the application-layer type model introduced by this feature. No new Prisma schema changes are required — this feature adds repository interfaces and infrastructure implementations over the existing `User`, `Tenant`, and `TenantMembership` models.

---

## Existing Prisma Models (Read-Only Reference)

These models already exist in `apps/api/prisma/schema.prisma` and are NOT modified by this feature.

```
User
  id            String   (uuid, PK)
  clerkUserId   String   (unique)
  email         String?
  firstName     String?
  lastName      String?
  createdAt     DateTime
  updatedAt     DateTime
  → memberships TenantMembership[]

Tenant
  id            String   (uuid, PK)
  clerkOrgId    String   (unique)
  name          String
  createdAt     DateTime
  updatedAt     DateTime
  → memberships TenantMembership[]

TenantMembership
  id            String   (uuid, PK)
  userId        String   (FK → User.id)
  tenantId      String   (FK → Tenant.id)
  role          String   (default: "member")
  createdAt     DateTime
  updatedAt     DateTime
  ← user        User
  ← tenant      Tenant
  @@unique([userId, tenantId])
  @@index([tenantId])
  @@index([userId])
```

---

## Application-Layer Types

These types are defined in the application layer (`application/repositories/`) and do NOT import from `@prisma/client`. They represent the input/output contracts for repository interfaces.

### UserRecord (output type)

Represents an application-level user record returned from the repository. Does not expose Prisma model internals.

```typescript
interface UserRecord {
  id: string;
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateUserInput (input type)

Used when creating a user record from Clerk webhook/sync data.

```typescript
interface CreateUserInput {
  clerkUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}
```

### UpdateUserProfileInput (input type)

Used when updating a user's basic profile fields.

```typescript
interface UpdateUserProfileInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}
```

---

### TenantRecord (output type)

Represents an application-level tenant record.

```typescript
interface TenantRecord {
  id: string;
  clerkOrgId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateTenantInput (input type)

Used when creating a tenant from Clerk organization data.

```typescript
interface CreateTenantInput {
  clerkOrgId: string;
  name: string;
}
```

### UpdateTenantNameInput (input type)

Used when updating a tenant's display name.

```typescript
interface UpdateTenantNameInput {
  name: string;
}
```

---

### TenantMembershipRecord (output type)

Represents an application-level membership record.

```typescript
interface TenantMembershipRecord {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateTenantMembershipInput (input type)

Used when creating a membership between a user and a tenant.

```typescript
interface CreateTenantMembershipInput {
  userId: string;
  tenantId: string;
  role?: string; // defaults to "member"
}
```

---

## Repository Interface Summary

### UserRepository

| Method | Input | Output | Notes |
|---|---|---|---|
| `findById` | `id: string` | `UserRecord \| null` | Global lookup by internal ID |
| `findByClerkUserId` | `clerkUserId: string` | `UserRecord \| null` | Primary Clerk sync lookup |
| `create` | `CreateUserInput` | `UserRecord` | Creates from Clerk user data |
| `updateBasicProfile` | `id: string, input: UpdateUserProfileInput` | `UserRecord \| null` | Returns null if not found |

### TenantRepository

| Method | Input | Output | Notes |
|---|---|---|---|
| `findById` | `id: string` | `TenantRecord \| null` | Global lookup by internal ID |
| `findByClerkOrgId` | `clerkOrgId: string` | `TenantRecord \| null` | Primary Clerk sync lookup |
| `create` | `CreateTenantInput` | `TenantRecord` | Creates from Clerk org data |
| `updateName` | `id: string, name: string` | `TenantRecord \| null` | Returns null if not found |

### TenantMembershipRepository

| Method | Input | Output | Notes |
|---|---|---|---|
| `findMembership` | `userId: string, tenantId: string` | `TenantMembershipRecord \| null` | Composite key lookup |
| `create` | `CreateTenantMembershipInput` | `TenantMembershipRecord` | Enforces unique constraint |
| `findUserTenants` | `userId: string` | `TenantMembershipRecord[]` | All tenants for a user |
| `findTenantUsers` | `tenantId: string` | `TenantMembershipRecord[]` | All users for a tenant |

---

## DI Token Registry

| Token | Symbol | Bound To |
|---|---|---|
| `USER_REPOSITORY` | `Symbol('USER_REPOSITORY')` | `PrismaUserRepository` |
| `TENANT_REPOSITORY` | `Symbol('TENANT_REPOSITORY')` | `PrismaTenantRepository` |
| `TENANT_MEMBERSHIP_REPOSITORY` | `Symbol('TENANT_MEMBERSHIP_REPOSITORY')` | `PrismaTenantMembershipRepository` |

---

## Module Ownership

| Repository | Interface Module | Implementation Module | Provided By |
|---|---|---|---|
| `UserRepository` | `users` application layer | `users` infrastructure layer | `UsersModule` |
| `TenantRepository` | `tenants` application layer | `tenants` infrastructure layer | `TenantsModule` |
| `TenantMembershipRepository` | `tenants` application layer | `tenants` infrastructure layer | `TenantsModule` |

---

## Layer Dependency Map

```
Presentation (controllers / DTOs)
    ↓ injects via @Inject(TOKEN)
Application (use cases)
    ↓ depends on interface
    UserRepository interface / TenantRepository interface / TenantMembershipRepository interface
    ↑ implemented by
Infrastructure (Prisma repositories)
    PrismaUserRepository / PrismaTenantRepository / PrismaTenantMembershipRepository
    ↓ injects
    PrismaService (database/prisma/prisma.service.ts)
```

No arrows cross from infrastructure to application — dependency direction stays strictly inward.

---

## Schema Change Impact

**None.** This feature introduces no Prisma schema changes, no new migrations, and no modifications to existing models. The implementation is purely additive at the TypeScript/NestJS layer.
