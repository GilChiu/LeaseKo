# Feature Specification: Centralized Config Management

**Feature Branch**: `017-centralized-config-management`
**Created**: 2026-05-06
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer starts the API with a missing required env var and gets a clear startup error (Priority: P1)

A developer clones the repo and forgets to set `DATABASE_URL` in their `.env`. When they run `pnpm --filter @leaseKo/api start:dev`, the API refuses to start and prints a clear validation error indicating exactly which variable is missing — rather than crashing at runtime with an opaque database connection error.

**Why this priority**: Fast failure at startup is the primary value of centralized config. Without it, missing secrets cause obscure runtime errors that are hard to trace.

**Independent Test**: Remove `DATABASE_URL` from a test `.env` and run the API. Observe that the process exits with a validation error message naming the missing variable before any module initializes.

**Acceptance Scenarios**:

1. **Given** `DATABASE_URL` is absent from the environment, **When** the API starts, **Then** the process exits with a clear error message naming `DATABASE_URL` as missing before any HTTP listener binds.
2. **Given** `PORT` is set to `"abc"` (non-numeric), **When** the API starts, **Then** the process exits with a validation error indicating `PORT` must be a number.
3. **Given** `NODE_ENV` is set to `"staging"` (invalid value), **When** the API starts, **Then** the process exits with a validation error indicating valid values are `development`, `test`, `production`.
4. **Given** all required env vars are present and valid, **When** the API starts, **Then** it starts successfully with no validation warnings.

---

### User Story 2 — Developer adds a new infrastructure module and accesses config via typed injection (Priority: P1)

A developer building the BullMQ queue module needs the Redis URL. Instead of calling `process.env.REDIS_URL` directly, they inject the `redisConfig` typed config factory and receive `{ redisUrl: string }` — fully typed, already validated.

**Why this priority**: Typed config injection is what turns the config module from a bootstrap detail into a reusable architectural pattern. All future modules depend on this.

**Independent Test**: Inspect any infrastructure service that currently uses `ConfigService.getOrThrow()`. Verify the injected value is sourced from a named config factory (e.g., `clerk`, `database`, `redis`) rather than a raw environment key string.

**Acceptance Scenarios**:

1. **Given** a service needs the Redis URL, **When** it injects the config, **Then** it calls `this.config.get<RedisConfig>("redis")` or `this.config.getOrThrow("redis.redisUrl")` — not `process.env.REDIS_URL`.
2. **Given** a service needs the Clerk secret key, **When** it injects the config, **Then** the value comes from the `clerk` namespace — not a raw environment string key.
3. **Given** the config factories are registered in `AppModule`, **When** any module is initialized, **Then** `ConfigService` resolves typed values without accessing `process.env` directly.

---

### User Story 3 — Security reviewer scans the codebase and finds no secrets accessible outside config infrastructure (Priority: P2)

A security reviewer runs a grep for `process.env` across the backend source and finds it appears only in the config factory files and the NestJS bootstrap (`main.ts`). No controller, use case, domain entity, or service has direct environment access.

**Why this priority**: Scattered `process.env` access is a security and maintainability concern — it bypasses validation, makes testing harder, and hides where configuration is consumed.

**Independent Test**: `grep -r "process\.env" apps/api/src --include="*.ts"` returns only matches in `common/config/` and `main.ts`.

**Acceptance Scenarios**:

1. **Given** the full backend source, **When** grepping for `process.env`, **Then** only `common/config/*.ts` and `main.ts` files match.
2. **Given** `ClerkTokenVerifierService`, **When** inspecting its imports and constructor, **Then** it uses `ConfigService.getOrThrow()` — not `process.env.CLERK_SECRET_KEY` directly.
3. **Given** `PrismaService`, **When** inspecting how the database URL is configured, **Then** it relies on `env("DATABASE_URL")` in the Prisma schema (not a hardcoded string), and the runtime validation ensures it is set.

---

### User Story 4 — Developer onboards to the project and knows exactly what env vars to set (Priority: P2)

A new developer reads `apps/api/.env.example` and `docs/backend-architecture.md` (or `docs/development.md`) and can set up their local `.env` without asking any team member for help.

**Why this priority**: Self-service onboarding reduces friction and is measurable — the target is zero questions needed to get the API running locally.

**Independent Test**: Follow only `apps/api/.env.example` and `docs/development.md` to configure and start the API. Measure whether the API starts without additional guidance.

**Acceptance Scenarios**:

1. **Given** `apps/api/.env.example`, **When** a developer copies it to `.env` and fills in the Clerk keys, **Then** the API starts successfully with no missing-variable errors.
2. **Given** the config documentation, **When** a developer reads it, **Then** they find: which variables are required, which are optional, what default values exist, and where to obtain Clerk credentials.
3. **Given** `CLERK_ISSUER` and `CLERK_AUDIENCE` are absent from `.env`, **When** the API starts, **Then** it starts successfully (they are optional with safe defaults).

---

### Edge Cases

- What if `CLERK_JWKS_URL` is absent but `CLERK_SECRET_KEY` is present? → Acceptable — `CLERK_JWKS_URL` is auto-derived by the Clerk SDK from `CLERK_SECRET_KEY`; it is validated as optional with `allow("")`.
- What if `PORT` is absent? → Defaults to `3001` — not a startup failure.
- What if `NODE_ENV` is absent? → Defaults to `development` — not a startup failure.
- What if a config factory throws during registration? → NestJS propagates the error and the process exits with a clear stack trace.
- What if `process.env` is used in a test file? → Permitted — test setup files are not subject to the production config rules.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The `ConfigModule` MUST be registered globally (`isGlobal: true`) in `AppModule` so all modules can inject `ConfigService` without listing `ConfigModule` in their own imports.
- **FR-002**: Environment variables MUST be validated at startup using a Joi schema (already in place) or replaced with Zod — validation errors MUST cause the process to exit before any module initializes.
- **FR-003**: The flat `AppConfig` MUST be split into domain-specific config factories: `appConfig`, `databaseConfig`, `redisConfig`, `clerkConfig` — each in its own file under `common/config/`.
- **FR-004**: Each config factory MUST return a typed object where required values are `string` (not `string | undefined`) and optional values are `string | undefined`.
- **FR-005**: `CLERK_ISSUER` and `CLERK_AUDIENCE` MUST be added as optional variables to the validation schema and the `clerkConfig` factory.
- **FR-006**: `apps/api/.env.example` MUST include all variables: `NODE_ENV`, `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `REDIS_URL`, `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `CLERK_ISSUER`, `CLERK_AUDIENCE`.
- **FR-007**: All config factories MUST be registered in `ConfigModule.forRoot({ load: [...] })` in `AppModule`.
- **FR-008**: `process.env` usage MUST be limited to `common/config/*.ts` files and `main.ts`. All other backend source files MUST use `ConfigService` injection instead.
- **FR-009**: The `.gitignore` (root and/or `apps/api/`) MUST ensure `.env`, `.env.local`, and `.env.*.local` files are never committed.
- **FR-010**: Config documentation MUST exist (in `docs/development.md` or `docs/backend-architecture.md`) covering: variable table, required vs optional, defaults, how to obtain Clerk credentials, and config access patterns.
- **FR-011**: `ClerkTokenVerifierService` MUST access Clerk config via named config namespace (`clerkConfig`) rather than raw `process.env` or unnamespaced `ConfigService.getOrThrow("CLERK_SECRET_KEY")`.
- **FR-012**: The backend MUST continue to build and pass all existing tests after this refactor.

### Key Entities

- **Config Factory**: A NestJS registered factory function (e.g., `registerAs("clerk", () => {...})`) that returns a typed config namespace object.
- **Config Namespace**: A named group of related config values (e.g., `clerk`, `database`, `redis`, `app`) accessible via `ConfigService.get<T>("namespace")`.
- **Validation Schema**: A Joi (or Zod) schema evaluated at startup that fails fast on invalid or missing required variables.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Starting the API with any required variable absent causes the process to exit with a named-variable error in under 3 seconds — before any HTTP listener binds.
- **SC-002**: `grep -r "process\.env" apps/api/src --include="*.ts"` returns zero matches outside `common/config/` and `main.ts`.
- **SC-003**: All four config namespaces (`app`, `database`, `redis`, `clerk`) are resolvable via `ConfigService` and return correctly typed values.
- **SC-004**: A new developer can follow `apps/api/.env.example` + config documentation to get the API running locally without additional guidance — measurable by the absence of required-variable errors after following the example.
- **SC-005**: All existing automated tests continue to pass (100% pass rate) — verified by test runner output.
- **SC-006**: The backend build succeeds (`pnpm --filter @leaseKo/api build` exits 0) after all config changes.
- **SC-007**: `CLERK_ISSUER` and `CLERK_AUDIENCE` being absent from `.env` does not prevent startup (optional vars with safe defaults).

---

## Assumptions

- `ConfigModule` from `@nestjs/config` is already installed and imported in `AppModule` — this feature refines the configuration, not replaces the module.
- Joi is already installed (`joi` package) and used for validation — this feature keeps Joi unless a specific reason to migrate to Zod is identified during planning.
- The existing flat `appConfig` factory in `app.config.ts` will be split into domain-specific factories; all existing behavior is preserved.
- `PrismaService` uses `env("DATABASE_URL")` in the Prisma schema — this feature does not change that; it only validates the value is present at startup.
- `ClerkTokenVerifierService` currently calls `this.config.getOrThrow<string>("CLERK_SECRET_KEY")` — this feature changes it to use the `clerk` namespace: `this.config.getOrThrow<string>("clerk.secretKey")`.
- Test files (`.spec.ts`) may use `process.env` for test setup — this is acceptable and excluded from the grep check.
- The `apps/api/.gitignore` or root `.gitignore` already ignores `.env` files — this feature verifies and documents this.
