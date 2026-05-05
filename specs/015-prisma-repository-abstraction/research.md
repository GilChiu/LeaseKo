# Research: Repository Abstraction with Prisma Implementations

**Feature**: 015-prisma-repository-abstraction
**Date**: 2026-05-05
**Status**: Complete — all unknowns resolved

---

## Codebase State Assessment

### What Exists

| Item | Location | Status |
|---|---|---|
| `PrismaService` | `apps/api/src/database/prisma/prisma.service.ts` | ✅ Operational |
| `DatabaseModule` | `apps/api/src/database/prisma/prisma.module.ts` | ✅ @Global, exports PrismaService |
| Prisma schema | `apps/api/prisma/schema.prisma` | ✅ User, Tenant, TenantMembership |
| `tenantFilter()` utility | `apps/api/src/common/utils/tenant-filter.util.ts` | ✅ Ready to use |
| `ITenantScopedRepository<T>` | `apps/api/src/common/repositories/tenant-scoped.repository.interface.ts` | ✅ Base interface exists |
| `IRequestContext` | `apps/api/src/common/types/request-context.type.ts` | ✅ `userId`, `tenantId`, `role` |
| `TenantsModule` | `apps/api/src/modules/tenants/tenants.module.ts` | ✅ Shell exists, all sublayers empty |
| `AuthModule` | `apps/api/src/modules/auth/auth.module.ts` | ✅ Full implementation |
| `UsersModule` | — | ❌ Does not exist yet |
| Direct Prisma usage outside `database/` | — | ✅ None — codebase is clean |

### What Does Not Exist Yet

- No `UsersModule` at `apps/api/src/modules/users/`
- No repository interfaces (beyond the generic `ITenantScopedRepository`)
- No Prisma repository implementations
- No DI tokens
- No application-layer use cases for user/tenant data access

---

## Research Decision 1: Repository Interface Location

**Question**: Where should repository interfaces live?

**Decision**: Application layer, co-located with the domain module.

```
apps/api/src/modules/users/application/repositories/user.repository.ts
apps/api/src/modules/tenants/application/repositories/tenant.repository.ts
apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts
```

**Rationale**:
- Interfaces belong to the application layer — they define what the application *needs*, not how infrastructure delivers it.
- Co-locating with the module they serve avoids a shared `interfaces/` folder that grows into a cross-module coupling point.
- This matches the constitution's four-layer Clean Architecture rule: `domain / application / infrastructure / presentation`.

**Alternatives Considered**:
- `common/repositories/` — rejected because repository interfaces are module-specific contracts, not shared kernel types.
- `shared/` package — rejected; repositories are module-internal. Shared kernel is for cross-module value types only.

---

## Research Decision 2: DI Token Co-location Strategy

**Question**: Should DI tokens live in a separate file or co-located with the interface?

**Decision**: Co-locate in the same file as the interface using a named export.

```typescript
// user.repository.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepository { ... }
```

**Rationale**:
- Reduces file count without reducing clarity.
- A single import gives the consumer both the token and the interface type.
- In a small module, a separate `.token.ts` file adds navigation overhead with no architectural benefit.
- The plan prompt suggested a separate file; co-location is a valid simplification that still satisfies the intent.

**Alternative Considered**: Separate `user.repository.token.ts` file — acceptable but unnecessary given the file would contain a single line.

---

## Research Decision 3: Input/Output Types — Co-located vs. Separate Files

**Question**: Where should repository input/output types live?

**Decision**: Co-located in the interface file (`user.repository.ts`) for this feature scope.

**Rationale**:
- At this stage, input types are small (3–5 fields each) and specific to a single repository.
- A separate `user-repository.types.ts` file is worth creating only when types are reused across multiple files.
- If types grow, they can be extracted to `application/types/` in a follow-up refactor.

---

## Research Decision 4: PrismaService Availability in Repositories

**Question**: Do Prisma repositories need to explicitly import `PrismaModule`?

**Decision**: No — `DatabaseModule` is already `@Global()`. Repositories receive `PrismaService` via constructor injection without any module importing `DatabaseModule`.

**Rationale**:
- The existing `DatabaseModule` is decorated `@Global()` and registered in `AppModule`.
- Any NestJS provider in any module can inject `PrismaService` without explicitly importing `DatabaseModule`.
- This is by design in the existing codebase (see `prisma.module.ts` comments).

---

## Research Decision 5: UsersModule — Create From Scratch

**Question**: Does a `UsersModule` need to be created?

**Decision**: Yes — create `apps/api/src/modules/users/` following the same four-layer structure as `TenantsModule`.

**Structure**:
```
modules/users/
├── application/
│   └── repositories/
│       └── user.repository.ts          ← interface + token
│   └── use-cases/
│       └── get-current-user.use-case.ts
├── domain/
├── infrastructure/
│   └── repositories/
│       └── prisma-user.repository.ts
├── presentation/
└── users.module.ts
```

---

## Research Decision 6: TenantMembership Repository Ownership

**Question**: Should `TenantMembershipRepository` live in `users/` or `tenants/`?

**Decision**: In `tenants/` module — `TenantMembership` is a relationship between a `User` and a `Tenant`. Since membership is most naturally queried from the tenant perspective (who belongs to this tenant?), it belongs in the tenants bounded context.

**Rationale**:
- `TenantsModule` is the natural owner of tenant-related data.
- Placing membership in `users/` would create a dependency from `users/` onto `Tenant` domain concepts.
- The `findUserTenants(userId)` query can cross to `users/` context but is implemented in `tenants/` infrastructure.

---

## Research Decision 7: Prisma Error Normalization Strategy

**Question**: Which Prisma errors should be normalized and how?

**Decision**: Normalize the two most common Prisma error codes at the repository boundary:

| Prisma Error | Code | Normalized Response |
|---|---|---|
| Record not found | `P2025` | Return `null` (do not throw) |
| Unique constraint violation | `P2002` | Throw a typed `ConflictError` or re-throw for the application layer |
| Foreign key violation | `P2003` | Let propagate — indicates a data integrity issue |

**Implementation pattern**:
```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

try {
  return await this.prisma.user.create({ data });
} catch (e) {
  if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new Error(`Unique constraint violation: ${e.meta?.target}`);
  }
  throw e;
}
```

**Rationale**: Only normalize errors that are commonly expected in business logic (not-found, duplicate). Let unexpected errors propagate naturally.

---

## Research Decision 8: Base Identity Models Are NOT Tenant-Scoped

**Question**: Do `UserRepository`, `TenantRepository`, and `TenantMembershipRepository` need to extend `ITenantScopedRepository<T>`?

**Decision**: No — these three models are global identity/infrastructure models and are explicitly documented as non-tenant-scoped in the Prisma schema.

**Rules**:
- `User` can be queried by `clerkUserId` — no `tenantId` filter needed.
- `Tenant` can be queried by `clerkOrgId` or `id` — `Tenant` IS the tenant boundary.
- `TenantMembership` requires `userId + tenantId` together — these are lookup keys, not a tenant isolation filter in the same sense.

**`ITenantScopedRepository<T>` usage**: Reserved for future business models (`Property`, `Unit`, `Lease`, `Payment`) that have `tenantId` as a data isolation column. These will extend the base interface in their respective modules.

---

## Research Decision 9: Example Use Case Selection

**Question**: Which use case should demonstrate the repository abstraction?

**Decision**: `GetCurrentUserUseCase` — given a `clerkUserId` from `IRequestContext`, look up and return the application `User` record.

**Rationale**:
- Simplest possible use case; no business logic, no tenant filter needed.
- Demonstrates the DI token injection pattern cleanly.
- Can be unit-tested with a 3-line mock repository.
- Immediately useful for the auth flow (sync user from Clerk → look up user in DB).

---

## Research Decision 10: Module Registration in AppModule

**Question**: Should `UsersModule` be registered in `AppModule`?

**Decision**: Yes — add `UsersModule` to the `imports` array in `AppModule`.

**Rationale**: All domain modules must be imported in `AppModule` to be included in the NestJS dependency injection container.

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---|---|
| Where do interfaces live? | `application/repositories/` within each domain module |
| Where do tokens live? | Co-located in the interface file |
| Where do input types live? | Co-located in the interface file |
| Does PrismaModule need re-importing? | No — `DatabaseModule` is `@Global()` |
| Does `UsersModule` exist? | No — must be created |
| Where does `TenantMembershipRepository` live? | `tenants/` module |
| How are Prisma errors normalized? | P2025 → null, P2002 → throw typed error |
| Do identity repos extend `ITenantScopedRepository`? | No — identity models are global |
| Which use case to demonstrate? | `GetCurrentUserUseCase` |
| Register `UsersModule` in `AppModule`? | Yes |
