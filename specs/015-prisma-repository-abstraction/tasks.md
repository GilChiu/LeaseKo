# Tasks: Repository Abstraction with Prisma Implementations

**Input**: Design documents from `specs/015-prisma-repository-abstraction/`
**Branch**: `015-prisma-repository-abstraction`
**Total tasks**: 14
**Phases**: 6

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[US#]**: Which user story this task belongs to
- All paths relative to `apps/api/src/` unless otherwise noted

---

## Phase 1: Setup

**Purpose**: Create the `UsersModule` four-layer directory structure so subsequent tasks have their target paths.

- [X] T001 Create `apps/api/src/modules/users/` with subdirectories `application/repositories/`, `application/use-cases/`, `domain/`, `infrastructure/repositories/`, and `presentation/`

---

## Phase 2: Foundational

**Purpose**: Register `UsersModule` in the root `AppModule` so the NestJS DI container includes all user repository providers once they exist. Must be in place before any module-level DI wiring is testable.

**âš ï¸ CRITICAL**: All user story implementation depends on this module registration being present.

- [X] T002 Register `UsersModule` in `apps/api/src/app.module.ts` imports array alongside `TenantsModule`

**Checkpoint**: `UsersModule` slot exists in `AppModule` â€” user story implementation can proceed.

---

## Phase 3: User Story 1 - Developer Uses Repository Interfaces in Use Cases (Priority: P1) ðŸŽ¯ MVP

**Goal**: Define `UserRepository` interface + DI token, implement `PrismaUserRepository`, wire through `UsersModule`, and create `GetCurrentUserUseCase` that injects the token â€” not `PrismaService`.

**Independent Test**: `pnpm --filter @leaseKo/api typecheck` passes; `GetCurrentUserUseCase` file contains zero imports from `@prisma/client` or `PrismaService`.

- [X] T003 [P] [US1] Create `UserRepository` interface, `USER_REPOSITORY` Symbol token, and `UserRecord` / `CreateUserInput` / `UpdateUserProfileInput` types in `apps/api/src/modules/users/application/repositories/user.repository.ts`
- [X] T004 [US1] Create `PrismaUserRepository` implementing `UserRepository` with P2025/P2002 error normalization in `apps/api/src/modules/users/infrastructure/repositories/prisma-user.repository.ts`
- [X] T005 [US1] Update `apps/api/src/modules/users/users.module.ts` to provide `{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }` and export `GetCurrentUserUseCase`
- [X] T006 [US1] Create `GetCurrentUserUseCase` injecting `USER_REPOSITORY` token with `@Inject(USER_REPOSITORY)` typed as `UserRepository` (no Prisma imports) in `apps/api/src/modules/users/application/use-cases/get-current-user.use-case.ts`

---

## Phase 4: User Story 2 - Tenant-Safe Queries Enforced Through Repository Contracts (Priority: P1)

**Goal**: Define `TenantRepository` and `TenantMembershipRepository` interfaces with tenant-safe method signatures, implement Prisma-backed classes, and wire providers in `TenantsModule`. `TenantMembershipRepository` methods use `userId + tenantId` as composite lookup keys.

**Independent Test**: `pnpm --filter @leaseKo/api typecheck` passes; all tenant repository method signatures include `tenantId` where required; `grep -r "PrismaService" apps/api/src --include="*.ts" | grep -v "database/prisma" | grep -v "infrastructure/repositories"` returns zero results.

- [X] T007 [P] [US2] Create `TenantRepository` interface, `TENANT_REPOSITORY` Symbol token, and `TenantRecord` / `CreateTenantInput` types in `apps/api/src/modules/tenants/application/repositories/tenant.repository.ts`
- [X] T008 [P] [US2] Create `TenantMembershipRepository` interface, `TENANT_MEMBERSHIP_REPOSITORY` Symbol token, and `TenantMembershipRecord` / `CreateTenantMembershipInput` types in `apps/api/src/modules/tenants/application/repositories/tenant-membership.repository.ts`
- [X] T009 [US2] Create `PrismaTenantRepository` implementing `TenantRepository` with P2025/P2002 error normalization in `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant.repository.ts`
- [X] T010 [P] [US2] Create `PrismaTenantMembershipRepository` implementing `TenantMembershipRepository` using `userId_tenantId` composite unique key for `findMembership` in `apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant-membership.repository.ts`
- [X] T011 [US2] Update `apps/api/src/modules/tenants/tenants.module.ts` to provide `TENANT_REPOSITORY â†’ PrismaTenantRepository` and `TENANT_MEMBERSHIP_REPOSITORY â†’ PrismaTenantMembershipRepository`, and export both tokens

---

## Phase 5: User Story 4 - Unit Testing with Mock Repositories (Priority: P2)

**Goal**: Write a Jest unit test for `GetCurrentUserUseCase` that uses a plain TypeScript mock of `UserRepository` â€” no Prisma, no database, no NestJS bootstrapping.

**Independent Test**: `pnpm --filter @leaseKo/api test get-current-user.use-case.spec.ts` passes with zero failures.

- [X] T012 [US4] Create `GetCurrentUserUseCase` Jest unit test with manual mock implementing `UserRepository` interface in `apps/api/src/modules/users/application/use-cases/get-current-user.use-case.spec.ts`

---

## Phase 6: Polish â€” Prisma Isolation Verification & Architecture Documentation (Priority: P2)

**Goal**: Confirm Prisma is fully isolated (US3 acceptance criteria), the full test suite passes, the build succeeds, and the data layer is documented for future developers (US5).

**Independent Test**: All grep isolation checks return zero results outside allowed infrastructure files; `pnpm --filter @leaseKo/api build` exits with code 0.

- [X] T013 [P] [US5] Create `docs/data-layer.md` documenting repository interfaces, DI token pattern, where `PrismaService` is allowed/forbidden, tenant-safe method conventions for future models (findById/findMany/create/update/delete with tenantId), error normalization rules, and example injection pattern
- [X] T014 [US3] Run full validation: `pnpm --filter @leaseKo/api typecheck`, `pnpm --filter @leaseKo/api build`, `pnpm --filter @leaseKo/api test`, and grep for `PrismaService`/`@prisma/client` outside `database/prisma` and `infrastructure/repositories` â€” confirm all pass with zero violations

---

## Dependencies

```
T001 â†’ (unblocks T003, T004, T005, T006)
T002 â†’ (unblocks DI resolution testing in T014)
T003 â†’ T004 â†’ T005 â†’ T006 â†’ T012
T007 â†’ T009 â†’ T011
T008 â†’ T010 â†’ T011
T006, T011 â†’ T014
T012 â†’ T014
T013 â†’ (independent, can run after T007 and T008 for interface reference)
```

**User story completion order**:
1. US1 (T003â†’T004â†’T005â†’T006) â€” MVP
2. US2 (T007+T008 â†’ T009+T010 â†’ T011) â€” parallel to US1 after T001
3. US4 (T012) â€” depends on US1 complete
4. US5 + US3 (T013+T014) â€” depends on US1 and US2 complete

---

## Parallel Execution Examples

**After T001 and T002 (setup complete), these can run in parallel**:

```
Stream A (US1):                Stream B (US2):
T003 UserRepository interface  T007 TenantRepository interface
T004 PrismaUserRepository      T008 TenantMembershipRepository interface
T005 UsersModule wiring        T009 PrismaTenantRepository
T006 GetCurrentUserUseCase     T010 PrismaTenantMembershipRepository
                               T011 TenantsModule wiring
T012 Unit test (after T006)

Both streams â†’ T013 (docs, parallel) + T014 (validation)
```

**Within Phase 4 (US2), these can run in parallel**:
- T007 (TenantRepository interface) and T008 (TenantMembershipRepository interface)
- T009 (PrismaTenantRepository) and T010 (PrismaTenantMembershipRepository) â€” after T007 and T008 respectively

---

## Implementation Strategy

**MVP scope**: Complete Phase 1 + Phase 2 + Phase 3 (T001â€“T006). After Phase 3, `GetCurrentUserUseCase` works, TypeScript compiles, and the core abstraction pattern is established.

**Full delivery**: All 6 phases â€” 14 tasks total. Phases 4â€“6 add tenant repository coverage, unit tests, isolation verification, and documentation.

**No test database required**: T012 uses mock repositories â€” Jest runs without Docker or a live PostgreSQL connection. T014 validation runs `typecheck` and `build` without a database.

