# Feature Specification: Prisma ORM Installation and Database Connection

**Feature Branch**: `012-prisma-orm-setup`
**Created**: 2026-05-03
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer Can Generate the Prisma Client and the API Builds (Priority: P1)

A developer clones the repo, runs `pnpm install`, then runs `pnpm --filter api prisma:generate` and `pnpm --filter api build` — both succeed. The NestJS API starts without import errors related to Prisma. The `PrismaService` no longer logs "placeholder — no DB connection".

**Why this priority**: Generating the client and building the app is the minimum proof that Prisma is correctly installed and integrated. Without this, no other Prisma work is unblocked.

**Independent Test**: Run `pnpm --filter api prisma:generate` → exits 0 and emits "Generated Prisma Client". Run `pnpm --filter api build` → exits 0. Run `pnpm --filter api typecheck` → exits 0 with zero errors.

**Acceptance Scenarios**:

1. **Given** a fresh clone with `.env` containing a valid `DATABASE_URL`, **When** `prisma:generate` is run, **Then** it succeeds and the Prisma client is generated in `node_modules/.prisma/client`.
2. **Given** the Prisma client is generated, **When** `nest build` is run, **Then** the build succeeds and `PrismaService` compiles without errors.
3. **Given** the built API is started, **When** it initialises, **Then** the `PrismaService` log no longer says "placeholder" — it emits a connection lifecycle message.

---

### User Story 2 — Developer Can Validate the Schema and Verify the Database Connection (Priority: P1)

A developer with Docker running can confirm that `prisma validate` passes and that the NestJS API connects to PostgreSQL on startup without throwing a connection error.

**Why this priority**: Schema validity and live connectivity are the two things that confirm Prisma is correctly wired end-to-end. Without a successful connection, all future migration and repository work is blocked.

**Independent Test**: With Docker running: `pnpm --filter api prisma:validate` → exits 0. Start the API (`pnpm --filter api dev`) → no `PrismaClientInitializationError` in the log, health endpoint returns 200.

**Acceptance Scenarios**:

1. **Given** `apps/api/prisma/schema.prisma` exists with a PostgreSQL datasource and `env("DATABASE_URL")`, **When** `prisma validate` is run, **Then** it exits 0.
2. **Given** Docker PostgreSQL is running and `.env` contains the correct `DATABASE_URL`, **When** the NestJS API starts, **Then** `PrismaService.onModuleInit()` connects without throwing.
3. **Given** the API is running, **When** `GET /api/v1/health` is called, **Then** it returns `200 OK` — confirming the app fully initialised.

---

### User Story 3 — Developer Has Documented Prisma Scripts and a Clear Development Workflow (Priority: P2)

A developer can run all Prisma lifecycle commands (`generate`, `migrate`, `studio`, `format`, `validate`) from the `apps/api` directory using short `pnpm` script aliases, without needing to remember raw `prisma` CLI flags.

**Why this priority**: Without documented scripts, developers have to look up the correct Prisma CLI flags and working directory each time. Standardised aliases in `package.json` reduce friction and ensure consistent invocation across machines.

**Independent Test**: Read `apps/api/package.json` scripts — find `prisma:generate`, `prisma:migrate`, `prisma:studio`, `prisma:format`, `prisma:validate`. Run `pnpm --filter api prisma:validate` → exits 0.

**Acceptance Scenarios**:

1. **Given** `apps/api/package.json`, **When** a developer looks for Prisma scripts, **Then** they find at minimum: `prisma:generate`, `prisma:migrate`, `prisma:studio`, `prisma:format`, `prisma:validate`.
2. **Given** the root `package.json`, **When** a developer looks for database helpers, **Then** they find at minimum `db:generate` and `db:migrate` that delegate to the API workspace.
3. **Given** the project README or `docs/development.md`, **When** a developer follows the setup instructions, **Then** the steps cover: start Docker → configure `.env` → run `prisma:generate` → run `prisma:validate` → start the API.

---

### Edge Cases

- What if `DATABASE_URL` is not set? `PrismaService.$connect()` will throw `PrismaClientInitializationError`. This is acceptable — the app should fail fast on startup with a clear error, not silently continue.
- What if the Docker container is not running when `prisma:migrate` is invoked? Prisma will fail with a connection error. The fix is documented in the workflow: start Docker first.
- What if `prisma generate` is run before `pnpm install`? The `prisma` binary is in `devDependencies` — it will not be found. The workflow documents `pnpm install` as step 1.
- What if the Prisma schema has no models? `prisma validate` still passes. `prisma generate` generates a minimal client. No migration is needed until User Story 4.2 (base models).
- What happens to the existing `PrismaService` placeholder? It is replaced by the real `PrismaClient`-extending implementation in this feature. The `DatabaseModule` (already `@Global()`) continues to export `PrismaService` — no import changes needed in other modules.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `prisma` MUST be installed as a devDependency in `apps/api`.
- **FR-002**: `@prisma/client` MUST be installed as a runtime dependency in `apps/api`.
- **FR-003**: `apps/api/prisma/schema.prisma` MUST exist with a `postgresql` datasource using `env("DATABASE_URL")` and a `prisma-client-js` generator.
- **FR-004**: The `PrismaService` placeholder MUST be replaced with a real implementation: `class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy` — connecting on init, disconnecting on destroy.
- **FR-005**: `DatabaseModule` (already exists) MUST continue to export `PrismaService` globally — no changes to the module class are needed unless the import path changes.
- **FR-006**: `DATABASE_URL` MUST already be present in `apps/api/.env.example` — confirm and update if the example value does not match the Docker Compose service.
- **FR-007**: `apps/api/package.json` MUST include Prisma scripts: `prisma:generate`, `prisma:migrate`, `prisma:studio`, `prisma:format`, `prisma:validate`.
- **FR-008**: The root `package.json` MUST include delegating scripts: `db:generate` and `db:migrate` targeting `@leaseKo/api`.
- **FR-009**: `prisma generate` MUST succeed after installation with the minimal schema (datasource + generator, no models).
- **FR-010**: The NestJS app MUST build successfully (`nest build`) after the `PrismaService` replacement.
- **FR-011**: `PrismaService` MUST NOT be imported in controllers, application use cases, or domain layer files.
- **FR-012**: The schema MUST NOT include any business models (`Property`, `Unit`, `Lease`, `Payment`, `MaintenanceRequest`, `Notification`) — those belong to User Story 4.2.

### Key Entities

- **`PrismaService`**: NestJS injectable service at `apps/api/src/database/prisma/prisma.service.ts`. Extends `PrismaClient`. Connects on `onModuleInit`, disconnects on `onModuleDestroy`.
- **`DatabaseModule`**: Already exists at `apps/api/src/database/prisma/prisma.module.ts`. `@Global()`, provides and exports `PrismaService`. No structural changes needed.
- **`schema.prisma`**: Prisma schema file at `apps/api/prisma/schema.prisma`. Contains datasource + generator only for this feature.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm --filter api prisma:generate` exits 0 and emits "Generated Prisma Client" — verified by running the command.
- **SC-002**: `pnpm --filter api typecheck` exits 0 with zero errors after Prisma client generation — verified by running the command.
- **SC-003**: `pnpm --filter api build` exits 0 — verified by running the command.
- **SC-004**: `pnpm --filter api prisma:validate` exits 0 — verified by running the command.
- **SC-005**: With Docker running, the NestJS API starts without `PrismaClientInitializationError` — verified by checking the startup log.
- **SC-006**: `apps/api/package.json` contains all 5 Prisma scripts (`prisma:generate`, `prisma:migrate`, `prisma:studio`, `prisma:format`, `prisma:validate`) — verified by reading the file.
- **SC-007**: Zero occurrences of `PrismaService` or `PrismaClient` imports in `application/` or `presentation/` or `domain/` layer directories — verified by grep.

---

## Assumptions

- Docker Compose with PostgreSQL is already set up (Feature 006) and the container starts with `docker compose up`.
- `DATABASE_URL` is already present in `apps/api/.env.example` — confirmed above. The connection string format matches the Docker Compose service.
- `apps/api/src/database/prisma/prisma.service.ts` and `prisma.module.ts` already exist as placeholders — this feature replaces the service implementation, not the module structure.
- `DatabaseModule` is already imported in `AppModule` — no `AppModule` changes needed.
- No Prisma schema models are added in this feature — the schema is minimal (datasource + generator). Base models (`User`, `Tenant`, `TenantMembership`) are Feature 013 (User Story 4.2).
- The `prisma` CLI binary will be invoked via `pnpm exec prisma` in scripts (or directly as a `package.json` script value), not via a global install.
- Turbo `build` and `typecheck` pipelines do not need changes — Prisma client generation is a prerequisite that developers run manually or as a `prepare` script.
