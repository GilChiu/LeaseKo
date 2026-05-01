# Tasks: NestJS API Foundation Setup

**Feature**: `004-nestjs-api-setup`
**Input**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/api-contracts.md](./contracts/api-contracts.md)

---

## Phase 1: Setup — Dependencies & Package Config

**Purpose**: Install new runtime and dev dependencies, add test scripts to `package.json`.

- [X] T001 Install `joi` runtime dependency in `apps/api/package.json` — run `pnpm --filter @leaseKo/api add joi`
- [X] T002 [P] Add Jest devDependencies and test scripts to `apps/api/package.json` — add `jest`, `ts-jest`, `@types/jest`, `@nestjs/testing` to `devDependencies`; add `"test": "jest"`, `"test:watch": "jest --watch"`, `"test:cov": "jest --coverage"` to `scripts`
- [X] T003 [P] Create `apps/api/jest.config.ts` with `ts-jest` transformer, `rootDir: 'src'`, `testRegex: '.*\\.spec\\.ts$'`, `moduleNameMapper` for `@/*` path alias

---

## Phase 2: Foundational — Config Infrastructure

**Purpose**: Establish startup env-var validation (Joi schema), centralized config factory, updated `.env.example`, updated `main.ts`, and updated `app.module.ts`. These block all other phases — the app must start cleanly before anything else can be verified.

**Independent Test**: Start the API with `.env` present → starts cleanly; start without `FRONTEND_URL` → exits with descriptive error.

- [X] T004 Create `apps/api/src/common/config/validation.schema.ts` with Joi schema validating `NODE_ENV`, `PORT`, `FRONTEND_URL` (required), `DATABASE_URL` (required), `REDIS_URL` (required), `CLERK_SECRET_KEY` (optional), `CLERK_JWKS_URL` (optional)
- [X] T005 [P] Create `apps/api/src/common/config/app.config.ts` exporting `AppConfig` interface and `appConfig()` factory function
- [X] T006 Update `apps/api/.env.example` — rename `CORS_ORIGIN` → `FRONTEND_URL`, add `CLERK_SECRET_KEY=` and `CLERK_JWKS_URL=` blocks with comments
- [X] T007 Update `apps/api/src/app.module.ts` — add `validationSchema` and `load: [appConfig]` to `ConfigModule.forRoot()`; import `AuthModule`, `TenantsModule`, `DatabaseModule`, `QueuesModule`
- [X] T008 Update `apps/api/src/main.ts` — replace `process.env.CORS_ORIGIN` with `process.env.FRONTEND_URL`; register `GlobalExceptionFilter` via `app.useGlobalFilters(new GlobalExceptionFilter())`

---

## Phase 3: User Story 1 — Developer Runs and Verifies the API (P1)

**Story Goal**: Developer copies `.env.example`, runs `pnpm dev`, and confirms `GET /api/v1/health` returns `{ status, service, timestamp }`.

**Independent Test**: `curl http://localhost:3001/api/v1/health` → `{ "status": "ok", "service": "api", "timestamp": "..." }`

- [X] T009 [US1] Update `apps/api/src/modules/health/presentation/dto/health-response.dto.ts` — add `@ApiProperty({ example: 'api' }) service!: string`
- [X] T010 [US1] Update `apps/api/src/modules/health/health.controller.ts` — add `service: 'api'` to the `check()` return value
- [X] T011 [US1] Run `pnpm install` from monorepo root to install `joi` and new Jest devDeps — verify exit code 0
- [X] T012 [US1] Copy `apps/api/.env.example` to `apps/api/.env` locally and start API; verify `GET /api/v1/health` returns HTTP 200 with `{ status: "ok", service: "api", timestamp: "..." }`
- [X] T013 [US1] Verify startup failure: remove `FRONTEND_URL` from `.env` and start API; confirm process exits with a descriptive Joi validation error naming `FRONTEND_URL`; restore `.env`

---

## Phase 4: User Story 2 — Developer Builds and Lints the API (P1)

**Story Goal**: `pnpm build` and `pnpm lint` both exit 0 with zero errors.

**Independent Test**: `pnpm --filter @leaseKo/api build` exits 0; `pnpm --filter @leaseKo/api lint` exits 0.

- [X] T014 [US2] Run `pnpm --filter @leaseKo/api build` — verify exit code 0 and zero TypeScript errors
- [X] T015 [US2] Run `pnpm --filter @leaseKo/api lint` — verify zero ESLint errors and zero warnings

---

## Phase 5: User Story 3 — Developer Works in a Clean Architecture (P2)

**Story Goal**: Every business module has four explicit architecture layers; `common/` has a dedicated subdirectory for each concern.

**Independent Test**: `ls apps/api/src/modules/auth/` → shows `domain/`, `application/`, `infrastructure/`, `presentation/`; `ls apps/api/src/common/` → shows `config/`, `decorators/`, `filters/`, `guards/`, `interceptors/`, `middleware/`, `pipes/`, `types/`, `utils/`.

- [X] T016 [P] [US3] Create `apps/api/src/common/types/request-context.type.ts` exporting `IRequestContext { userId: string; tenantId: string; role: string }` with JSDoc describing Epic 2 population contract
- [X] T017 [P] [US3] Create `.gitkeep` files in `apps/api/src/common/interceptors/`, `src/common/pipes/`, `src/common/utils/`
- [X] T018 [P] [US3] Create `apps/api/src/modules/auth/auth.module.ts` as empty `@Module({})` with JSDoc describing Epic 2 content and architecture rules
- [X] T019 [P] [US3] Create `.gitkeep` files in `apps/api/src/modules/auth/domain/`, `application/`, `infrastructure/`, `presentation/`
- [X] T020 [P] [US3] Create `apps/api/src/modules/tenants/tenants.module.ts` as empty `@Module({})` with JSDoc describing future content and tenant_id architecture rules
- [X] T021 [P] [US3] Create `.gitkeep` files in `apps/api/src/modules/tenants/domain/`, `application/`, `infrastructure/`, `presentation/`

---

## Phase 6: User Story 4 — Developer Handles Errors Consistently (P2)

**Story Goal**: All 4xx and 5xx responses return `{ statusCode, message, error? }` regardless of error type.

**Independent Test**: `curl http://localhost:3001/api/v1/nonexistent` → `{ "statusCode": 404, "message": "...", "error": "Not Found" }`; `curl -X POST http://localhost:3001/api/v1/health` (wrong method) → standardized error shape.

- [X] T022 [US4] Create `apps/api/src/common/filters/global-exception.filter.ts` with `@Catch()` class handling both `HttpException` (extracts status/message/error) and unknown errors (logs stack, returns 500 without exposing stack trace)
- [X] T023 [US4] Verify `GlobalExceptionFilter` is registered in `apps/api/src/main.ts` via `app.useGlobalFilters()` (done in T008; confirm registration is correct)
- [X] T024 [US4] Smoke-test error envelope: run API and call a non-existent route; confirm response shape is `{ statusCode, message, error }` with no stack trace

---

## Phase 7: User Story 5 — Developer Integrates Future Services (P3)

**Story Goal**: `database/prisma/` and `queues/bullmq/` module entry points exist and are registered; API starts without DB or Redis running.

**Independent Test**: `ls apps/api/src/database/prisma/` → `prisma.module.ts`, `prisma.service.ts`; `ls apps/api/src/queues/bullmq/` → `bullmq.module.ts`; start API without Docker running → no startup error.

- [X] T025 [P] [US5] Create `apps/api/src/database/prisma/prisma.service.ts` as startup-safe `@Injectable()` with logging-only `onModuleInit()` (no `$connect()` call) and JSDoc describing Feature 005 entry point
- [X] T026 [P] [US5] Create `apps/api/src/database/prisma/prisma.module.ts` as `@Global()` `@Module({ providers: [PrismaService], exports: [PrismaService] })` named `DatabaseModule`
- [X] T027 [P] [US5] Create `apps/api/src/queues/bullmq/bullmq.module.ts` as empty `@Module({})` named `QueuesModule` with JSDoc describing Feature 007 entry point and constitution rules for BullMQ jobs

---

## Phase 8: Polish — Testing Infrastructure

**Purpose**: Establish Jest test infrastructure and validate all user stories with a passing unit test.

- [X] T028 [US1] [US3] Create `apps/api/src/modules/health/health.controller.spec.ts` with 3 unit tests: `status === 'ok'`, `service === 'api'`, `timestamp` is valid ISO 8601
- [X] T029 Run `pnpm --filter @leaseKo/api test` — verify 3/3 tests pass, exit code 0

---

## Dependencies

```
T001 (joi install) → T011 (pnpm install) → T012 (start API)
T002 + T003 (jest setup) → T029 (run tests)
T004 + T005 (config) → T007 (app.module.ts) → T008 (main.ts) → T012, T013
T006 (.env.example) → T012, T013
T009 + T010 (health DTO + controller) → T028 (health spec) → T029
T018 + T020 (auth/tenants modules) → T007 (app.module.ts imports)
T025 + T026 (database module) → T007 (app.module.ts imports)
T027 (queues module) → T007 (app.module.ts imports)
T022 (exception filter) → T008 (main.ts registers it) → T024 (smoke test)
T014 + T015 (build + lint) → must run after all source files are in place
```

## Parallel Execution (per story)

**US1 (P1 — API runs)**:
```
T004 ─┐
T005 ─┤→ T007 → T008 → T011 → T012 → T013
T006 ─┘
T001 ──────────→ T011
T009 ─┐
T010 ─┘ (parallel with config tasks)
```

**US2 (P1 — Build + lint)** — run after all source files complete:
```
T014 ─┐ (parallel)
T015 ─┘
```

**US3 (P2 — Clean architecture)** — all parallel:
```
T016 ─┐
T017 ─┤
T018 ─┤ (all parallel)
T019 ─┤
T020 ─┤
T021 ─┘
```

**US4 (P2 — Error handling)**:
```
T022 → T008 (already done) → T023 → T024
```

**US5 (P3 — Future integrations)** — all parallel:
```
T025 ─┐
T026 ─┤ (all parallel) → T007 (app.module.ts)
T027 ─┘
```

---

## Implementation Strategy (MVP First)

**Increment 1** — P1 stories: Phases 1–4 (T001–T015)
→ API starts, env validation works, health endpoint returns correct shape, build and lint pass

**Increment 2** — P2 stories: Phases 5–6 (T016–T024)
→ Clean architecture layers visible, error envelope standardized

**Increment 3** — P3 story + Polish: Phases 7–8 (T025–T029)
→ Prisma/BullMQ entry points scaffolded, Jest test suite established

---

## Summary

- **Total tasks**: 29
- **User Story 1 (P1)**: T009–T013 (5 tasks) — API starts and health endpoint works
- **User Story 2 (P1)**: T014–T015 (2 tasks) — Build and lint pass
- **User Story 3 (P2)**: T016–T021 (6 tasks) — Clean architecture visible
- **User Story 4 (P2)**: T022–T024 (3 tasks) — Standardized error envelope
- **User Story 5 (P3)**: T025–T027 (3 tasks) — Future integration entry points
- **Setup/Foundation/Polish**: T001–T008, T028–T029 (10 tasks)
- **Parallel opportunities**: 13 identified (T002–T003, T004–T005, T009–T010, T014–T015, T016–T021, T025–T027)
- **MVP scope**: Increment 1 (T001–T015) — delivers a working, validated API with correct health endpoint
