# Data Model: Jest Testing Infrastructure Setup

**Feature**: `021-jest-testing-infrastructure`
**Created**: 2026-05-06

---

## No New Database Entities

This feature introduces no new database tables, Prisma schemas, or domain entities. All changes are to build tooling, test configuration, and documentation.

---

## Test Configuration Schema

### Jest Unit Config (MODIFY — `apps/api/jest.config.ts`)

| Field | Before | After |
|---|---|---|
| `moduleFileExtensions` | `["js", "json", "ts"]` | unchanged |
| `rootDir` | `"src"` | unchanged |
| `testRegex` | `".*\\.spec\\.ts$"` | unchanged |
| `transform` | `ts-jest` | unchanged |
| `collectCoverageFrom` | `["**/*.(t|j)s"]` | `["**/*.(t|j)s", "!main.ts", "!**/*.module.ts", "!**/*.dto.ts", "!**/*.interface.ts", "!**/*.d.ts", "!**/prisma/**"]` |
| `coverageDirectory` | `"../coverage"` | unchanged |
| `testEnvironment` | `"node"` | unchanged |
| `moduleNameMapper` | `{ "^@/(.*)$": "<rootDir>/$1" }` | unchanged |

### Jest E2E Config (CREATE — `apps/api/jest-e2e.config.ts`)

| Field | Value |
|---|---|
| `moduleFileExtensions` | `["js", "json", "ts"]` |
| `rootDir` | `"."` (repo root for the `apps/api` workspace) |
| `testRegex` | `"\\.e2e-spec\\.ts$"` |
| `transform` | `ts-jest` |
| `testEnvironment` | `"node"` |
| `moduleNameMapper` | `{ "^@/(.*)$": "<rootDir>/src/$1" }` |

---

## File Layout (after this feature)

```text
apps/api/
├── jest.config.ts              ← MODIFY (coverage exclusions)
├── jest-e2e.config.ts          ← CREATE
├── .env.example                ← unchanged
├── .env.test.example           ← CREATE
├── package.json                ← MODIFY (add test:e2e script)
├── test/
│   └── health.e2e-spec.ts      ← CREATE
└── src/
    └── ...                     ← all existing spec files unchanged

docs/
└── testing.md                  ← CREATE

.gitignore                      ← MODIFY (add apps/api/.env.test)
```

---

## Test Environment Variables (`.env.test.example`)

| Variable | Test Value | Notes |
|---|---|---|
| `NODE_ENV` | `test` | Prevents production behavior |
| `PORT` | `3002` | Avoids collision with dev (3001) |
| `FRONTEND_URL` | `http://localhost:3000` | Non-sensitive |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/leaseKo_test` | Test DB — not used by unit tests |
| `REDIS_URL` | `redis://localhost:6379` | Not used by unit tests |
| `CLERK_SECRET_KEY` | `test_sk_placeholder` | Never validated in unit tests |
| `CLERK_JWKS_URL` | _(empty)_ | Optional — leave blank |
| `CLERK_ISSUER` | _(empty)_ | Optional — leave blank |
| `CLERK_AUDIENCE` | _(empty)_ | Optional — leave blank |

---

## E2E Test Module Structure

The health e2e test does NOT use `AppModule`. It uses a **minimal test module** to avoid bootstrapping Prisma, Redis, and BullMQ:

```text
Test module:
├── ConfigModule.forRoot({
│     load: [appConfig],
│     ignoreEnvFile: true,       ← no .env file required
│     ignoreEnvVars: false,      ← reads process.env
│   })
└── HealthModule                 ← HealthController + ConfigService
```

Environment variables are injected by Jest's test runner from `process.env` — a minimal set of values is set at the top of the spec file using `process.env.NODE_ENV = "test"` and required `APP_CONFIG` fields.

---

## Mocking Strategy Reference

| Layer | Mock Target | How |
|---|---|---|
| Application / Use Cases | Repository interfaces | `jest.fn()` on interface methods |
| Presentation / Controllers | Use cases | `{ provide: UseCase, useValue: mockUseCase }` in `Test.createTestingModule()` |
| Guards | `ClerkAuthGuard` | `{ provide: APP_GUARD, useValue: { canActivate: () => true } }` or `@Public()` endpoint |
| Filters | `GlobalExceptionFilter` | Instantiate directly with `new GlobalExceptionFilter("test")` |
| Infrastructure / Prisma | `PrismaService` | `jest.fn()` on each method; never import real `PrismaClient` in unit tests |
| Config | `ConfigService` | `{ getOrThrow: jest.fn().mockReturnValue({ ... }) } as unknown as ConfigService` |

---

## Scripts After This Feature

| Script | Command | Scope |
|---|---|---|
| `test` | `jest` | Unit tests (`*.spec.ts`) |
| `test:watch` | `jest --watch` | Unit tests, watch mode |
| `test:cov` | `jest --coverage` | Unit tests with coverage |
| `test:e2e` | `jest --config jest-e2e.config.ts` | E2E tests (`*.e2e-spec.ts`) |
| `test:debug` | `node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand` | Debug mode |
