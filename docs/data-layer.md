# Data Layer Architecture

**Last updated**: 2026-05-05
**Feature**: 015-prisma-repository-abstraction

---

## Why Repositories Exist

The repository pattern isolates Prisma (the ORM) inside the infrastructure layer. Application use cases depend on **repository interfaces**, not on Prisma types or `PrismaService`. This provides:

- **Testability** — use cases can be unit-tested with a plain mock object; no database required.
- **ORM independence** — swapping Prisma for another persistence library only requires replacing infrastructure implementations.
- **Tenant safety** — repository method signatures structurally enforce `tenantId` requirements at compile time for tenant-scoped models.
- **Separation of concerns** — business logic never knows how data is stored or retrieved.

---

## Layer Map

```
Presentation (controllers, DTOs)
    │
    │  @Inject(USER_REPOSITORY)
    ▼
Application (use cases)
    │  depends on interface type: UserRepository
    │
    ├── UserRepository interface           modules/users/application/repositories/
    ├── TenantRepository interface         modules/tenants/application/repositories/
    └── TenantMembershipRepository         modules/tenants/application/repositories/
    │
    │  implemented by
    ▼
Infrastructure (Prisma repositories)
    ├── PrismaUserRepository               modules/users/infrastructure/repositories/
    ├── PrismaTenantRepository             modules/tenants/infrastructure/repositories/
    └── PrismaTenantMembershipRepository   modules/tenants/infrastructure/repositories/
    │
    │  injects
    ▼
PrismaService                             database/prisma/prisma.service.ts
    │
    ▼
PostgreSQL
```

Dependency arrows point **inward only** — infrastructure depends on application interfaces, never the reverse.

---

## Repository Interface Locations

| Repository | Interface File |
|---|---|
| `UserRepository` | `apps/api/src/modules/users/application/repositories/user.repository.ts` |
| `TenantRepository` | `apps/api/src/modules/tenants/application/repositories/tenant.repository.ts` |
| `TenantMembershipRepository` | `apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts` |

Each file exports: the `Symbol` DI token, input/output types, and the repository interface — all in one import.

---

## Prisma Implementation Locations

| Repository | Implementation File |
|---|---|
| `PrismaUserRepository` | `apps/api/src/modules/users/infrastructure/repositories/prisma-user.repository.ts` |
| `PrismaTenantRepository` | `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant.repository.ts` |
| `PrismaTenantMembershipRepository` | `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant-membership.repository.ts` |

---

## DI Token Pattern

Each repository interface file exports a `Symbol`-based NestJS injection token:

```typescript
// user.repository.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepository { ... }
```

Tokens are used in two places:

**1. Module provider (infrastructure wiring)**:
```typescript
// users.module.ts
providers: [
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
]
```

**2. Use case injection (application layer)**:
```typescript
// get-current-user.use-case.ts
constructor(
  @Inject(USER_REPOSITORY)
  private readonly users: UserRepository,
) {}
```

The use case knows nothing about `PrismaUserRepository`. It only holds the interface type.

---

## Where PrismaService Is ALLOWED

`PrismaService` may ONLY be injected in:

| Location | File pattern |
|---|---|
| Prisma repository implementations | `*/infrastructure/repositories/prisma-*.repository.ts` |
| DatabaseModule itself | `database/prisma/prisma.module.ts` |
| Migration/seed scripts (if explicitly created) | `prisma/seed.ts` or similar |

---

## Where PrismaService Is FORBIDDEN

`PrismaService` and `@prisma/client` types MUST NOT appear in:

| Location | Reason |
|---|---|
| Controllers (`presentation/`) | Thin layer — must delegate to use cases |
| Use cases (`application/`) | Must depend on repository interfaces only |
| Domain classes (`domain/`) | Domain must be framework-free |
| NestJS guards and interceptors | Must use repository interfaces via DI |
| Any file outside `infrastructure/repositories/` | Constitutes a Clean Architecture violation |

**To verify compliance, run**:
```bash
# Should return ONLY database/prisma/* and */infrastructure/repositories/* matches
grep -r "PrismaService" apps/api/src --include="*.ts" \
  | grep -v "database/prisma" \
  | grep -v "infrastructure/repositories"

# Should return zero results outside database/prisma
grep -r "@prisma/client" apps/api/src --include="*.ts" \
  | grep -v "database/prisma"
```

---

## Identity vs. Tenant-Scoped Models

### Base Identity Models (no tenantId filter)

The following models are **global** — they do not carry a `tenantId` column and are not filtered by tenant:

| Model | Repository | Reason |
|---|---|---|
| `User` | `UserRepository` | A user exists independently of any tenant |
| `Tenant` | `TenantRepository` | Is the tenant boundary itself |
| `TenantMembership` | `TenantMembershipRepository` | Global relationship using `userId + tenantId` as composite lookup key |

### Tenant-Scoped Business Models (tenantId required — future)

Every future business model (`Property`, `Unit`, `Lease`, `Payment`, etc.) that carries a `tenantId` column MUST follow this interface contract:

```typescript
interface PropertyRepository {
  findById(id: string, tenantId: string): Promise<PropertyRecord | null>;
  findManyByTenant(tenantId: string, filters?: Record<string, unknown>): Promise<PropertyRecord[]>;
  create(tenantId: string, data: CreatePropertyInput): Promise<PropertyRecord>;
  update(id: string, tenantId: string, data: UpdatePropertyInput): Promise<PropertyRecord | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}
```

**Rules**:
- Every read/write method for a tenant-owned model MUST require `tenantId` as a parameter.
- `tenantId` comes from the use case, which receives it from `IRequestContext` — never from the repository itself.
- Repositories MUST NOT read HTTP requests or parse JWTs.

---

## Tenant-Safe Query Conventions for Future Repositories

Use `tenantFilter()` from `apps/api/src/common/utils/tenant-filter.util.ts` in every Prisma query on tenant-scoped models:

```typescript
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';

// READ — always scope by tenant
async findById(id: string, tenantId: string) {
  return this.prisma.property.findFirst({
    where: { id, ...tenantFilter(tenantId) },
  });
}

// READ MANY — always scope by tenant
async findManyByTenant(tenantId: string) {
  return this.prisma.property.findMany({
    where: tenantFilter(tenantId),
  });
}

// CREATE — always inject tenantId from parameter, never from data payload
async create(tenantId: string, data: CreatePropertyInput) {
  return this.prisma.property.create({
    data: { ...data, tenantId },
  });
}

// UPDATE — compound where clause: id + tenantId (atomic, prevents cross-tenant update)
async update(id: string, tenantId: string, data: UpdatePropertyInput) {
  try {
    return await this.prisma.property.update({
      where: { id, ...tenantFilter(tenantId) },
      data,
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
      return null; // Not found OR wrong tenant — intentionally indistinguishable
    }
    throw e;
  }
}

// DELETE — compound where clause: id + tenantId
async delete(id: string, tenantId: string): Promise<boolean> {
  const result = await this.prisma.property.deleteMany({
    where: { id, ...tenantFilter(tenantId) },
  });
  return result.count > 0;
}
```

`tenantFilter(tenantId)` throws at runtime if `tenantId` is empty or whitespace, providing a safety net against accidentally unscoped queries.

---

## Error Normalization

Infrastructure repositories normalize Prisma error codes before returning to the application layer:

| Prisma Code | Meaning | Normalized Response |
|---|---|---|
| `P2025` | Record not found (on update/delete) | Return `null` |
| `P2002` | Unique constraint violation | Throw descriptive `Error` |
| Other | Unexpected error | Re-throw as-is |

The application layer never receives raw `PrismaClientKnownRequestError` objects. Use cases decide the business-level response (e.g., `404 Not Found`, `409 Conflict`) based on `null` returns or caught errors.

---

## Example: Adding a New Repository

### 1. Define the interface in the application layer

```typescript
// modules/properties/application/repositories/property.repository.ts
export const PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY');

export interface PropertyRecord {
  id: string;
  tenantId: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyInput {
  address: string;
}

export interface PropertyRepository {
  findById(id: string, tenantId: string): Promise<PropertyRecord | null>;
  findManyByTenant(tenantId: string): Promise<PropertyRecord[]>;
  create(tenantId: string, data: CreatePropertyInput): Promise<PropertyRecord>;
}
```

### 2. Implement in the infrastructure layer

```typescript
// modules/properties/infrastructure/repositories/prisma-property.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { PropertyRepository, PropertyRecord, CreatePropertyInput } from '../../application/repositories/property.repository';

@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<PropertyRecord | null> {
    return this.prisma.property.findFirst({
      where: { id, ...tenantFilter(tenantId) },
    });
  }

  async findManyByTenant(tenantId: string): Promise<PropertyRecord[]> {
    return this.prisma.property.findMany({ where: tenantFilter(tenantId) });
  }

  async create(tenantId: string, data: CreatePropertyInput): Promise<PropertyRecord> {
    return this.prisma.property.create({ data: { ...data, tenantId } });
  }
}
```

### 3. Wire in the module

```typescript
// modules/properties/properties.module.ts
providers: [
  { provide: PROPERTY_REPOSITORY, useClass: PrismaPropertyRepository },
]
```

### 4. Inject in a use case

```typescript
constructor(
  @Inject(PROPERTY_REPOSITORY)
  private readonly properties: PropertyRepository,
) {}
```

---

## DI Token Reference

| Token | Symbol | Module | Bound To |
|---|---|---|---|
| `USER_REPOSITORY` | `Symbol('USER_REPOSITORY')` | `UsersModule` | `PrismaUserRepository` |
| `TENANT_REPOSITORY` | `Symbol('TENANT_REPOSITORY')` | `TenantsModule` | `PrismaTenantRepository` |
| `TENANT_MEMBERSHIP_REPOSITORY` | `Symbol('TENANT_MEMBERSHIP_REPOSITORY')` | `TenantsModule` | `PrismaTenantMembershipRepository` |
