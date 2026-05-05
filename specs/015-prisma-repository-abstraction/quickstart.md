# Quickstart: Repository Abstraction with Prisma Implementations

**Feature**: 015-prisma-repository-abstraction
**Branch**: `015-prisma-repository-abstraction`

---

## What This Feature Does

This feature creates a Clean Architecture repository abstraction layer in the NestJS backend (`apps/api`). After implementation:

- Application use cases depend on **repository interfaces**, not `PrismaService`
- Prisma is isolated inside **infrastructure repositories** only
- Repository interfaces have **DI tokens** that bind to Prisma implementations in module providers
- All future tenant-scoped data access has a clear, enforced pattern

---

## Prerequisites

- Docker running (`docker compose up -d` from `infra/`)
- Environment variables set (`.env` at repo root or `apps/api/.env`)
- Prisma migration applied (`pnpm --filter @leaseKo/api prisma:migrate`)
- Backend compiles (`pnpm --filter @leaseKo/api typecheck`)

---

## Files Created / Modified

| Action | File |
|---|---|
| CREATE | `apps/api/src/modules/users/application/repositories/user.repository.ts` |
| CREATE | `apps/api/src/modules/users/application/use-cases/get-current-user.use-case.ts` |
| CREATE | `apps/api/src/modules/users/application/use-cases/get-current-user.use-case.spec.ts` |
| CREATE | `apps/api/src/modules/users/infrastructure/repositories/prisma-user.repository.ts` |
| CREATE | `apps/api/src/modules/users/users.module.ts` |
| CREATE | `apps/api/src/modules/tenants/application/repositories/tenant.repository.ts` |
| CREATE | `apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts` |
| CREATE | `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant.repository.ts` |
| CREATE | `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant-membership.repository.ts` |
| MODIFY | `apps/api/src/modules/tenants/tenants.module.ts` |
| MODIFY | `apps/api/src/app.module.ts` |
| CREATE | `docs/data-layer.md` |

---

## How to Inject a Repository in a Use Case

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../repositories/user.repository';

@Injectable()
export class MyUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(clerkUserId: string) {
    return this.users.findByClerkUserId(clerkUserId);
  }
}
```

**Rules**:
- Always inject by token: `@Inject(USER_REPOSITORY)`
- Always type the dependency with the interface: `UserRepository`
- Never import `PrismaUserRepository` or `PrismaService` in a use case

---

## How to Add a New Repository (Future Pattern)

### 1. Define the interface in the application layer

```typescript
// modules/properties/application/repositories/property.repository.ts
export const PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY');

export interface PropertyRepository {
  findById(id: string, tenantId: string): Promise<PropertyRecord | null>;
  findManyByTenant(tenantId: string): Promise<PropertyRecord[]>;
  create(tenantId: string, data: CreatePropertyInput): Promise<PropertyRecord>;
  update(id: string, tenantId: string, data: UpdatePropertyInput): Promise<PropertyRecord | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}
```

### 2. Create the Prisma implementation in the infrastructure layer

```typescript
// modules/properties/infrastructure/repositories/prisma-property.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { PropertyRepository } from '../../application/repositories/property.repository';

@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string) {
    return this.prisma.property.findFirst({
      where: { id, ...tenantFilter(tenantId) },
    });
  }
  // ...
}
```

### 3. Wire in the module

```typescript
{
  provide: PROPERTY_REPOSITORY,
  useClass: PrismaPropertyRepository,
}
```

---

## How to Run Tests

```bash
# Run unit tests (mock repository — no database required)
pnpm --filter @leaseKo/api test

# Run a specific test file
pnpm --filter @leaseKo/api test get-current-user.use-case.spec.ts

# Run with coverage
pnpm --filter @leaseKo/api test:cov
```

---

## How to Verify Prisma Isolation

```bash
# Should return ONLY database/prisma/* and infrastructure/repositories/* files
grep -r "PrismaService" apps/api/src --include="*.ts" \
  | grep -v "database/prisma" \
  | grep -v "infrastructure/repositories"

# Should return zero results
grep -r "@prisma/client" apps/api/src --include="*.ts" \
  | grep -v "database/prisma"
```

Expected: no output (all Prisma usage is properly isolated).

---

## Build and Type Check

```bash
# Type check
pnpm --filter @leaseKo/api typecheck

# Build
pnpm --filter @leaseKo/api build

# Dev server
pnpm --filter @leaseKo/api dev
```

---

## Architecture Reference

See [docs/data-layer.md](../../docs/data-layer.md) for full architecture documentation including:
- Repository layer map
- DI token pattern
- Tenant-safe method conventions
- Forbidden usage patterns
- Error normalization rules
