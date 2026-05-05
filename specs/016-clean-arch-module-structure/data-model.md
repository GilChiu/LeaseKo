# Data Model: Clean Architecture Module Structure

**Feature**: 016-clean-arch-module-structure
**Date**: 2026-05-05

This feature is structural-only — no new database tables, no new Prisma schema changes, and no new domain entities are introduced. The data model below documents the **architectural type system** that governs module structure and layer boundaries.

---

## Architectural Types (Conceptual Model)

### Module

A NestJS business module (e.g., `AuthModule`, `TenantsModule`, `UsersModule`) that encapsulates a single bounded context.

**Properties**:
- `name`: string — The module's business domain identifier (e.g., `auth`, `tenants`, `users`)
- `layers`: Layer[] — Exactly four layers: `domain`, `application`, `infrastructure`, `presentation`
- `exports`: string[] — Application-layer services or tokens exported for other modules
- `providers`: Provider[] — DI providers internal to the module

**Rule**: A module MUST NOT export infrastructure implementation classes (e.g., `PrismaUserRepository`). It exports only application-layer interfaces via DI tokens.

---

### Layer

One of four structural subdirectories inside a module.

| Layer | Directory | Responsibility |
|---|---|---|
| Domain | `domain/` | Entities, value objects, domain rules, domain errors. No external dependencies. |
| Application | `application/` | Use cases, repository interfaces, DI tokens, application types. No Prisma/NestJS decorators. |
| Infrastructure | `infrastructure/` | Prisma repositories, Clerk adapters, external service clients. Implements application interfaces. |
| Presentation | `presentation/` | Controllers, DTOs, Swagger decorators. Thin — delegates to use cases. |

---

### RepositoryInterface

An application-layer interface defining data access operations for a domain aggregate.

**Examples already defined**:

| Interface | Token | Module | File |
|---|---|---|---|
| `UserRepository` | `USER_REPOSITORY` | users | `application/repositories/user.repository.ts` |
| `TenantRepository` | `TENANT_REPOSITORY` | tenants | `application/repositories/tenant.repository.ts` |
| `TenantMembershipRepository` | `TENANT_MEMBERSHIP_REPOSITORY` | tenants | `application/repositories/tenant-membership.repository.ts` |

**Rules**:
- Interface file contains: the Symbol DI token, all input types, all output types, and the interface declaration
- No `@prisma/client` imports allowed
- Token defined as `export const X_REPOSITORY = Symbol("X_REPOSITORY")`

---

### PrismaRepository

An infrastructure-layer class implementing a `RepositoryInterface` using PrismaService.

**Examples already defined**:

| Class | Implements | Module | File |
|---|---|---|---|
| `PrismaUserRepository` | `UserRepository` | users | `infrastructure/repositories/prisma-user.repository.ts` |
| `PrismaTenantRepository` | `TenantRepository` | tenants | `infrastructure/repositories/prisma-tenant.repository.ts` |
| `PrismaTenantMembershipRepository` | `TenantMembershipRepository` | tenants | `infrastructure/repositories/prisma-tenant-membership.repository.ts` |

**Rules**:
- ONLY file allowed to inject `PrismaService` for a given aggregate
- Must normalize Prisma error codes to application-meaningful responses (P2025 → null, P2002 → descriptive Error)
- Must NEVER expose Prisma model types directly — maps to the record interface (e.g., `UserRecord`)

---

### UseCase

An application-layer service that orchestrates one unit of business work.

**Examples already defined**:

| Class | Input | Output | Module | File |
|---|---|---|---|---|
| `GetCurrentUserUseCase` | `clerkUserId: string` | `Promise<UserRecord \| null>` | users | `application/use-cases/get-current-user.use-case.ts` |
| `VerifyClerkTokenUseCase` | `token: string` | `Promise<{ userId, tenantId }>` | auth | `application/verify-clerk-token.use-case.ts` |

**Rules**:
- Accepts primitive inputs — never an HTTP Request, JWT token object, or Express context
- Annotated with `@Injectable()`
- Injects repository interfaces via `@Inject(TOKEN)` — never concrete implementation classes
- Has a single public `execute(...)` method

---

### DI Token Registry

All DI tokens in the application:

| Token | Value | Bound To | Exported By |
|---|---|---|---|
| `USER_REPOSITORY` | `Symbol("USER_REPOSITORY")` | `PrismaUserRepository` | `UsersModule` (via `GetCurrentUserUseCase`) |
| `TENANT_REPOSITORY` | `Symbol("TENANT_REPOSITORY")` | `PrismaTenantRepository` | `TenantsModule` |
| `TENANT_MEMBERSHIP_REPOSITORY` | `Symbol("TENANT_MEMBERSHIP_REPOSITORY")` | `PrismaTenantMembershipRepository` | `TenantsModule` |
| `APP_GUARD` | NestJS constant | `ClerkJwtGuard` | `AuthModule` (global) |

---

## Cross-Cutting Shared Types

### `IRequestContext` (`common/types/request-context.type.ts`)

```typescript
interface IRequestContext {
  userId: string;
  tenantId: string | null;
  role: string | null;
}
```

Attached to `request.user` by `ClerkJwtGuard`. Used by controllers and decorators — never passed into use cases or repositories directly.

### `ITenantScopedRepository<T>` (`common/repositories/tenant-scoped.repository.interface.ts`)

Base interface for all future tenant-scoped business model repositories (`PropertyRepository`, `UnitRepository`, etc.). NOT used by identity models (`UserRepository`, `TenantRepository`).

### `TenantWhereClause` (`common/utils/tenant-filter.util.ts`)

```typescript
interface TenantWhereClause {
  tenantId: string;
}
function tenantFilter(tenantId: string): TenantWhereClause
```

Used in every Prisma repository query on tenant-scoped models.

---

## Future Module Template (Data Model Perspective)

When a new business module (e.g., `properties`) is added, it follows this data model pattern:

```typescript
// application/repositories/property.repository.ts
export const PROPERTY_REPOSITORY = Symbol("PROPERTY_REPOSITORY");

export interface PropertyRecord {
  id: string;
  tenantId: string;      // ← REQUIRED on all business models
  // ... domain fields
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyRepository extends ITenantScopedRepository<PropertyRecord> {
  // additional domain-specific methods beyond CRUD
}
```

The `tenantId` field is mandatory on all business models. Identity models (`User`, `Tenant`, `TenantMembership`) are the exception — they are global lookup tables managed by Clerk sync.
