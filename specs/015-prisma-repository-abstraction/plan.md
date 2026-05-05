# Implementation Plan: Repository Abstraction with Prisma Implementations

**Branch**: `015-prisma-repository-abstraction` | **Date**: 2026-05-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/015-prisma-repository-abstraction/spec.md`

## Summary

Create a Clean Architecture repository abstraction layer in the NestJS backend so application logic depends on repository interfaces, Prisma remains isolated inside infrastructure implementations, and all future tenant-scoped data access follows tenant-safe query rules.

This feature adds `UserRepository`, `TenantRepository`, and `TenantMembershipRepository` interfaces and their Prisma-backed implementations, wires them through NestJS DI tokens, creates the `UsersModule`, demonstrates the pattern with a minimal `GetCurrentUserUseCase`, and documents the data layer architecture.

**No Prisma schema changes** are required. The codebase currently has zero direct Prisma usage outside `database/` — this feature preserves and formalizes that constraint.

## Technical Context

**Language/Version**: TypeScript 5.0, Node.js 20.x
**Primary Dependencies**: NestJS 10, Prisma 5.22, `@prisma/client` 5.22, `@nestjs/testing` 10 (testing)
**Storage**: PostgreSQL via `PrismaService` (global, `@Global()` `DatabaseModule`)
**Testing**: Jest 29 with `@nestjs/testing` — unit tests using mock repositories
**Target Platform**: NestJS backend (`apps/api`), Linux server
**Project Type**: Modular Monolith NestJS backend service
**Performance Goals**: No new endpoints; no performance targets for this feature
**Constraints**: No Prisma types exposed in application interfaces; no `PrismaService` outside infrastructure; Clean Architecture layers strictly enforced
**Scale/Scope**: 3 repository interfaces, 3 Prisma implementations, 1 UsersModule, 1 example use case, 1 documentation file

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation` — `UsersModule` and `TenantsModule` follow four-layer structure; all sublayers created explicitly.
- [x] Domain layer imports no NestJS or Prisma packages — repository interfaces and input/output types live in `application/`, not `domain/`. Domain layer remains empty/clean.
- [x] Controllers are thin — all logic delegated to use cases — no new controllers introduced; existing controllers already delegate to use cases.
- [x] Cross-module interaction uses explicit interfaces or events only — `UsersModule` and `TenantsModule` do not import each other's internal services; DI tokens are module-local.

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column with index — **NO new DB tables** are introduced by this feature. `User`, `Tenant`, `TenantMembership` are global identity models explicitly documented as not tenant-scoped.
- [x] All repository queries filter by `tenant_id` — no unscoped queries — identity model repositories use composite keys (`userId + tenantId`) instead; documented as global models. Future tenant-owned repositories will extend `ITenantScopedRepository<T>` with `tenantFilter()`.
- [x] Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic — `IRequestContext` with `userId`, `tenantId`, `role` is already enforced by `ClerkJwtGuard`. Use cases receive these values as parameters from controllers.

**Authentication & Authorization**

- [x] Clerk JWT is verified against JWKS — client-supplied identity is never trusted — no change to existing Clerk JWT verification; `ClerkJwtGuard` already handles this.
- [x] Role/permission checks are enforced in backend guards, not in frontend — no new auth/authz logic introduced; existing guard is unchanged.

**Data Layer**

- [x] All DB access goes through repository interfaces — THIS FEATURE'S PRIMARY OBJECTIVE. After implementation, all data access for User/Tenant/TenantMembership goes through repository interfaces. `PrismaService` is forbidden outside infrastructure repositories.
- [x] Prisma schema changes include `tenant_id` index on affected models — no Prisma schema changes in this feature.

**API & Async**

- [x] All new endpoints are documented with Swagger/OpenAPI decorators — no new HTTP endpoints introduced by this feature.
- [x] All DTOs use `class-validator` decorators for strict validation — no new DTOs introduced. Repository input types are internal TypeScript interfaces, not HTTP DTOs.
- [x] Heavy/non-critical operations are offloaded to BullMQ — no async operations introduced; this is a synchronous data-access abstraction layer.
- [x] BullMQ jobs are idempotent — not applicable.

**Testing**

- [x] Unit tests cover domain and application layer logic — `GetCurrentUserUseCase` unit test with mock repository is included.
- [ ] Integration tests cover repository and module interactions — Prisma integration tests are optional for this feature pending test database setup. Basic DI resolution test via `@nestjs/testing` is included.
- [x] E2E tests cover new API endpoints with auth + tenant context — no new API endpoints in this feature.

**Security**

- [x] No secrets or credentials in source code — no secrets introduced.
- [x] Rate limiting applied to new public-facing endpoints — no new public endpoints.
- [x] All inputs validated and sanitised before processing — repository input types are internal; validation occurs at the controller/DTO layer before reaching use cases.

**Constitution Check Post-Design**: All critical gates pass. The single partially-checked item (integration tests) is justified: no test database infrastructure exists yet and the spec explicitly marks Prisma integration tests as optional.

## Project Structure

### Documentation (this feature)

```text
specs/015-prisma-repository-abstraction/
├── plan.md              # This file
├── research.md          # Phase 0 output — all 10 decisions resolved
├── data-model.md        # Phase 1 output — application types and interfaces
├── quickstart.md        # Phase 1 output — developer onboarding
├── contracts/
│   ├── UserRepository.md
│   ├── TenantRepository.md
│   └── TenantMembershipRepository.md
└── tasks.md             # Phase 2 output — generated by /speckit.tasks
```

### Source Code

```text
apps/api/src/
├── app.module.ts                              ← MODIFY: add UsersModule import
├── database/
│   └── prisma/
│       ├── prisma.module.ts                   ← no change
│       └── prisma.service.ts                  ← no change
├── common/
│   ├── repositories/
│   │   └── tenant-scoped.repository.interface.ts  ← no change (future use)
│   └── utils/
│       └── tenant-filter.util.ts              ← no change
├── modules/
│   ├── users/                                 ← CREATE (new module)
│   │   ├── application/
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts         ← CREATE: interface + DI token + input/output types
│   │   │   └── use-cases/
│   │   │       └── get-current-user.use-case.ts ← CREATE: example use case
│   │   ├── domain/                            ← create empty directory
│   │   ├── infrastructure/
│   │   │   └── repositories/
│   │   │       └── prisma-user.repository.ts  ← CREATE: Prisma implementation
│   │   ├── presentation/                      ← create empty directory
│   │   └── users.module.ts                    ← CREATE: NestJS module with DI wiring
│   └── tenants/
│       ├── application/
│       │   └── repositories/
│       │       ├── tenant.repository.ts        ← CREATE: interface + DI token + input/output types
│       │       └── tenant-membership.repository.ts ← CREATE: interface + DI token + input/output types
│       ├── domain/                            ← no change (already empty)
│       ├── infrastructure/
│       │   └── repositories/
│       │       ├── prisma-tenant.repository.ts ← CREATE: Prisma implementation
│       │       └── prisma-tenant-membership.repository.ts ← CREATE: Prisma implementation
│       ├── presentation/                      ← no change (already empty)
│       └── tenants.module.ts                  ← MODIFY: add DI wiring for tenant repositories
└── modules/users/application/use-cases/get-current-user.use-case.spec.ts ← CREATE: unit test

docs/
└── data-layer.md                              ← CREATE: architecture documentation
```

---

## Implementation Phases

### Phase 1: Create UsersModule Structure and UserRepository

**Goal**: Create the `users` module skeleton and define the `UserRepository` interface, DI token, and input/output types.

**Files to create**:
1. `apps/api/src/modules/users/application/repositories/user.repository.ts`
2. `apps/api/src/modules/users/users.module.ts` (shell � DI wiring added in Phase 3)

**Step 1.1 � Create `user.repository.ts`**

```typescript
// apps/api/src/modules/users/application/repositories/user.repository.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRecord {
  id: string;
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  clerkUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UpdateUserProfileInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByClerkUserId(clerkUserId: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  updateBasicProfile(id: string, input: UpdateUserProfileInput): Promise<UserRecord | null>;
}
```

**Step 1.2 � Create `users.module.ts` (empty shell)**

```typescript
// apps/api/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';

@Module({})
export class UsersModule {}
```

**Step 1.3 � Register `UsersModule` in `AppModule`**

Add `UsersModule` to the `imports` array in `apps/api/src/app.module.ts`.

---

### Phase 2: Create TenantRepository and TenantMembershipRepository Interfaces

**Goal**: Define the `TenantRepository` and `TenantMembershipRepository` interfaces and DI tokens in the `tenants` module application layer.

**Files to create**:
1. `apps/api/src/modules/tenants/application/repositories/tenant.repository.ts`
2. `apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts`

**Step 2.1 � Create `tenant.repository.ts`**

```typescript
// apps/api/src/modules/tenants/application/repositories/tenant.repository.ts
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

**Step 2.2 � Create `tenant-membership.repository.ts`**

```typescript
// apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts
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
  role?: string;
}

export interface TenantMembershipRepository {
  findMembership(userId: string, tenantId: string): Promise<TenantMembershipRecord | null>;
  create(input: CreateTenantMembershipInput): Promise<TenantMembershipRecord>;
  findUserTenants(userId: string): Promise<TenantMembershipRecord[]>;
  findTenantUsers(tenantId: string): Promise<TenantMembershipRecord[]>;
}
```

---

### Phase 3: Implement Prisma Repositories

**Goal**: Create Prisma-backed implementations of all three repository interfaces in the infrastructure layer of each module.

**Files to create**:
1. `apps/api/src/modules/users/infrastructure/repositories/prisma-user.repository.ts`
2. `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant.repository.ts`
3. `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant-membership.repository.ts`

**Step 3.1 � Create `prisma-user.repository.ts`**

```typescript
// apps/api/src/modules/users/infrastructure/repositories/prisma-user.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CreateUserInput,
  UpdateUserProfileInput,
  UserRecord,
  UserRepository,
} from '../../application/repositories/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByClerkUserId(clerkUserId: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { clerkUserId } });
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      return await this.prisma.user.create({ data: input });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new Error(`User with clerkUserId already exists: ${input.clerkUserId}`);
      }
      throw e;
    }
  }

  async updateBasicProfile(id: string, input: UpdateUserProfileInput): Promise<UserRecord | null> {
    try {
      return await this.prisma.user.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }
}
```

**Step 3.2 � Create `prisma-tenant.repository.ts`**

```typescript
// apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CreateTenantInput,
  TenantRecord,
  TenantRepository,
} from '../../application/repositories/tenant.repository';

@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async findByClerkOrgId(clerkOrgId: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({ where: { clerkOrgId } });
  }

  async create(input: CreateTenantInput): Promise<TenantRecord> {
    try {
      return await this.prisma.tenant.create({ data: input });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new Error(`Tenant with clerkOrgId already exists: ${input.clerkOrgId}`);
      }
      throw e;
    }
  }

  async updateName(id: string, name: string): Promise<TenantRecord | null> {
    try {
      return await this.prisma.tenant.update({ where: { id }, data: { name } });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }
}
```

**Step 3.3 � Create `prisma-tenant-membership.repository.ts`**

```typescript
// apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant-membership.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CreateTenantMembershipInput,
  TenantMembershipRecord,
  TenantMembershipRepository,
} from '../../application/repositories/tenant-membership.repository';

@Injectable()
export class PrismaTenantMembershipRepository implements TenantMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(userId: string, tenantId: string): Promise<TenantMembershipRecord | null> {
    return this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
  }

  async create(input: CreateTenantMembershipInput): Promise<TenantMembershipRecord> {
    try {
      return await this.prisma.tenantMembership.create({
        data: {
          userId: input.userId,
          tenantId: input.tenantId,
          role: input.role ?? 'member',
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new Error(`Membership already exists for userId=${input.userId} tenantId=${input.tenantId}`);
      }
      throw e;
    }
  }

  async findUserTenants(userId: string): Promise<TenantMembershipRecord[]> {
    return this.prisma.tenantMembership.findMany({ where: { userId } });
  }

  async findTenantUsers(tenantId: string): Promise<TenantMembershipRecord[]> {
    return this.prisma.tenantMembership.findMany({ where: { tenantId } });
  }
}
```

**Note on `findUnique` with composite key**: The `TenantMembership` model has `@@unique([userId, tenantId])`, which Prisma exposes as `userId_tenantId` in the `findUnique` where clause.

---

### Phase 4: Wire Repositories in NestJS Modules

**Goal**: Configure NestJS providers to bind DI tokens to Prisma implementations in `UsersModule` and `TenantsModule`.

**Files to modify**:
1. `apps/api/src/modules/users/users.module.ts`
2. `apps/api/src/modules/tenants/tenants.module.ts`

**Step 4.1 � Update `users.module.ts`**

```typescript
// apps/api/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './application/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    GetCurrentUserUseCase,
  ],
  exports: [GetCurrentUserUseCase],
})
export class UsersModule {}
```

**Step 4.2 � Update `tenants.module.ts`**

```typescript
// apps/api/src/modules/tenants/tenants.module.ts
import { Module } from '@nestjs/common';
import { TENANT_REPOSITORY } from './application/repositories/tenant.repository';
import { TENANT_MEMBERSHIP_REPOSITORY } from './application/repositories/tenant-membership.repository';
import { PrismaTenantRepository } from './infrastructure/repositories/prisma-tenant.repository';
import { PrismaTenantMembershipRepository } from './infrastructure/repositories/prisma-tenant-membership.repository';

@Module({
  providers: [
    {
      provide: TENANT_REPOSITORY,
      useClass: PrismaTenantRepository,
    },
    {
      provide: TENANT_MEMBERSHIP_REPOSITORY,
      useClass: PrismaTenantMembershipRepository,
    },
  ],
  exports: [TENANT_REPOSITORY, TENANT_MEMBERSHIP_REPOSITORY],
})
export class TenantsModule {}
```

**Note**: `PrismaService` does NOT need to be listed � it is globally provided via `@Global()` `DatabaseModule`.

---

### Phase 5: Create GetCurrentUserUseCase (Example)

**Goal**: Demonstrate the repository abstraction with a minimal use case that has no Prisma imports.

**File to create**:
`apps/api/src/modules/users/application/use-cases/get-current-user.use-case.ts`

```typescript
// apps/api/src/modules/users/application/use-cases/get-current-user.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRecord,
  UserRepository,
} from '../repositories/user.repository';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(clerkUserId: string): Promise<UserRecord | null> {
    return this.users.findByClerkUserId(clerkUserId);
  }
}
```

**Validation**:
- No `import` from `@prisma/client` or `PrismaService`
- Uses `UserRepository` interface type (not `PrismaUserRepository`)
- Accepts a plain string parameter (not an HTTP request)
- Returns `UserRecord | null` (application type, not Prisma model)

---

### Phase 6: Register UsersModule in AppModule

**Goal**: Add `UsersModule` to `AppModule` so the DI container includes all user repository providers.

**File to modify**: `apps/api/src/app.module.ts`

**Change**: Add `UsersModule` to the `imports` array alongside `TenantsModule`.

```typescript
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // ... existing imports
    UsersModule,
    TenantsModule,
    // ...
  ],
})
export class AppModule {}
```

---

### Phase 7: Unit Test for GetCurrentUserUseCase

**Goal**: Validate the abstraction by writing a unit test that uses a mock `UserRepository` � no Prisma, no database, no NestJS bootstrapping.

**File to create**:
`apps/api/src/modules/users/application/use-cases/get-current-user.use-case.spec.ts`

```typescript
// apps/api/src/modules/users/application/use-cases/get-current-user.use-case.spec.ts
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { UserRepository, UserRecord } from '../repositories/user.repository';

describe('GetCurrentUserUseCase', () => {
  const mockUser: UserRecord = {
    id: 'user-uuid-1',
    clerkUserId: 'user_clerk123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepo: UserRepository = {
    findById: jest.fn().mockResolvedValue(null),
    findByClerkUserId: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn(),
    updateBasicProfile: jest.fn(),
  };

  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    useCase = new GetCurrentUserUseCase(mockRepo);
  });

  it('returns the user record for a known clerkUserId', async () => {
    const result = await useCase.execute('user_clerk123');
    expect(result).toEqual(mockUser);
    expect(mockRepo.findByClerkUserId).toHaveBeenCalledWith('user_clerk123');
  });

  it('returns null for an unknown clerkUserId', async () => {
    (mockRepo.findByClerkUserId as jest.Mock).mockResolvedValueOnce(null);
    const result = await useCase.execute('user_unknown');
    expect(result).toBeNull();
  });
});
```

---

### Phase 8: Create data-layer.md Documentation

**Goal**: Document the repository architecture, layer rules, tenant-safe conventions, and forbidden patterns.

**File to create**: `docs/data-layer.md`

**Content outline**:

1. **Purpose**: Why repositories exist (ORM isolation, testability, tenant safety)
2. **Layer map**: domain ? application (interfaces) ? infrastructure (Prisma) ? presentation
3. **Interface locations**: `modules/{domain}/application/repositories/`
4. **Implementation locations**: `modules/{domain}/infrastructure/repositories/`
5. **DI token pattern**: Symbol-based tokens, co-located with interfaces
6. **Where PrismaService is allowed**: Only in infrastructure repositories and `DatabaseModule`
7. **Where PrismaService is FORBIDDEN**: Controllers, use cases, domain, presentation
8. **Identity model repositories**: User, Tenant, TenantMembership � global, no tenantId filter
9. **Tenant-safe conventions for future models**: `findById(id, tenantId)`, `findMany(tenantId)`, `create(tenantId, data)`, `update(id, tenantId, data)`, `delete(id, tenantId)`
10. **Using `tenantFilter()`**: When and how to use `common/utils/tenant-filter.util.ts`
11. **Error normalization**: P2025 ? null, P2002 ? throw
12. **Example injection**: Code example showing use case injecting repository token

---

## Tenant-Safe Repository Conventions

### Base Identity Models (This Feature)

These models do NOT carry `tenantId` and are NOT filtered by tenant in their repositories:

| Model | Reason |
|---|---|
| `User` | Global identity � a user exists independently of any tenant |
| `Tenant` | IS the tenant � it is the boundary, not scoped by one |
| `TenantMembership` | Global relationship model � uses `userId + tenantId` as composite lookup key |

### Future Tenant-Owned Business Models (Rule Template)

Every future model that has a `tenantId` column MUST follow these interface patterns:

```typescript
interface PropertyRepository {
  findById(id: string, tenantId: string): Promise<PropertyRecord | null>;
  findManyByTenant(tenantId: string, filters?: Record<string, unknown>): Promise<PropertyRecord[]>;
  create(tenantId: string, data: CreatePropertyInput): Promise<PropertyRecord>;
  update(id: string, tenantId: string, data: UpdatePropertyInput): Promise<PropertyRecord | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}
```

Prisma implementation pattern:

```typescript
// Always use tenantFilter() from common/utils/tenant-filter.util.ts
async findById(id: string, tenantId: string) {
  return this.prisma.property.findFirst({
    where: { id, ...tenantFilter(tenantId) },
  });
}

async delete(id: string, tenantId: string) {
  const result = await this.prisma.property.deleteMany({
    where: { id, ...tenantFilter(tenantId) },
  });
  return result.count > 0;
}
```

### Rules

- `tenantId` MUST be passed as a parameter from the use case � never sourced from the repository itself
- Repositories MUST NOT read HTTP requests or parse JWTs
- Repositories MUST NOT call `IRequestContext` directly
- Every write operation on a tenant-scoped model MUST include `tenantId` in the `where` clause
- Returning `null` for "not found OR wrong tenant" is intentional � prevents tenant enumeration

---

## Direct Prisma Usage Refactor Checklist

Run these searches before marking the feature complete:

```bash
# Check for PrismaService imports outside allowed locations
grep -r "PrismaService" apps/api/src --include="*.ts" | grep -v "database/prisma" | grep -v "infrastructure/repositories"

# Check for @prisma/client imports outside infrastructure
grep -r "@prisma/client" apps/api/src --include="*.ts" | grep -v "database/prisma"

# Check for direct prisma. calls outside infrastructure
grep -r "prisma\." apps/api/src --include="*.ts" | grep -v "database/prisma" | grep -v "infrastructure/repositories"

# Check for new PrismaClient outside infrastructure
grep -r "new PrismaClient" apps/api/src --include="*.ts" | grep -v "database/prisma"
```

**Expected results after implementation**: Zero matches for each grep.

---

## Validation Checklist

Before marking this feature complete:

- [ ] `UserRepository` interface exists at `modules/users/application/repositories/user.repository.ts`
- [ ] `TenantRepository` interface exists at `modules/tenants/application/repositories/tenant.repository.ts`
- [ ] `TenantMembershipRepository` interface exists at `modules/tenants/application/repositories/tenant-membership.repository.ts`
- [ ] `PrismaUserRepository` exists and implements `UserRepository`
- [ ] `PrismaTenantRepository` exists and implements `TenantRepository`
- [ ] `PrismaTenantMembershipRepository` exists and implements `TenantMembershipRepository`
- [ ] `USER_REPOSITORY`, `TENANT_REPOSITORY`, `TENANT_MEMBERSHIP_REPOSITORY` Symbol tokens exist
- [ ] `UsersModule` provides `USER_REPOSITORY ? PrismaUserRepository`
- [ ] `TenantsModule` provides `TENANT_REPOSITORY ? PrismaTenantRepository` and `TENANT_MEMBERSHIP_REPOSITORY ? PrismaTenantMembershipRepository`
- [ ] `UsersModule` is registered in `AppModule`
- [ ] `GetCurrentUserUseCase` exists, imports no Prisma types
- [ ] `get-current-user.use-case.spec.ts` passes with mock repository
- [ ] `pnpm --filter @leaseKo/api typecheck` passes with zero errors
- [ ] `pnpm --filter @leaseKo/api build` succeeds
- [ ] `pnpm --filter @leaseKo/api test` passes
- [ ] `grep PrismaService apps/api/src/**/*.ts` returns only `database/prisma/` and `infrastructure/repositories/` matches
- [ ] `docs/data-layer.md` created with complete documentation
- [ ] No `Property`, `Unit`, `Lease`, or `Payment` repositories created

---

## Notes for Next Tasks

### Clean Architecture Module Refinement (Future)
- Add domain entities (`UserEntity`, `TenantEntity`) to the `domain/` layer
- Move business invariants out of repositories and into domain entities
- Consider value objects for `ClerkUserId`, `TenantId`

### User/Tenant Sync Use Cases (Next Priority)
- `SyncUserFromClerkUseCase` � upsert user from Clerk webhook payload
- `SyncTenantFromClerkUseCase` � upsert tenant from Clerk org webhook payload
- `SyncMembershipFromClerkUseCase` � upsert membership from Clerk org membership webhook
- These use cases will be the primary consumers of `UserRepository`, `TenantRepository`, `TenantMembershipRepository`

### Property Module Repositories (Feature After Sync)
- `PropertyRepository` extends `ITenantScopedRepository<PropertyRecord>`
- All methods require `tenantId`
- Uses `tenantFilter()` utility for all Prisma queries
- Lives in `modules/properties/application/repositories/` and `modules/properties/infrastructure/repositories/`

### RBAC / Permissions (Future Feature)
- `IRequestContext.role` is currently `null` after JWT verification
- Role resolution via `TenantMembershipRepository.findMembership(userId, tenantId)` in the guard
- A `PermissionsGuard` will consume `TenantMembershipRepository` (exported from `TenantsModule`)
- RBAC decorators: `@RequiresRole('owner' | 'manager' | 'tenant_user')`
