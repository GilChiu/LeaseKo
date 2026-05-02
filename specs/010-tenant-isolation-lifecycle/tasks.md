# Tasks: Tenant Isolation Request Lifecycle Enforcement

**Feature**: 010-tenant-isolation-lifecycle
**Input**: spec.md, plan.md, research.md, data-model.md, contracts/tenant-context.openapi.yml
**Branch**: `010-tenant-isolation-lifecycle`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)
- Tests are **not** included (no test tasks requested in spec)

---

## Phase 1: Setup

**Purpose**: No new project structure is needed. Existing `apps/api/src/common/` and `apps/api/src/modules/` are reused. This phase confirms the implementation baseline.

- [X] T001 Read and confirm existing files compile: `apps/api/src/common/guards/clerk-jwt.guard.ts`, `apps/api/src/common/decorators/requires-tenant.decorator.ts`, `apps/api/src/common/types/request-context.type.ts`

---

## Phase 2: Foundational

**Purpose**: Create the `@UserOnly()` decorator and update the guard. These are blocking prerequisites — US1, US2, and US4 all depend on them.

- [X] T002 Create `apps/api/src/common/decorators/user-only.decorator.ts` — export `IS_USER_ONLY_KEY = 'isUserOnly'` and `UserOnly = (): MethodDecorator & ClassDecorator => SetMetadata(IS_USER_ONLY_KEY, true)`
- [X] T003 Update `apps/api/src/common/guards/clerk-jwt.guard.ts` — import `IS_USER_ONLY_KEY` from `user-only.decorator`; after setting `request.user`, check `IS_USER_ONLY_KEY` via `reflector.getAllAndOverride()` and if true `return true` (skip tenant check); existing `IS_TENANT_REQUIRED_KEY` check remains unchanged (depends on T002)

**Checkpoint**: Guard now has three exit paths — `@Public()` bypass, `@UserOnly()` skip-tenant, `@RequiresTenant()` enforce-tenant.

---

## Phase 3: User Story 1 — Tenant-Scoped Route Rejects Missing Tenant Context (P1)

**Goal**: Routes decorated with `@RequiresTenant()` return `403 Forbidden` when the JWT has no active org. The `ClerkJwtGuard` already implements this via `IS_TENANT_REQUIRED_KEY`. This phase updates the JSDoc and verifies the `GET /auth/me` endpoint (which uses `@RequiresTenant()`) is correct.

**Independent Test**: `curl http://localhost:3001/api/v1/tenant-context -H "Authorization: Bearer <user-only-jwt>"` → `403 Forbidden` (once T007–T009 complete). Or verify `GET /auth/me` with a user-only JWT → `403`.

- [X] T004 [P] [US1] Update JSDoc in `apps/api/src/common/types/request-context.type.ts` — change `tenantId` comment from "null until Feature 009" to "Populated from the Clerk JWT `o.id` claim (compact v2 format). null when no active organization session."
- [X] T005 [P] [US1] Verify `apps/api/src/modules/auth/presentation/auth.controller.ts` — confirm `@RequiresTenant()` is applied to `GET /auth/me` and it returns `{ userId, tenantId }`; no code change expected

**Checkpoint**: US1 satisfied — `@RequiresTenant()` enforcement verified on an existing route.

---

## Phase 4: User Story 2 — User-Only Routes Work Without Tenant (P2)

**Goal**: Routes decorated with `@UserOnly()` accept a valid JWT regardless of whether `tenantId` is present.

**Independent Test**: Apply `@UserOnly()` to a test route and call it with a user-only JWT → `200`. (Use Swagger or curl once T006 exists.) The existing undecorated protected routes already behave as user-only by default — `@UserOnly()` makes this explicit.

- [X] T006 [US2] Update `apps/api/src/modules/auth/presentation/auth.controller.ts` — remove `@RequiresTenant()` from `GET /auth/me` and replace with `@UserOnly()` (from `user-only.decorator`); update return type to `{ userId: string; tenantId: string | null }` and return `{ userId: user.userId, tenantId: user.tenantId }`; add `@ApiPropertyOptional` note to Swagger schema (depends on T002, T003)

**Checkpoint**: US2 satisfied — `GET /auth/me` returns `200` for any authenticated user, regardless of org context. `tenantId` is `null` when no org is active.

---

## Phase 5: User Story 3 — Public Routes Unaffected (P2)

**Goal**: `GET /health` (and any other `@Public()` route) continues to return `200` with no token.

**Independent Test**: `curl http://localhost:3001/api/v1/health` → `200 { status: "ok" }`.

- [X] T007 [P] [US3] Verify `apps/api/src/modules/health/health.controller.ts` — confirm `@Public()` decorator is present on `check()`; no code change expected (guard `@Public()` check runs before `@UserOnly()` and `@RequiresTenant()` — order preserved by T003)

**Checkpoint**: US3 satisfied — public routes unchanged.

---

## Phase 6: User Story 4 — Tenant-Context Verification Endpoint (P3)

**Goal**: `GET /tenant-context` returns `{ tenantId }` for org-authenticated requests and `403` for user-only requests.

**Independent Test**: `curl http://localhost:3001/api/v1/tenant-context -H "Authorization: Bearer <org-jwt>"` → `200 { "tenantId": "org_..." }`.

- [X] T008 [US4] Create `apps/api/src/modules/tenant-context/tenant-context.module.ts` — `@Module({ controllers: [TenantContextController] })` export `TenantContextModule`
- [X] T009 [US4] Create `apps/api/src/modules/tenant-context/presentation/tenant-context.controller.ts` — `@Controller('tenant-context')` with `@Get()` method `getTenantContext(@CurrentTenant() tenantId: string): { tenantId: string }`; decorated with `@RequiresTenant()`, `@ApiBearerAuth()`, `@ApiTags('tenant-context')`, `@ApiOkResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse` (depends on T002, T003)
- [X] T010 [US4] Update `apps/api/src/app.module.ts` — add `TenantContextModule` to `imports` array (depends on T008)

**Checkpoint**: US4 satisfied — `GET /api/v1/tenant-context` is live, enforces tenant context, and is Swagger-documented.

---

## Phase 7: Polish & Verification

**Purpose**: Tooling checks and documentation update.

- [X] T011 [P] Run `pnpm --filter @leaseKo/api typecheck`
- [X] T012 [P] Run `pnpm --filter @leaseKo/api lint`
- [X] T013 Run `pnpm --filter @leaseKo/api build`
- [ ] T014 Manual: start API (`pnpm --filter @leaseKo/api dev`) and run full route behavior matrix from quickstart.md — **requires Docker Desktop + running API**
- [X] T015 Update `README.md`

---

## Dependencies & Execution Order

### Dependency Graph

```
T001 (baseline verify)
    │
    ├── T002 (create @UserOnly decorator)
    │       │
    │       └── T003 (update guard — @UserOnly support)
    │               │
    │       ┌───────┴──────────────────────────┐
    │       │                                  │
    │    T004/T005/T007 [P]           T006 (auth/me → @UserOnly)
    │    (verify existing)                     │
    │                                 T008/T009 [P] (TenantContext module+controller)
    │                                          │
    │                                       T010 (register in AppModule)
    │                                          │
    │                    ┌─────────────────────┤
    │                    │                     │
    │                T011/T012 [P]          T015
    │               (typecheck+lint)    (README update)
    │                    │
    │                  T013 (build)
    │                    │
    │                  T014 (manual runtime)
```

### Parallel Execution per Phase

**Phase 2 (serial)**: T002 → T003 (guard depends on decorator)

**Phase 3–5 (parallel after T003)**:
- T004, T005, T007 — all read-only verifications, no file conflicts

**Phase 6 (partially parallel after T003)**:
- T008 + T009 can run in parallel (different files)
- T010 depends on T008

**Phase 7 (parallel after T010)**:
- T011 + T012 in parallel
- T013 after both
- T015 independent

---

## Implementation Strategy

**MVP Scope** (deliver US1 first): T001 → T002 → T003 → T004 + T005. After T003, the guard correctly handles all three paths (`@Public()`, `@UserOnly()`, `@RequiresTenant()`). US1 enforcement already worked from Feature 009 — this confirms and completes it.

**Increment 2** (US2): T006 — switches `GET /auth/me` to `@UserOnly()`, enabling pre-tenant flows.

**Increment 3** (US4): T008–T010 — ships the verification endpoint.

**Increment 4** (polish): T011–T015 — all tooling gates and documentation.

US3 (public routes) requires no code change — verified passively by T007 and T014.

---

## Task Count Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | 1 | — |
| Phase 2: Foundational | 2 | None (T002 → T003 serial) |
| Phase 3: US1 | 2 | T004 + T005 parallel |
| Phase 4: US2 | 1 | — |
| Phase 5: US3 | 1 | Parallel with Phase 3 |
| Phase 6: US4 | 3 | T008 + T009 parallel |
| Phase 7: Polish | 5 | T011 + T012 parallel; T015 independent |
| **Total** | **15** | **6 parallel opportunities** |
