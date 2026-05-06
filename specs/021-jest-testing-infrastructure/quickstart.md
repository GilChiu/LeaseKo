# Quickstart: Jest Testing Infrastructure

**Feature**: `021-jest-testing-infrastructure`
**Created**: 2026-05-06

---

## Prerequisites

- `pnpm install` completed at repo root
- No Docker required for unit tests
- Docker running (PostgreSQL + Redis) is optional — only needed for future database integration tests, NOT for this feature's tests

---

## Run Unit Tests

```powershell
pnpm --filter @leaseKo/api test
```

Expected: all test suites pass, exit 0.

---

## Run Unit Tests with Coverage

```powershell
pnpm --filter @leaseKo/api test:cov
```

Expected: coverage report generated at `apps/api/coverage/`. Open `apps/api/coverage/lcov-report/index.html` in a browser to view the HTML report. `main.ts`, `*.module.ts`, `*.dto.ts`, and Prisma files are excluded.

---

## Run Unit Tests in Watch Mode

```powershell
pnpm --filter @leaseKo/api test:watch
```

Expected: Jest enters interactive watch mode. Saves to any `*.ts` file trigger a re-run of affected specs.

---

## Run E2E Tests

```powershell
pnpm --filter @leaseKo/api test:e2e
```

Expected: `test/health.e2e-spec.ts` runs, bootstraps a minimal NestJS module (no Prisma, no Redis), calls `GET /api/v1/health`, and asserts `200 OK`.

> No Docker required — the health e2e test uses a minimal module that skips database and queue initialization.

---

## Environment Setup

```powershell
Copy-Item apps/api/.env.test.example apps/api/.env.test
```

Edit `apps/api/.env.test` if running tests against a real test database (integration tests — future feature). For current unit and e2e tests, the default placeholder values are sufficient.

---

## Verify .gitignore Safety

```powershell
git status apps/api/.env.test
```

Expected: `apps/api/.env.test` does NOT appear in `git status` (it is gitignored).

```powershell
git status apps/api/coverage
```

Expected: `apps/api/coverage/` does NOT appear in `git status`.

---

## Run from Root (Turborepo)

```powershell
pnpm test
```

This runs all `test` tasks across the monorepo via Turborepo. The API test task has `cache: false` so it always re-runs.

---

## Notes for Future Test Types

### Auth Guard Unit Test

```typescript
// apps/api/src/modules/auth/presentation/guards/clerk-auth.guard.spec.ts
// Mock: ClerkTokenVerifier, ExecutionContext
// Assert: canActivate() returns true for valid token, throws UnauthorizedException otherwise
```

### Repository Unit Test

```typescript
// apps/api/src/modules/tenants/infrastructure/prisma-tenants.repository.spec.ts
// Mock: PrismaService (jest.fn() on prisma.tenant.findFirst, etc.)
// Assert: repository methods call Prisma with correct tenantId filter
```

### Use Case Unit Test

```typescript
// apps/api/src/modules/users/application/use-cases/get-current-user.use-case.spec.ts
// Already exists — pattern to follow for new use cases
```

### Database Integration Test (Future)

When a dedicated test database is set up:
1. Copy `.env.test.example` → `.env.test`
2. Set `DATABASE_URL` to the test DB connection string
3. Run `pnpm --filter @leaseKo/api prisma:migrate` against the test DB
4. Use a Jest `globalSetup` / `globalTeardown` to truncate tables between test runs
