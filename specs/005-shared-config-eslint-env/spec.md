# Feature Specification: Shared TypeScript, ESLint, and Environment Configuration

**Feature Branch**: `005-shared-config-eslint-env`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Configure shared TypeScript, ESLint, and environment variable standards for the existing pnpm + Turborepo monorepo."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer Runs Lint and Typecheck Across the Monorepo (Priority: P1)

A developer runs `pnpm lint` and `pnpm typecheck` from the repository root and receives a single, unified pass/fail result covering all apps and packages. No per-app configuration duplication is needed — each app inherits from a shared config.

**Why this priority**: Without consistent linting and type checking, code quality degrades as the monorepo grows. This is the first block on all feature development quality gates.

**Independent Test**: A developer clones the repo, runs `pnpm install`, then runs `pnpm lint` and `pnpm typecheck` from the root — both commands exit 0 with output from all apps.

**Acceptance Scenarios**:

1. **Given** the monorepo is cloned and dependencies installed, **When** the developer runs `pnpm lint` from root, **Then** ESLint runs across `apps/web`, `apps/api`, and any `packages/*` and exits 0 with no errors.
2. **Given** the developer introduces a TypeScript type error in `apps/api`, **When** `pnpm typecheck` is run, **Then** the command exits non-zero and reports the file and line of the error.
3. **Given** `apps/web` uses a rule defined in the shared ESLint config, **When** the rule is violated, **Then** `pnpm lint` reports the violation regardless of which app contains it.
4. **Given** neither `apps/web` nor `apps/api` has inline copies of TSConfig rules, **When** the shared base config is modified, **Then** both apps inherit the change automatically.

---

### User Story 2 — Developer Copies `.env.example` and Starts the App Without Errors (Priority: P1)

A developer setting up the project locally copies `.env.example` files for the root, frontend, and backend, fills in the required values, and is able to start both apps without any runtime failures caused by missing environment variables.

**Why this priority**: Missing environment variables cause silent or cryptic startup failures. This story ensures a clear, documented contract for all required configuration.

**Independent Test**: A developer on a fresh machine follows only the `.env.example` files to create their `.env` files, then starts the API — it starts cleanly and the health endpoint responds. The frontend starts and renders without `undefined` for any API URL.

**Acceptance Scenarios**:

1. **Given** the developer has created `apps/api/.env` from `.env.example`, **When** the API starts, **Then** startup succeeds with no validation errors.
2. **Given** the developer removes `DATABASE_URL` from `apps/api/.env`, **When** the API starts, **Then** the process exits immediately with a descriptive error naming `DATABASE_URL` as missing.
3. **Given** the developer has created `apps/web/.env.local` from `.env.example`, **When** the Next.js app starts, **Then** no `undefined` or missing API URL appears in the app.
4. **Given** a developer forgets `NEXT_PUBLIC_API_URL`, **When** the frontend attempts to call the API, **Then** an explicit error is thrown identifying the missing variable, not a silent `undefined` fetch.
5. **Given** `.env` files exist locally, **When** the developer pushes to git, **Then** the `.env` files are ignored and not committed.

---

### User Story 3 — Developer Configures a New Package Without Duplicating Rules (Priority: P2)

A developer adding a new `packages/` library creates a minimal `tsconfig.json` and ESLint config that extend the shared configs with zero duplication of rules.

**Why this priority**: Extensibility of the config system is important but can be deferred until the foundation (US1, US2) is working.

**Independent Test**: A new `packages/utils` directory is created with a single `tsconfig.json` extending the shared base. Running `pnpm typecheck` from root includes `packages/utils` and reports any type errors there.

**Acceptance Scenarios**:

1. **Given** a new `packages/utils` directory with a `tsconfig.json` extending `@leaseKo/tsconfig/base.json`, **When** `pnpm typecheck` runs, **Then** TypeScript checks `packages/utils` as part of the workspace.
2. **Given** the shared base config enforces `"strict": true`, **When** a new package extends it without overriding `strict`, **Then** strict mode is active in that package by default.

---

### Edge Cases

- What happens when an app overrides a shared ESLint rule locally? The local override takes precedence; shared rules serve as defaults.
- What if a `NEXT_PUBLIC_` variable is accidentally used in a backend file? No runtime guard exists for this — code review and naming conventions prevent it.
- What if a required env variable has an empty string value rather than being absent? Validation must treat empty strings as invalid for required variables.
- How does the system handle `.env.local` vs `.env` in Next.js? Next.js `.env.local` takes precedence; `.env.example` documents all variables regardless of which file they live in.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A shared TypeScript base configuration MUST exist in `packages/config/tsconfig/` and be consumable by any workspace package.
- **FR-002**: A Next.js-specific TypeScript config MUST extend the base config and be extended by `apps/web/tsconfig.json`.
- **FR-003**: A NestJS-specific TypeScript config MUST extend the base config and be extended by `apps/api/tsconfig.json`.
- **FR-004**: A shared ESLint base configuration MUST exist and be consumable by all apps and packages.
- **FR-005**: A Next.js-specific ESLint config MUST extend the shared base and be used by `apps/web`.
- **FR-006**: A NestJS-specific ESLint config MUST extend the shared base and be used by `apps/api`.
- **FR-007**: The root `package.json` MUST include `lint`, `typecheck`, `format`, and `format:check` scripts that run across the monorepo.
- **FR-008**: `apps/web` and `apps/api` MUST each include `lint` and `typecheck` scripts in their own `package.json`.
- **FR-009**: A root `.env.example` MUST exist documenting workspace-level variables (if any).
- **FR-010**: `apps/web/.env.example` MUST document `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **FR-011**: `apps/api/.env.example` MUST document all required backend variables: `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `FRONTEND_URL`.
- **FR-012**: `apps/web/src/lib/env.ts` MUST validate `NEXT_PUBLIC_API_URL` at runtime and throw an explicit error if it is missing or empty.
- **FR-013**: `apps/api` startup MUST fail with a descriptive error if any required environment variable is missing or invalid.
- **FR-014**: `.env` files (all variants) MUST be listed in `.gitignore` and never committed.
- **FR-015**: `NEXT_PUBLIC_` prefixed variables MUST NOT contain backend secrets such as `CLERK_SECRET_KEY`, `DATABASE_URL`, or `REDIS_URL`.
- **FR-016**: Turborepo `turbo.json` MUST include `lint` and `typecheck` as pipeline tasks.
- **FR-017**: ESLint MUST enforce no unused variables, no implicit `any`, and no direct `console` usage in production code (with exceptions for backend logging utilities).

### Key Entities

- **Shared TSConfig Package**: A workspace package at `packages/config/tsconfig/` exporting base, Next.js, and NestJS TypeScript configurations.
- **Shared ESLint Package**: A workspace package (same or separate) exporting base, Next.js, and NestJS ESLint configurations.
- **Environment Contract**: The set of documented `.env.example` files defining required and optional variables per app.
- **Env Validation Module**: The runtime/startup code in each app that validates environment variables and fails fast.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm lint` runs from the monorepo root and exits 0 with zero errors on a clean codebase.
- **SC-002**: `pnpm typecheck` runs from the monorepo root and exits 0 with zero type errors on a clean codebase.
- **SC-003**: A new developer can set up their local environment in under 5 minutes by following only the `.env.example` files.
- **SC-004**: Starting the API without a required env variable causes the process to exit within 3 seconds with a clear, human-readable error naming the missing variable.
- **SC-005**: The `apps/web/tsconfig.json` and `apps/api/tsconfig.json` files each contain fewer than 10 lines of non-inherited configuration.
- **SC-006**: 100% of required environment variables are documented in their respective `.env.example` files.
- **SC-007**: Zero `.env` files (excluding `.env.example`) exist in git history.

## Assumptions

- The monorepo already has `pnpm workspaces` and `turborepo` correctly configured from Feature 001.
- `apps/api` already has `@nestjs/config` and `joi` installed (from Feature 004); the env validation setup here will confirm and document that strategy, not replace it.
- `apps/web` already has an `src/lib/env.ts` file from Feature 003; it may need to be updated to cover the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` variable.
- Shared ESLint packages will be consumed using the flat config format (`eslint.config.js`) for Next.js (which uses it natively) and the legacy format for NestJS (`.eslintrc.js`) if needed by the existing NestJS CLI tooling.
- Prettier is managed separately (root-level config); this feature covers only ESLint and TypeScript.
- Clerk auth is not yet implemented; `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` / `CLERK_JWKS_URL` are documented in `.env.example` but their absence does not block startup in development.
- The `turbo.json` already has `build` and `dev` tasks configured; this feature adds `lint` and `typecheck` to the pipeline.
