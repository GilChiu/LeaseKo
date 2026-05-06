# Research: Jest Testing Infrastructure Setup

**Feature**: `021-jest-testing-infrastructure`
**Created**: 2026-05-06

---

## D-001: Jest infrastructure is largely already in place — the gaps are coverage exclusions, e2e scaffolding, .env.test.example, and documentation

**Decision**: Do not reinstall or restructure the existing Jest setup. The existing `jest.config.ts` (unit), package scripts (`test`, `test:watch`, `test:cov`), and all core devDependencies (`jest ^29`, `ts-jest ^29`, `@types/jest ^29`, `@nestjs/testing ^10`) are already present and working — 20 tests pass. Only the identified gaps are addressed:

1. **Coverage exclusions** — `collectCoverageFrom` in `jest.config.ts` currently collects from `**/*.(t|j)s` with no excludes, which includes `main.ts`, generated Prisma files, and DTOs. Add `coveragePathIgnorePatterns`.
2. **E2E scaffolding** — No `test/` directory, no `jest-e2e.config.ts`, no `*.e2e-spec.ts` file exists yet. Create minimal structure.
3. **`supertest`** — Not installed. Required for e2e HTTP assertions.
4. **`.env.test.example`** — Does not exist. Must be created and committed.
5. **`.gitignore` safety** — Root `.gitignore` already ignores `coverage/`. It does NOT ignore `apps/api/.env.test` specifically. Add it.
6. **`docs/testing.md`** — Does not exist. Must be created.
7. **`test:e2e` script** — Not present in `package.json`. Must be added.

**Rationale**: Adding what's missing while preserving the working foundation avoids unnecessary churn and guarantees no regressions.

---

## D-002: Two separate Jest configs — `jest.config.ts` (unit) and `jest-e2e.config.ts` (e2e) — kept independent

**Decision**: Use separate config files rather than a single config with multiple projects. The existing `jest.config.ts` stays as-is (unit tests, `rootDir: "src"`, pattern `.*\\.spec\\.ts$`). A new `jest-e2e.config.ts` at `apps/api/` root will target `test/` directory with `.*\\.e2e-spec\\.ts$`.

**Rationale**: NestJS CLI scaffolds this two-config pattern by default. It prevents e2e tests (which bootstrap the full NestJS app) from running during the fast unit test loop. The `test:e2e` npm script points to the separate config.

**Alternatives considered**: Single config with `projects` array — rejected as more complex and non-standard for NestJS.

---

## D-003: E2E smoke test uses `GET /api/v1/health` — no DB, no Clerk JWT required

**Decision**: The only e2e test created in this feature is `test/health.e2e-spec.ts`. It bootstraps the full NestJS `AppModule`, uses `supertest` to call `GET /api/v1/health`, and asserts `200 OK` with the 5-field response body.

**Rationale**: The health endpoint is `@Public()` (no auth guard) and has zero database or Redis dependencies — confirmed in feature 020. It is the only endpoint in the codebase that can be e2e tested without a running PostgreSQL container or a valid Clerk JWT, making it the ideal e2e smoke test.

**Impact**: The e2e test WILL require a running NestJS app but NOT a real PostgreSQL connection — this is because `AppModule` imports `DatabaseModule`, which connects to Prisma on module initialization. To avoid this, the e2e spec will override `ConfigModule` with test values OR mock `DatabaseModule`. Decision: mock `DatabaseModule` by replacing it with an empty override so the health test runs without Docker.

**Refinement**: On further analysis, `AppModule` bootstraps `ConfigModule` which validates env vars via Joi. The test must either:
  - Provide a `.env.test` with safe values (loaded via `envFilePath: ".env.test"` option)
  - OR build a minimal test module that imports only `HealthModule` + `ConfigModule.forRoot({ load: [...], ignoreEnvFile: true, ignoreEnvVars: false })`

**Final decision**: Use a **minimal test module** (not `AppModule`) in the e2e spec — import only `ConfigModule.forRoot({ load: [appConfig], ignoreEnvFile: true })` and `HealthModule`. This avoids Prisma, Redis, BullMQ, and Clerk initialization entirely while still using the real `HealthController`.

---

## D-004: Coverage exclusions — exclude main.ts, module files, DTOs, Prisma generated files, and test files

**Decision**: Update `jest.config.ts` `collectCoverageFrom` to use an exclusions array:
```
collectCoverageFrom: [
  "**/*.(t|j)s",
  "!main.ts",
  "!**/*.module.ts",
  "!**/*.dto.ts",
  "!**/*.interface.ts",
  "!**/*.d.ts",
  "!**/prisma/**",
  "!**/node_modules/**",
]
```

**Rationale**: Coverage from `main.ts` (bootstrap), module entry files, pure interfaces, and generated Prisma artifacts is misleading noise. DTOs and interface files contain no logic.

---

## D-005: `@/*` path alias already mapped in jest.config.ts — no change needed

**Decision**: `apps/api/tsconfig.json` defines `"paths": { "@/*": ["./src/*"] }` and `jest.config.ts` already has `moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" }`. No changes needed.

**Rationale**: The alias mapping is already correct and the 20 existing tests prove it resolves.

---

## D-006: `.env.test.example` mirrors `.env.example` with test-safe placeholder values

**Decision**: Create `apps/api/.env.test.example` with the same keys as `.env.example` but with test-safe values:
- `NODE_ENV=test`
- `PORT=3002` (avoids conflict with dev server on 3001)
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo_test`
- `REDIS_URL=redis://localhost:6379`
- `CLERK_SECRET_KEY=test_sk_placeholder`
- Optional Clerk fields left blank

**Rationale**: Unit tests never read these values directly (all external dependencies are mocked). The file exists as documentation and for CI configuration. The e2e test uses a minimal module that bypasses env validation, so it also does not depend on `.env.test`.

---

## D-007: `.gitignore` — add `apps/api/.env.test` entry; `coverage/` already covered

**Decision**: Add `apps/api/.env.test` to the root `.gitignore`. The root `.gitignore` already has `coverage/` so `apps/api/coverage/` is covered.

**Rationale**: The existing `!.env.example` pattern in `.gitignore` only exempts `.env.example` — it does not block `.env.test` from being ignored. Adding an explicit entry prevents accidental commits.

---

## Summary of Changes

| File | Action | Reason |
|---|---|---|
| `apps/api/jest.config.ts` | MODIFY — add coverage exclusions | D-004 |
| `apps/api/jest-e2e.config.ts` | CREATE | D-002 |
| `apps/api/test/health.e2e-spec.ts` | CREATE | D-003 |
| `apps/api/package.json` | MODIFY — add `test:e2e` script | D-002 |
| `apps/api/.env.test.example` | CREATE | D-006 |
| `.gitignore` | MODIFY — add `apps/api/.env.test` | D-007 |
| `docs/testing.md` | CREATE | D-001 |
