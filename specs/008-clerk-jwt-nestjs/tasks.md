# Tasks: Clerk JWT Verification — NestJS Backend

**Input**: Design documents from `specs/008-clerk-jwt-nestjs/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅ | contracts/ ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label — US1/US2/US3/US4
- Exact file paths in every task description

---

## Phase 1: Setup

**Purpose**: Install `@clerk/backend` so JWT verification is available in the API.

- [X] T001 Run `pnpm --filter @leaseKo/api add @clerk/backend` and confirm `@clerk/backend` appears in `apps/api/package.json` `dependencies`

**Checkpoint**: `@clerk/backend` installed — foundational phase can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `CLERK_SECRET_KEY` must be required at startup and `IRequestContext` must allow `null` before any user story work begins.

**⚠️ CRITICAL**: T002–T004 must complete before any user story phase starts.

- [X] T002 [P] Update `apps/api/src/common/config/validation.schema.ts`
- [X] T003 [P] Update `apps/api/.env.example`
- [X] T004 Update `apps/api/src/common/types/request-context.type.ts`

**Checkpoint**: Foundation ready — all user story phases can now begin

---

## Phase 3: User Story 1 — Protected Routes Reject Invalid Requests (Priority: P1) 🎯 MVP

**Goal**: Every request to a protected route is verified against Clerk's JWKS. Missing, malformed, expired, or invalid tokens return `401`. Valid tokens set `request.user.userId` from the JWT `sub` claim.

**Independent Test**: `curl http://localhost:3001/api/v1/me` (no token) → `401`. `curl ... -H "Authorization: Bearer bad"` → `401`. `curl ... -H "Authorization: Bearer <valid-clerk-jwt>"` → `200 { userId: "user_..." }`.

- [X] T005 [P] [US1] Create `apps/api/src/modules/auth/infrastructure/clerk-token-verifier.service.ts`
- [X] T006 [P] [US1] Create `apps/api/src/modules/auth/application/verify-clerk-token.use-case.ts`
- [X] T007 [US1] Create `apps/api/src/common/guards/clerk-jwt.guard.ts`
- [X] T008 [US1] Update `apps/api/src/modules/auth/auth.module.ts`

**Checkpoint**: US1 complete — global guard active; protected routes return 401 without valid token

---

## Phase 4: User Story 2 — Public Routes Bypass Authentication (Priority: P1)

**Goal**: Routes decorated with `@Public()` are skipped by the guard. `GET /health` must continue returning `200` with no token after the global guard is active.

**Independent Test**: `curl http://localhost:3001/api/v1/health` (no token) → `200 { status: "ok" }`. Confirms `@Public()` bypass is working.

- [X] T009 [P] [US2] Create `apps/api/src/common/decorators/public.decorator.ts`
- [X] T010 [US2] Update `apps/api/src/modules/health/health.controller.ts`

**Checkpoint**: US2 complete — health endpoint returns 200 with no token; guard active on all other routes

---

## Phase 5: User Story 3 — Authenticated User Context in Controllers (Priority: P1)

**Goal**: The `@CurrentUser()` decorator provides typed access to `IRequestContext` in any controller method. `GET /me` returns `{ userId }` from the verified token — no DB lookup.

**Independent Test**: `curl http://localhost:3001/api/v1/me -H "Authorization: Bearer <valid-jwt>"` → `200 { "userId": "user_2abc..." }`. The `userId` matches the Clerk user who owns the JWT.

- [X] T011 [P] [US3] Create `apps/api/src/common/decorators/current-user.decorator.ts`
- [X] T012 [US3] Create `apps/api/src/modules/auth/presentation/auth.controller.ts`

**Checkpoint**: US3 complete — `GET /me` returns verified userId; `@CurrentUser()` pattern established for all future controllers

---

## Phase 6: User Story 4 — Swagger Bearer Auth Documentation (Priority: P2)

**Goal**: The Swagger UI shows a lock icon on `GET /me`, the "Authorize" dialog accepts a Bearer token, and requests from Swagger include the `Authorization` header. `addBearerAuth()` is already in `main.ts` — only controller annotations are needed.

**Independent Test**: Open `http://localhost:3001/api/docs` → click Authorize → paste JWT → `GET /me` → `200`. Log out → `GET /me` → `401`.

- [X] T013 [P] [US4] Verify `apps/api/src/main.ts` — `.addBearerAuth()` confirmed present in DocumentBuilder; no code change needed.

**Checkpoint**: US4 satisfied — Swagger Bearer auth fully functional via existing `addBearerAuth()` + new `@ApiBearerAuth()` on `AuthController`

---

## Phase 7: Housekeeping

**Purpose**: Deprecate the stub guard to prevent accidental use.

- [X] T014 Update `apps/api/src/common/guards/stub-bearer.guard.ts` — `@deprecated` JSDoc added

---

## Phase 8: Polish & Verification

**Purpose**: Confirm all tooling passes, manual routes behave correctly, and README is updated.

- [X] T015 [P] Run `pnpm --filter @leaseKo/api typecheck` — exits 0, zero TS errors
- [X] T016 [P] Run `pnpm --filter @leaseKo/api lint` — exits 0, zero ESLint errors
- [X] T017 Run `pnpm --filter @leaseKo/api build` — successful production build
- [ ] T018 Manual: start API (`pnpm --filter @leaseKo/api dev`) and run `curl http://localhost:3001/api/v1/health` with no token — expect `200 { status: "ok" }` — **requires Docker Desktop + running API**
- [ ] T019 Manual: `curl http://localhost:3001/api/v1/me` with no token — expect `401` — **requires Docker Desktop + running API**
- [ ] T020 Manual: `curl http://localhost:3001/api/v1/me -H "Authorization: Bearer invalid"` — expect `401` — **requires Docker Desktop + running API**
- [ ] T021 Manual: `curl http://localhost:3001/api/v1/me -H "Authorization: Bearer <valid-clerk-jwt>"` — expect `200 { userId: "user_..." }` — **requires Docker Desktop + running API**
- [X] T022 Update `README.md` — added Clerk backend section with env vars, JWT retrieval steps, curl tests, and architecture notes

---

## Dependencies & Execution Order

### Dependency Graph

```
T001 (install)
  └─► T002 [P] (CLERK_SECRET_KEY required)
  └─► T003 [P] (.env.example update)
  └─► T004 (IRequestContext nullable)
        └─► T005 [P] [US1] ClerkTokenVerifierService
        └─► T006 [P] [US1] VerifyClerkTokenUseCase
        └─► T009 [P] [US2] @Public() decorator
        └─► T011 [P] [US3] @CurrentUser() decorator
              T005 + T006 done
                └─► T007 [US1] ClerkJwtGuard
                      └─► T008 [US1] AuthModule wiring
                      └─► T009 done
                            └─► T010 [US2] @Public() on health
                      └─► T011 done
                            └─► T012 [US3] AuthController /me

All implementation done:
  └─► T013 [P] (verify Swagger - read-only)
  └─► T014 (deprecate stub guard)
  └─► T015 [P] typecheck
  └─► T016 [P] lint
        └─► T017 build
  └─► T018–T021 manual runtime tests
  └─► T022 README
```

### User Story Dependencies

- **US1 (P1)**: T005 + T006 → T007 → T008
- **US2 (P1)**: T009 → T010 (parallel with US1)
- **US3 (P1)**: T011 → T012 (parallel with US1 + US2)
- **US4 (P2)**: T013 — read-only verification, no dependencies

### Parallel Opportunities

```bash
# After T001, run in parallel:
T002  # validation.schema.ts
T003  # .env.example
T004  # IRequestContext (then gates US phases)

# After T004, run in parallel:
T005  # ClerkTokenVerifierService  (new file)
T006  # VerifyClerkTokenUseCase    (new file)
T009  # @Public() decorator         (new file)
T011  # @CurrentUser() decorator    (new file)

# After T005 + T006:
T007  # ClerkJwtGuard (depends on both)

# After T007 + T008 + T009 + T011:
T010  # @Public() on health controller
T012  # AuthController /me
T013  # Swagger verify (read-only)
T014  # Deprecate stub guard

# After all implementation:
T015  # typecheck (parallel)
T016  # lint (parallel)
T022  # README (parallel)
# Then:
T017  # build (after T015 + T016)
T018–T021  # manual tests (after T017)
```

---

## Implementation Strategy

### MVP: User Stories 1, 2, and 3 (all P1)

All three P1 stories are tightly coupled — the guard (US1), public route bypass (US2), and user context decorator (US3) must all be complete before any manual testing is meaningful.

1. Complete Phase 1: Install `@clerk/backend`
2. Complete Phase 2: Foundational (env + types)
3. Complete Phases 3–5: US1 + US2 + US3 in parallel (different files)
4. **STOP and VALIDATE**: Run all three curl tests (health ✅, /me no token 401 ✅, /me valid token 200 ✅)
5. Complete Phase 6: US4 Swagger verification (quick read-only)
6. Complete Phases 7–8: Housekeeping + verification gates + README

### Task Count Summary

| Phase | Tasks | User Story |
|-------|-------|-----------|
| 1: Setup | T001 | — |
| 2: Foundational | T002–T004 | — |
| 3: Protected Routes | T005–T008 | US1 (P1) |
| 4: Public Routes | T009–T010 | US2 (P1) |
| 5: User Context | T011–T012 | US3 (P1) |
| 6: Swagger | T013 | US4 (P2) |
| 7: Housekeeping | T014 | — |
| 8: Polish | T015–T022 | — |
| **Total** | **22** | |

### Parallel Opportunities: 5 identified

1. T002 + T003 + T004 (after T001 — different files)
2. T005 + T006 + T009 + T011 (after T004 — all new files)
3. T010 + T012 + T013 + T014 (after guard wiring complete)
4. T015 + T016 + T022 (after all implementation)
5. T018–T021 (manual tests — independent of each other)
