# Feature Specification: Prisma Migrations and Database Schema Verification

**Feature Branch**: `014-prisma-migrations`
**Created**: 2026-05-03
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer Runs the Initial Migration and the Database Tables Exist (Priority: P1)

A developer with Docker running executes the first Prisma migration. The command exits 0, a migration file is created under `apps/api/prisma/migrations/`, and the PostgreSQL database contains the `users`, `tenants`, and `tenant_memberships` tables with correct columns, constraints, and indexes.

**Why this priority**: Without the database tables, the API cannot store or retrieve user or tenant data at runtime. The migration is the only step between the Prisma schema (already valid) and a working database. All repository implementations, integration tests, and runtime use depend on it.

**Independent Test**: With Docker running — run `pnpm --filter api prisma:migrate` (name: `init_base_identity_tenant_models`) → exits 0. Run `pnpm db:status` → reports "Database schema is up to date". Inspect tables in Prisma Studio or via psql — confirm all three tables exist.

**Acceptance Scenarios**:

1. **Given** Docker PostgreSQL is running and `DATABASE_URL` is set, **When** `prisma migrate dev --name init_base_identity_tenant_models` is run, **Then** it exits 0 and creates a migration file under `apps/api/prisma/migrations/<timestamp>_init_base_identity_tenant_models/migration.sql`.
2. **Given** the migration runs successfully, **When** `prisma migrate status` is run, **Then** it reports that the database is up to date with no pending migrations.
3. **Given** the migration ran, **When** the `users` table is inspected, **Then** it has: `id` (UUID, PK), `clerk_user_id` (unique), `email` (nullable), `first_name` (nullable), `last_name` (nullable), `created_at`, `updated_at`.
4. **Given** the migration ran, **When** the `tenant_memberships` table is inspected, **Then** it has a unique constraint on `(user_id, tenant_id)` and separate indexes on `tenant_id` and `user_id`.

---

### User Story 2 — Developer Can Check Migration Status and the API Builds (Priority: P1)

A developer can confirm the database schema is in sync with the Prisma schema without re-running migration. The NestJS API builds and starts after migration — the `PrismaService` connects and the health endpoint responds.

**Why this priority**: Without a status command, developers have no way to confirm whether the database is in sync. Without a working API after migration, the feature is not complete.

**Independent Test**: `pnpm --filter api prisma:migrate:status` → exits 0 and emits "Database schema is up to date". `pnpm --filter api build` → exits 0. Start API → no `PrismaClientInitializationError`, `GET /api/v1/health` returns 200.

**Acceptance Scenarios**:

1. **Given** the migration has been applied, **When** `prisma migrate status` is run, **Then** it exits 0 and confirms no pending migrations.
2. **Given** the Prisma client is generated, **When** `build` runs, **Then** it exits 0.
3. **Given** Docker is running and the migration is applied, **When** the NestJS API starts, **Then** `PrismaService` connects without error and the health endpoint returns `200 OK`.

---

### User Story 3 — Developer Can Reset Local Database and Re-run Migration (Priority: P2)

A developer can safely reset the local PostgreSQL database and re-run the migration from scratch — without affecting any other environment. The reset command is clearly documented as local-only with a warning that data will be deleted.

**Why this priority**: Local reset is a common developer workflow (e.g., after a bad migration experiment or when syncing to a clean state). Without documentation and a safe local command, developers may run destructive commands by mistake or in the wrong environment.

**Independent Test**: Run `pnpm db:reset` → Docker volumes removed. Run `pnpm db:up` → container starts fresh. Run `pnpm --filter api prisma:migrate` → migration re-applied. Confirm tables exist again.

**Acceptance Scenarios**:

1. **Given** `pnpm db:reset` is documented with a data-loss warning, **When** a developer reads the docs, **Then** they understand the command drops all data and should only be used locally.
2. **Given** the database has been reset, **When** `pnpm --filter api prisma:migrate` is run, **Then** the migration applies successfully and all tables are recreated.
3. **Given** the migration ran after reset, **When** `prisma migrate status` is run, **Then** it reports the database is up to date.

---

### User Story 4 — Developer Has a Complete Migration Command Reference (Priority: P2)

A developer can find all Prisma migration-related commands documented in one place — how to run migrations, check status, reset, inspect tables, and what naming conventions to follow.

**Why this priority**: Without clear documentation, developers have inconsistent workflows, use wrong commands, or run migrations without understanding the impact. This is especially important for the migration naming convention — vague names like "fix" or "update" make the history unreadable.

**Independent Test**: Read `docs/development.md` (or equivalent) — find all required sections: migration workflow, status command, reset warning, Prisma Studio instructions, naming convention, and anti-patterns.

**Acceptance Scenarios**:

1. **Given** `docs/development.md` exists, **When** a developer reads the migration section, **Then** they find: (a) how to run the first migration, (b) how to check status, (c) naming conventions with examples, (d) reset instructions with data-loss warning.
2. **Given** the docs include a naming convention section, **When** a developer adds a future migration, **Then** they follow the `descriptive_snake_case` pattern (e.g., `add_property_unit_models`).

---

### Edge Cases

- What if migration is run twice? Prisma tracks applied migrations in the `_prisma_migrations` table — re-running an already-applied migration is a no-op.
- What if Docker is not running when migration is attempted? Prisma will fail with a connection error. Fix: `pnpm db:up` first.
- What if `DATABASE_URL` points to a production database? The migration will run against production — dangerous. The `.env` file must be gitignored and developers must not use production credentials locally.
- What if `prisma migrate dev` is run without a migration name? Prisma prompts for one interactively. The spec requires using `init_base_identity_tenant_models` — pass it explicitly to avoid interactive prompt.
- What if `prisma migrate reset` is run? All data in the local database is dropped and migrations are re-applied from scratch. This is documented as a local-only developer tool with a data-loss warning.
- What if the `_placeholder` table already exists from a previous `prisma generate` run (Feature 012)? The first migration will DROP it as part of the schema diff. This is expected and safe.
- What if migration is run in CI without Docker? CI must have a PostgreSQL service configured or use `prisma migrate deploy` (not `dev`) with a test database URL.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `pnpm --filter api prisma:migrate` MUST run `prisma migrate dev` and create the migration file under `apps/api/prisma/migrations/`.
- **FR-002**: The initial migration MUST be named `init_base_identity_tenant_models`.
- **FR-003**: After migration, the PostgreSQL database MUST contain tables: `users`, `tenants`, `tenant_memberships` (and `_prisma_migrations`).
- **FR-004**: `apps/api/package.json` MUST include a `prisma:migrate:status` script running `prisma migrate status`.
- **FR-005**: The root `package.json` MUST include a `db:status` script delegating to `@leaseKo/api prisma:migrate:status`.
- **FR-006**: `prisma migrate status` MUST exit 0 after migration and report no pending migrations.
- **FR-007**: `prisma:generate` MUST succeed after migration.
- **FR-008**: `build` MUST succeed after migration.
- **FR-009**: `docs/development.md` MUST document: migration workflow, status check, naming convention, reset warning, Prisma Studio instructions.
- **FR-010**: `DATABASE_URL` MUST use the local Docker PostgreSQL connection string — never production credentials.
- **FR-011**: The migration SQL file MUST contain: CREATE TABLE for `users`, `tenants`, `tenant_memberships`; unique constraints; indexes.
- **FR-012**: No business models (`Property`, `Unit`, `Lease`, `Payment`) MUST be included in the migration.

### Key Entities

- **Migration file**: `apps/api/prisma/migrations/<timestamp>_init_base_identity_tenant_models/migration.sql` — the tracked schema change artifact.
- **`_prisma_migrations` table**: Prisma-managed table in PostgreSQL tracking which migrations have been applied.
- **`docs/development.md`**: Developer reference for the local data layer workflow.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm --filter api prisma:migrate` exits 0 and creates `apps/api/prisma/migrations/<timestamp>_init_base_identity_tenant_models/migration.sql` — verified by running the command and checking the file.
- **SC-002**: `pnpm --filter api prisma:migrate:status` exits 0 and reports "Database schema is up to date" — verified by running the command after migration.
- **SC-003**: `pnpm --filter api build` exits 0 after migration — verified by running the command.
- **SC-004**: Tables `users`, `tenants`, `tenant_memberships` confirmed in PostgreSQL — verified via psql `\dt` or Prisma Studio.
- **SC-005**: `apps/api/package.json` contains `prisma:migrate:status` script and root `package.json` contains `db:status` — verified by reading the files.
- **SC-006**: `docs/development.md` contains migration workflow, naming convention, and reset warning — verified by reading the file.
- **SC-007**: No business model tables (`properties`, `units`, `leases`, `payments`) exist in the database after migration — verified by psql `\dt`.

---

## Assumptions

- Feature 013 is complete: `User`, `Tenant`, and `TenantMembership` models exist in `apps/api/prisma/schema.prisma` and the Prisma client has been generated.
- Docker Desktop must be running before migration commands are executed. `pnpm db:up` starts the PostgreSQL container.
- `apps/api/.env` contains `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo` — this matches the Docker Compose service.
- `prisma:migrate` script already exists in `apps/api/package.json` (added in Feature 012) running `prisma migrate dev`.
- `prisma:migrate:status` does not yet exist and must be added (it runs `prisma migrate status`).
- `db:status` does not yet exist in root `package.json` and must be added.
- No existing migration files are present — this is the first migration.
- The `_placeholder` table (from Feature 012's Prisma generate workaround) will be dropped by the migration automatically as part of the schema diff.
- `docs/development.md` does not yet exist and must be created.
- Migration is a developer-run command, not automated in CI (CI setup is a future feature).
