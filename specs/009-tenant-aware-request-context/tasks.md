# Tasks: Tenant-Aware Request Context

**Input**: Design documents from `specs/009-tenant-aware-request-context/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅ | contracts/ ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label — US1/US2/US3/US4
- Exact file paths in every task description

---

## Phase 1: Setup

**Purpose**: No new packages required — `@clerk/backend` is already installed. This phase creates the two new decorator files that all other phases depend on.

- [X] T001 [P] Create `apps/api/src/common/decorators/requires-tenant.decorator.ts`
- [X] T002 [P] Create `apps/api/src/common/decorators/current-tenant.decorator.ts`

**Checkpoint**: Decorators exist — Phase 2–4 can now proceed (T003, T004, T005 are independent of each other)

---

## Phase 2: Foundational — Infrastructure Layer

**Purpose**: Update `ClerkTokenVerifierService` to extract `tenantId` from the Clerk v2 JWT `o.id` claim alongside `userId`. This is the single source of truth for tenant identity extraction.

**⚠️ CRITICAL**: T003 must complete before T004 (use case) and T005 (guard), as they consume the new return type.

- [X] T003 Update `apps/api/src/modules/auth/infrastructure/clerk-token-verifier.service.ts`

**Checkpoint**: Infrastructure returns `{ userId, tenantId }` — use case and guard can now be updated

---

## Phase 3: User Story 1 — Authenticated Requests Carry Tenant Context (Priority: P1) 🎯 MVP

**Goal**: Every authenticated request has `request.user.tenantId` set from the verified JWT `o.id` claim. `@CurrentTenant()` returns the tenantId. `@CurrentUser()` returns the full context including tenantId.

**Independent Test**: `curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer <valid-jwt-with-org>"` → `200 { userId: "user_...", tenantId: "org_..." }`. `@CurrentUser()` and `@CurrentTenant()` decorators both return the correct values.

- [X] T004 [US1] Update `apps/api/src/modules/auth/application/verify-clerk-token.use-case.ts`
- [X] T005 [US1] Update `apps/api/src/common/guards/clerk-jwt.guard.ts`

**Checkpoint**: US1 complete — `request.user.tenantId` is populated from the verified JWT on every authenticated request; `@CurrentUser()` returns full context including tenantId; `@CurrentTenant()` returns tenantId

---

## Phase 4: User Story 2 — Missing Tenant Context Is Rejected (Priority: P1)

**Goal**: Routes decorated with `@RequiresTenant()` return `403 Forbidden` when the JWT has no active org. No JWT claim details are exposed in the error response.

**Independent Test**: `curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer <valid-jwt-without-org>"` → `403 Forbidden` with `{ statusCode: 403, message: "Forbidden" }`.

- [X] T006 [US2] Update `apps/api/src/modules/auth/presentation/auth.controller.ts`

**Checkpoint**: US2 complete — `GET /auth/me` returns `403` when valid JWT has no org context; guard enforces `@RequiresTenant()` at the framework level before any controller logic runs

---

## Phase 5: User Story 3 — Public Routes Remain Unaffected (Priority: P1)

**Goal**: `GET /health` continues to return `200 OK` with no token after guard changes. All public routes bypass auth and tenant checks.

**Independent Test**: `curl http://localhost:3001/api/v1/health` (no Authorization header) → `200 { status: "ok" }`.

- [X] T007 [P] [US3] Verify `apps/api/src/modules/health/health.controller.ts`

**Checkpoint**: US3 satisfied — public routes unaffected by tenant context changes; `@Public()` bypass path confirmed

---

## Phase 6: User Story 4 — Sample Endpoint Returns userId + tenantId (Priority: P2)

**Goal**: `GET /auth/me` returns `{ userId, tenantId }` from the request context. No database lookup. Swagger documents `401` and `403` responses.

**Independent Test**: `curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer <valid-jwt-with-org>"` → `200 { "userId": "user_2abc...", "tenantId": "org_456..." }`. The values match the Clerk Dashboard for the signed-in user and their active org.

- [X] T008 [P] [US4] Verify `apps/api/src/main.ts`
- [X] T009 [P] [US4] Verify `apps/api/src/modules/auth/auth.module.ts`

**Checkpoint**: US4 complete — `GET /auth/me` fully functional returning `{ userId, tenantId }` with correct Swagger documentation

---

## Phase 7: Polish & Verification

**Purpose**: Confirm all tooling passes and update documentation.

- [X] T010 [P] Run `pnpm --filter @leaseKo/api typecheck`
- [X] T011 [P] Run `pnpm --filter @leaseKo/api lint`
- [X] T012 Run `pnpm --filter @leaseKo/api build`
- [ ] T013 Manual: start API (`pnpm --filter @leaseKo/api dev`) and `curl http://localhost:3001/api/v1/health` with no token — expect `200 { status: "ok" }` — **requires Docker Desktop + running API**
- [ ] T014 Manual: `curl http://localhost:3001/api/v1/auth/me` with no token — expect `401` — **requires running API**
- [ ] T015 Manual: `curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer invalid"` — expect `401` — **requires running API**
- [ ] T016 Manual: `curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer <valid-jwt-no-org>"` — expect `403` — **requires running API + Clerk user without active org**
- [ ] T017 Manual: `curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer <valid-jwt-with-org>"` — expect `200 { userId, tenantId }` — **requires running API + Clerk user with active org**
- [X] T018 Update `README.md`

---

## Dependencies & Execution Order

### Dependency Graph

```
T001 [P] (@RequiresTenant decorator)  T002 [P] (@CurrentTenant decorator)
         │                                         │
         └──────────────┬────────────────────────-─┘
                        │
                  T003 (ClerkTokenVerifierService — extract tenantId)
                        │
               ┌────────┴────────┐
               │                 │
          T004 [US1]         T005 [US1]
     (VerifyClerkTokenUseCase)  (ClerkJwtGuard — set + enforce)
                                     │
                               T006 [US2]
                          (AuthController.me — @RequiresTenant)
                                     │
                      T007 [US3] ──┐ │ ┌── T008/T009 [US4]
                     (health verify)  │   (swagger verify)
                                      │
                           T010/T011 [P] (typecheck + lint)
                                      │
                                   T012 (build)
                                      │
                             T013–T017 (manual runtime)
                                      │
                                   T018 (README)
```

### Parallel Opportunities

**Immediate parallel** (no dependencies):
- T001 + T002 (both new files, different paths)

**After T003** (parallel):
- T004 (use case) + T005 (guard) can start simultaneously once T003 is done
- T007 (health verify) + T008 + T009 (swagger verify) — read-only, no blocking

**After T005 + T006** (parallel):
- T010 (typecheck) + T011 (lint) run simultaneously

### MVP Scope

**Minimum for US1 demo**: T001 → T003 → T004 → T005 → T010 → T011 → T012  
**Minimum for US2 demo**: All of above + T006  
**Full feature**: All tasks T001–T018

---

## Implementation Strategy

1. **MVP-first**: T001–T006 implement the complete feature logic (6 tasks, ~30 min)
2. **Verification**: T010–T012 confirm tooling passes before manual testing
3. **Runtime tests**: T013–T017 require Docker + a real Clerk org setup (deferred until infra available)
4. **No new packages**: `@clerk/backend` already installed; zero new dependencies
5. **No new modules**: All changes in existing files or new decorator files in `common/`
