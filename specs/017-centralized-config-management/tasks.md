# Tasks: Centralized Config Management

**Feature**: `017-centralized-config-management`
**Branch**: `017-centralized-config-management`
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)
**Generated**: 2026-05-06

---

## Overview

Refactor the flat `AppConfig` factory into four domain-scoped typed config
namespaces (`app`, `database`, `redis`, `clerk`), extend the Joi validation schema,
clean `main.ts` of direct `process.env` reads, update `ClerkTokenVerifierService`
to use the `clerk` namespace, and document the config pattern.

**Total tasks**: 14
**Phases**: Setup → Foundational → US1 → US2 → US3/US4 → Polish

---

## Phase 1: Setup

> Verify the current state before making changes. No file edits in this phase.

- [x] T001 Audit `process.env` usage: run `grep -r "process.env" apps/api/src --include="*.ts"` and confirm only `common/config/app.config.ts` and `main.ts` match
- [x] T002 [P] Confirm `@nestjs/config` `registerAs` is available: check `apps/api/package.json` for `@nestjs/config` version ≥ 3.0
- [x] T003 [P] Confirm `joi` package is installed: check `apps/api/package.json` for `joi` dependency

---

## Phase 2: Foundational — Config Factories

> Create the three new config factories and refactor `app.config.ts`.
> These are the foundation that all subsequent phases depend on.

- [x] T004 [P] Create `apps/api/src/common/config/database.config.ts` with `DatabaseConfig` interface and `registerAs('database', ...)` factory that reads `process.env.DATABASE_URL`
- [x] T005 [P] Create `apps/api/src/common/config/redis.config.ts` with `RedisConfig` interface and `registerAs('redis', ...)` factory that reads `process.env.REDIS_URL`
- [x] T006 [P] Create `apps/api/src/common/config/clerk.config.ts` with `ClerkConfig` interface (`secretKey`, `jwksUrl`, `issuer`, `audience`) and `registerAs('clerk', ...)` factory
- [x] T007 Refactor `apps/api/src/common/config/app.config.ts` to use `registerAs('app', ...)` — keep only `nodeEnv`, `port`, `frontendUrl`; remove `databaseUrl`, `redisUrl`, `clerkSecretKey`, `clerkJwksUrl` fields

---

## Phase 3: User Story 1 — Startup Validation (P1)

> US1: API fails fast at startup with a clear named-variable error when any required env var is missing.
> **Independent test**: Remove `DATABASE_URL` from `.env` → startup exits with `"DATABASE_URL" is required`.

- [x] T008 [US1] Update `apps/api/src/common/config/validation.schema.ts` — add `CLERK_ISSUER: Joi.string().optional().allow("")` and `CLERK_AUDIENCE: Joi.string().optional().allow("")` after `CLERK_JWKS_URL`
- [x] T009 [US1] Update `apps/api/src/app.module.ts` — add imports for `databaseConfig`, `redisConfig`, `clerkConfig` and update `load` array to `[appConfig, databaseConfig, redisConfig, clerkConfig]`

---

## Phase 4: User Story 2 — Typed Config Injection (P1)

> US2: Infrastructure services inject typed config namespaces instead of raw `process.env` or unnamespaced string keys.
> **Independent test**: Inspect `ClerkTokenVerifierService` — verify it uses `clerk.secretKey` not `CLERK_SECRET_KEY`.

- [x] T010 [US2] Update `apps/api/src/modules/auth/infrastructure/clerk-token-verifier.service.ts` — replace `this.config.getOrThrow<string>("CLERK_SECRET_KEY")` with `this.config.getOrThrow<ClerkConfig>("clerk")` and destructure `secretKey`, pass optional `issuer` and `audience` to `verifyToken` when defined
- [x] T011 [US2] Update `apps/api/src/main.ts` — replace 4× `process.env` reads with `app.get(ConfigService)` using `configService.getOrThrow<AppConfig>("app")` to get `port`, `frontendUrl`, `nodeEnv`

---

## Phase 5: User Story 3 & 4 — Auditability & Developer Onboarding (P2)

> US3: `process.env` is never accessed outside `common/config/`.
> US4: New developer can set up their `.env` from `.env.example` alone.
> **Independent test (US3)**: `grep -r "process\.env" apps/api/src --include="*.ts"` returns only `common/config/*.ts`.
> **Independent test (US4)**: Copy `.env.example` to `.env`, fill Clerk key, `pnpm --filter @leaseKo/api start:dev` succeeds.

- [x] T012 [P] [US3] [US4] Update `apps/api/.env.example` — add `CLERK_ISSUER=` and `CLERK_AUDIENCE=` entries with inline comments below `CLERK_JWKS_URL`
- [x] T013 [US4] Add a **Configuration Management** section to `docs/backend-architecture.md` covering: config namespace table (`app`/`database`/`redis`/`clerk` with file paths), injection code example for a new infrastructure service, `process.env` policy, env var table (required vs optional with defaults), and startup validation error troubleshooting

---

## Phase 6: Polish & Validation

> Verify the full implementation compiles, tests pass, and the `process.env` audit is clean.

- [x] T014 [P] Run `pnpm --filter @leaseKo/api build` — confirm exit 0 (TypeScript compile check)
- [x] T015 [P] Run `pnpm --filter @leaseKo/api test` — confirm all 3 suites and 10 tests pass

---

## Dependency Graph

```
T001 (audit)  ──────────────────────────────────────► T014 (build check)
T002 (check @nestjs/config) ──► T004, T005, T006, T007
T003 (check joi) ────────────► T008
T004 (database.config) ──┐
T005 (redis.config) ─────┼──► T009 (AppModule load array) ──► T010, T011
T006 (clerk.config) ─────┤                                      │
T007 (app.config) ───────┘                                      │
T008 (validation.schema) ──────────────────────────────────────►┘
T009 (AppModule) ──────────────────────────────────────────────► T014
T010 (ClerkTokenVerifier) ────────────────────────────────────► T014
T011 (main.ts) ───────────────────────────────────────────────► T014
T012 (.env.example) ─────────────────── independent ──────────► T015 (informational)
T013 (docs) ─────────────────────────── independent ──────────► T015 (informational)
T014 (build) ─────────────────────────────────────────────────► T015
```

---

## Parallel Execution Opportunities

**Batch A** (fully independent — run together):
- T002, T003 (dependency checks)
- T004, T005, T006 (create new config files — different files, no deps on each other)

**Batch B** (after T004/T005/T006 complete):
- T007 (refactor app.config.ts)
- T008 (extend validation.schema.ts)

**Batch C** (after T007 + T008 complete):
- T009 (AppModule)

**Batch D** (after T009 complete):
- T010 (ClerkTokenVerifierService)
- T011 (main.ts)
- T012 (.env.example) — independent, can run any time

**Batch E** (after T010 + T011 complete):
- T013 (docs) — independent, can run any time
- T014 (build check) — requires T009 + T010 + T011

**Batch F** (after T014):
- T015 (test run)

---

## Implementation Strategy

**MVP scope**: T001 → T009 (Phases 1–3). Completing these gives fully validated startup failure for missing vars and all 4 namespaces registered — the primary P1 value.

**Full scope**: Add T010 (typed Clerk injection) + T011 (clean main.ts) for P1 US2 completion, then T012–T013 for P2 US3/US4.

**Suggested execution order for an LLM agent**:
1. T001 (confirm current state)
2. T004, T005, T006 in parallel (create new files)
3. T007, T008 in parallel (modify existing files)
4. T009 (wire AppModule)
5. T010, T011, T012 in parallel (consumer updates + env example)
6. T013 (docs)
7. T014, T015 (validation)

---

## Validation Checklist

- [ ] `pnpm --filter @leaseKo/api build` exits 0
- [ ] `pnpm --filter @leaseKo/api test` — 3 suites, 10 tests, all pass
- [ ] `grep -r "process\.env" apps/api/src --include="*.ts"` returns ONLY `common/config/*.ts` matches
- [ ] Starting API with `CLERK_SECRET_KEY` removed fails with `"CLERK_SECRET_KEY" is required`
- [ ] Starting API with `DATABASE_URL` removed fails with `"DATABASE_URL" is required`
- [ ] Starting API without `CLERK_ISSUER` and `CLERK_AUDIENCE` succeeds (optional vars)
- [ ] Swagger UI loads at `http://localhost:3001/api/docs` in development mode
- [ ] CORS allows `FRONTEND_URL` origin
- [ ] No `CLERK_SECRET_KEY` value appears in console output
- [ ] `apps/api/.env.example` includes all 9 variables
- [ ] `docs/backend-architecture.md` has a Configuration Management section
