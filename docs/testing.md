# Testing Guide

**Project**: LeaseKo API (`apps/api`)
**Test runner**: Jest 29 + ts-jest
**Framework**: NestJS 10

---

## Running Tests

### Unit Tests

```powershell
pnpm --filter @leaseKo/api test
```

### Unit Tests — Watch Mode

```powershell
pnpm --filter @leaseKo/api test:watch
```

### Unit Tests — Coverage Report

```powershell
pnpm --filter @leaseKo/api test:cov
```

Coverage is written to `apps/api/coverage/`. Open `coverage/lcov-report/index.html` to view the HTML report.

### E2E Tests

```powershell
pnpm --filter @leaseKo/api test:e2e
```

E2E tests run against a minimal NestJS app bootstrapped in-process. No Docker is required for the current e2e suite.

### All Tests from Repo Root

```powershell
pnpm test
```

Turborepo runs the `test` task across all workspace packages. The API test task has `cache: false` and always re-runs.

---

## Test File Naming Conventions

| Test type | File pattern | Location |
|---|---|---|
| Unit test | `*.spec.ts` | Colocated with the file under test in `src/` |
| E2E test | `*.e2e-spec.ts` | `apps/api/test/` directory |

**Examples**:

```
src/modules/health/presentation/health.controller.ts
src/modules/health/health.controller.spec.ts   ← unit test

test/health.e2e-spec.ts                        ← e2e test
```

---

## Unit vs E2E Distinction

| | Unit test | E2E test |
|---|---|---|
| Bootstraps NestJS | No — instantiates classes directly or with `Test.createTestingModule()` | Yes — full or minimal NestJS app via `@nestjs/testing` |
| Requires Docker | Never | Not for current suite (health endpoint only); future DB tests will |
| Requires real Clerk JWT | Never | Not for `@Public()` endpoints |
| Requires real Prisma | Never | Not for current suite |
| Speed | Fast (< 1s per file) | Slower (app bootstrap overhead) |

---

## Mocking Strategy

### ConfigService

```typescript
const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue({ nodeEnv: "test" }),
} as unknown as ConfigService;
```

### Prisma Repositories

Mock the repository interface, not `PrismaService` directly:

```typescript
const mockTenantsRepo: jest.Mocked<ITenantsRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
```

### Clerk Auth Guard (unit tests for protected endpoints)

```typescript
// Option A — use @Public() on the endpoint under test
// Option B — override the guard in the test module
{
  provide: APP_GUARD,
  useValue: { canActivate: () => true },
}
```

### External Services (Redis, BullMQ)

Mock at the service interface level via `jest.fn()`. Never import real ioredis or BullMQ workers in unit tests.

---

## Architecture Boundary Rules

| Layer | What to mock | NestJS bootstrap needed? |
|---|---|---|
| Domain | Nothing — pure logic | No |
| Application (use cases) | Repository interfaces via `jest.fn()` | No |
| Presentation (controllers) | Use cases via `Test.createTestingModule()` | Optional |
| Presentation (guards) | `ExecutionContext`, token verifier | No |
| Presentation (filters) | `ArgumentsHost`, `HttpException` | No |
| Infrastructure (repos) | `PrismaService` methods via `jest.fn()` | No |

**Rule**: Never import a real `PrismaClient` or call `new PrismaClient()` in a unit test file.

---

## Test Environment Setup

1. Copy the example file:
   ```powershell
   Copy-Item apps/api/.env.test.example apps/api/.env.test
   ```

2. Edit `apps/api/.env.test` if you need to point at a real local test database (required for future integration tests — not needed for current unit + e2e suite).

3. `apps/api/.env.test` is gitignored — never commit it.

> Current unit and e2e tests do **not** read `.env.test` at runtime. Unit tests mock all dependencies; the health e2e test injects env vars directly in the test module setup.

---

## Coverage Configuration

Coverage is collected from all `*.ts` files under `apps/api/src/`, excluding:

- `main.ts` — bootstrap entry point
- `**/*.module.ts` — module wiring files
- `**/*.dto.ts` — data transfer objects (no logic)
- `**/*.interface.ts` — TypeScript interfaces (no logic)
- `**/*.d.ts` — type declaration files
- `**/prisma/**` — Prisma-generated files

Coverage output: `apps/api/coverage/` (gitignored — never commit).

---

## Future Test Types

### Auth Guard Unit Tests

```
src/modules/auth/presentation/guards/clerk-auth.guard.spec.ts
```

Mock `ExecutionContext` and the Clerk token verifier. Assert `canActivate()` returns `true` for a valid decoded token and throws `UnauthorizedException` otherwise.

### Tenant Context Unit Tests

```
src/modules/tenant-context/presentation/tenant-context.guard.spec.ts
```

Mock the request object with and without `tenantId`. Assert `ForbiddenException` is thrown when `tenantId` is absent.

### Repository Unit Tests

```
src/modules/tenants/infrastructure/prisma-tenants.repository.spec.ts
```

Mock `PrismaService` method calls. Assert all queries include `tenantId` in the `where` clause.

### Database Integration Tests (Future)

When a dedicated test database is needed:

1. Create a `leaseKo_test` PostgreSQL database
2. Set `DATABASE_URL` in `apps/api/.env.test` to the test DB
3. Run `pnpm --filter @leaseKo/api prisma:migrate` against test DB
4. Add `jest-integration.config.ts` targeting `*.integration-spec.ts`
5. Use `globalSetup`/`globalTeardown` to clean up between runs

---

## ⚠️ Security Rules

- Never use production `CLERK_SECRET_KEY` in tests
- Never use production `DATABASE_URL` in tests
- Never commit `apps/api/.env.test`
- Never commit `apps/api/coverage/`
- All `.env.test.example` values must be safe placeholders
