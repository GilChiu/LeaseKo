# Feature Specification: Jest Testing Infrastructure Setup

**Feature Branch**: `021-jest-testing-infrastructure`
**Created**: 2026-05-06
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer runs unit tests reliably against NestJS modules (Priority: P1)

A backend developer writes a use case, guard, filter, or utility. They run `pnpm --filter @leaseKo/api test` and get a fast, isolated result without needing a real database, real Clerk credentials, or any running Docker container. The test runner finds all `*.spec.ts` files under `src/`, executes them with TypeScript support, and reports pass/fail clearly. Coverage can be collected on demand with `test:cov`.

**Why this priority**: Unit test execution is the foundation of all other testing. Without a reliable, config-correct unit test runner, no auth guard, repository, or controller test can be written. The existing `jest.config.ts` runs correctly today, but coverage exclusions (main.ts, DTOs, generated files) and the final documentation are not yet complete.

**Independent Test**: Run `pnpm --filter @leaseKo/api test` — all existing spec files pass. Run `pnpm --filter @leaseKo/api test:cov` — coverage report is generated excluding main.ts, DTO files, and prisma-generated files.

**Acceptance Scenarios**:

1. **Given** the developer is in the repo root, **When** they run `pnpm --filter @leaseKo/api test`, **Then** all existing unit test suites pass and the command exits 0.
2. **Given** a new `*.spec.ts` file is added under `apps/api/src/`, **When** `pnpm --filter @leaseKo/api test` is run, **Then** it is automatically discovered and executed.
3. **Given** the developer runs `pnpm --filter @leaseKo/api test:cov`, **Then** a coverage report is generated in `apps/api/coverage/` that excludes `main.ts`, DTOs, Prisma-generated files, and module entry files.
4. **Given** the developer runs `pnpm --filter @leaseKo/api test:watch`, **Then** Jest re-runs affected tests on file save without requiring a full restart.
5. **Given** a unit test uses `jest.fn()` to mock a repository or `ConfigService`, **Then** the test runs without importing or instantiating a real Prisma client or making any external network call.

---

### User Story 2 — Developer configures a safe test environment without production secrets (Priority: P2)

A developer clones the repository and wants to run tests in CI or a new machine. They copy `apps/api/.env.test.example` to `apps/api/.env.test`, substitute any local values, and run the tests. The test environment uses safe placeholder values — `DATABASE_URL` points to a local test database, `CLERK_SECRET_KEY` is a non-production placeholder — so no real production service is contacted during unit tests. The `.env.test` file is gitignored so secrets cannot be accidentally committed.

**Why this priority**: Without a committed `.env.test.example`, developers cannot reproduce the test environment. Without gitignore safety, a real secret could be committed accidentally. This story closes the environment configuration gap.

**Independent Test**: Confirm `apps/api/.env.test.example` exists in the repository. Confirm `apps/api/.env.test` is listed in `.gitignore`. Confirm `git status` does not show `.env.test` as a tracked file.

**Acceptance Scenarios**:

1. **Given** the repository is freshly cloned, **When** the developer checks `apps/api/`, **Then** `.env.test.example` exists and contains all required environment variable keys with safe placeholder values.
2. **Given** `.env.test` is present locally, **When** `git status` is run, **Then** `.env.test` does not appear as a tracked or staged file.
3. **Given** the test environment variables include `NODE_ENV=test`, **When** unit tests run, **Then** no test accesses `CLERK_SECRET_KEY` or `DATABASE_URL` directly — only mocked dependencies are used.
4. **Given** the coverage output directory `apps/api/coverage/` is generated, **When** `git status` is run, **Then** the coverage directory is not tracked.

---

### User Story 3 — Developer has a minimal e2e test structure ready for future API tests (Priority: P3)

A developer wants to write an end-to-end test for `GET /api/v1/health` using `supertest`. The project already has a `test/` directory convention and a `jest-e2e.config.ts`. They add `supertest` and `@types/supertest`, run `pnpm --filter @leaseKo/api test:e2e`, and see the e2e suite execute. For now, only the health endpoint is tested — more endpoint tests will be added in future features.

**Why this priority**: E2E test scaffolding enables integration-level verification once the NestJS app can be bootstrapped in tests. It is P3 because unit tests are more valuable today, and e2e setup has more moving parts. However, establishing the convention now prevents ad-hoc e2e directories proliferating later.

**Independent Test**: Run `pnpm --filter @leaseKo/api test:e2e` — the e2e suite runs (at minimum, the health endpoint test passes). `supertest` resolves without `MODULE_NOT_FOUND` errors.

**Acceptance Scenarios**:

1. **Given** `supertest` and `@types/supertest` are installed, **When** a test imports `supertest`, **Then** TypeScript resolves the types without errors.
2. **Given** `jest-e2e.config.ts` exists at `apps/api/`, **When** `pnpm --filter @leaseKo/api test:e2e` is run, **Then** Jest uses the e2e config and discovers `**/*.e2e-spec.ts` files.
3. **Given** an e2e test bootstraps the NestJS app and calls `GET /api/v1/health`, **When** the test runs, **Then** the response is `200 OK` with a JSON body containing `status: "ok"`.
4. **Given** the e2e suite runs, **Then** it does not require a real Clerk JWT — the `@Public()` decorator on `/health` allows unauthenticated access.

---

### Edge Cases

- What if `NODE_ENV` is not set to `test` when running tests? → The Jest config sets `testEnvironment: "node"` but does not force `NODE_ENV`. The `.env.test.example` documents `NODE_ENV=test` and jest should set it via `process.env.NODE_ENV` override or the test setup.
- What if coverage is collected from prisma-generated files? → Coverage exclusions must be updated to exclude `**/*.d.ts`, `prisma/**`, `**/node_modules/**`, and `main.ts` to avoid misleading metrics.
- What if the e2e test requires a real PostgreSQL connection? → The health endpoint (`@Public()`, no DB calls) is explicitly chosen as the e2e smoke test because it has zero infrastructure dependencies.
- What if `test:e2e` is run before `supertest` is installed? → The `package.json` script will fail with a clear install error. The fix is documented in the quickstart.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `pnpm --filter @leaseKo/api test` MUST execute all `*.spec.ts` files under `apps/api/src/` and exit 0 when all tests pass.
- **FR-002**: `pnpm --filter @leaseKo/api test:cov` MUST generate a coverage report at `apps/api/coverage/` excluding `main.ts`, `*.module.ts`, `**/*.dto.ts`, `prisma/**`, and `**/*.d.ts`.
- **FR-003**: `pnpm --filter @leaseKo/api test:watch` MUST start Jest in interactive watch mode.
- **FR-004**: `pnpm --filter @leaseKo/api test:e2e` MUST execute all `*.e2e-spec.ts` files using a separate Jest e2e configuration.
- **FR-005**: `apps/api/.env.test.example` MUST exist and contain all environment variable keys required by the test suite, with safe non-production placeholder values.
- **FR-006**: `apps/api/.env.test` MUST be listed in `.gitignore` (or the root `.gitignore`) and MUST NOT be committed to the repository.
- **FR-007**: `apps/api/coverage/` output MUST be listed in `.gitignore` and MUST NOT be committed.
- **FR-008**: `supertest` and `@types/supertest` MUST be installed as devDependencies in `apps/api/` to support e2e HTTP assertions.
- **FR-009**: A minimal e2e smoke test for `GET /api/v1/health` MUST exist at `apps/api/test/health.e2e-spec.ts` and MUST pass without a real database or Clerk credentials.
- **FR-010**: Testing conventions (file naming, mocking strategy, unit vs e2e distinction) MUST be documented in `docs/testing.md`.
- **FR-011**: The `turbo.json` `test` task MUST remain configured with `cache: false` to ensure tests always re-run.

### Key Entities

- **Unit Test**: A `*.spec.ts` file colocated with its source file under `apps/api/src/`. Runs without external services. Uses `jest.fn()` for all dependencies.
- **E2E Test**: A `*.e2e-spec.ts` file under `apps/api/test/`. Bootstraps the full NestJS application with `@nestjs/testing`. Uses `supertest` for HTTP assertions. Only tests endpoints with no infrastructure dependencies (e.g., `/health`) until a test database is wired.
- **Test Environment**: The combination of `jest.config.ts` (unit), `jest-e2e.config.ts` (e2e), and `.env.test` (env vars) that produces a reproducible, isolated test execution context.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm --filter @leaseKo/api test` runs all existing 20 unit tests and exits 0 — no regressions introduced.
- **SC-002**: `pnpm --filter @leaseKo/api test:cov` produces a coverage report with no coverage data from `main.ts`, Prisma-generated files, or `.d.ts` files.
- **SC-003**: `pnpm --filter @leaseKo/api test:e2e` runs and the health endpoint e2e test passes — 0 failures, no `MODULE_NOT_FOUND` errors.
- **SC-004**: `apps/api/.env.test.example` is present and `git status` confirms `.env.test` and `coverage/` are not tracked.
- **SC-005**: `docs/testing.md` exists and documents at minimum: how to run unit tests, how to run e2e tests, file naming conventions, mocking strategy, and environment setup.
- **SC-006**: `pnpm --filter @leaseKo/api build` continues to exit 0 — no regression to the build pipeline.

---

## Assumptions

- Jest, ts-jest, `@types/jest`, and `@nestjs/testing` are already installed in `apps/api/` — confirmed by the existing `jest.config.ts` and passing tests. This feature does not reinstall them.
- `turbo.json` already has a `test` task with `cache: false` — confirmed. No changes to turbo.json are needed.
- The existing `jest.config.ts` (unit tests) is correct and passing — the changes needed are limited to coverage exclusions.
- E2E tests that require a real database or Clerk JWT are explicitly out of scope. Only infrastructure-dependency-free endpoints are e2e tested in this feature.
- The root `.gitignore` or `apps/api/.gitignore` will be updated to cover `coverage/` and `.env.test` — the exact file location is determined during implementation based on which gitignore is closest to `apps/api/`.
- `pnpm --filter @leaseKo/api` is the correct command prefix — confirmed by prior features.
- `docs/testing.md` is a new file — `docs/development.md` and `docs/api-errors.md` already exist, so a separate `testing.md` keeps concerns separated.
