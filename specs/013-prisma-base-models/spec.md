# Feature Specification: Prisma Base Models — User, Tenant, and TenantMembership

**Feature Branch**: `013-prisma-base-models`
**Created**: 2026-05-03
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer Can Generate the Prisma Client with Base Models and the API Builds (Priority: P1)

A developer updates `schema.prisma` with the `User`, `Tenant`, and `TenantMembership` models, runs `prisma:generate`, then `typecheck` and `build` — all succeed. The Prisma client exposes `prisma.user`, `prisma.tenant`, and `prisma.tenantMembership` as typed query APIs.

**Why this priority**: Without a generated client that includes the base models, no repository, service, or future business module can compile. This is the minimum unblocking step for all data-layer work.

**Independent Test**: Run `pnpm --filter api prisma:generate` → exits 0 and emits "Generated Prisma Client". Run `pnpm --filter api typecheck` → exits 0. Run `pnpm --filter api build` → exits 0.

**Acceptance Scenarios**:

1. **Given** `schema.prisma` contains `User`, `Tenant`, and `TenantMembership` models, **When** `prisma:generate` is run, **Then** it exits 0 and the generated client includes typed query builders for all three models.
2. **Given** the Prisma client is generated, **When** `typecheck` runs, **Then** it exits 0 with zero errors.
3. **Given** the Prisma client is generated, **When** `build` runs, **Then** it exits 0.

---

### User Story 2 — Developer Can Validate and Format the Schema Without Errors (Priority: P1)

A developer runs `prisma:validate` and `prisma:format` — both succeed. The schema is syntactically correct, all relations are well-formed, and constraints are properly defined.

**Why this priority**: Schema validity is the pre-condition for running migrations (User Story 3). If the schema is invalid, the migration cannot run.

**Independent Test**: Run `pnpm --filter api prisma:validate` → exits 0 and emits "schema is valid". Run `pnpm --filter api prisma:format` → exits 0 (schema file is already formatted or is reformatted without error).

**Acceptance Scenarios**:

1. **Given** the schema contains `User`, `Tenant`, and `TenantMembership` with all required fields and relations, **When** `prisma validate` is run, **Then** it exits 0.
2. **Given** the schema uses consistent `camelCase` fields with `@map`/`@@map` snake_case column names, **When** `prisma format` is run, **Then** it exits 0 and the schema remains well-formed.
3. **Given** `User.clerkUserId` and `Tenant.clerkOrgId` are marked `@unique`, **When** `prisma validate` runs, **Then** no constraint errors are reported.

---

### User Story 3 — Developer Can Run the Initial Database Migration (Priority: P1)

A developer with Docker running executes the first Prisma migration against the PostgreSQL database. The migration creates the `users`, `tenants`, and `tenant_memberships` tables with all correct columns, constraints, and indexes.

**Why this priority**: Without the database tables, the API cannot store or retrieve any user or tenant data. The migration is the bridge between schema design and runtime use.

**Independent Test**: With Docker running — run `pnpm --filter api prisma:migrate` with migration name `init_base_identity_tenant_models` → exits 0. Connect to PostgreSQL → confirm tables `users`, `tenants`, `tenant_memberships` exist with correct columns.

**Acceptance Scenarios**:

1. **Given** Docker PostgreSQL is running and `DATABASE_URL` is set, **When** `prisma migrate dev --name init_base_identity_tenant_models` is run, **Then** it exits 0 and creates the migration file under `apps/api/prisma/migrations/`.
2. **Given** the migration runs successfully, **When** the `tenants` table is inspected, **Then** it has columns: `id`, `clerk_org_id` (unique), `name`, `created_at`, `updated_at`.
3. **Given** the migration runs successfully, **When** the `tenant_memberships` table is inspected, **Then** it has a unique constraint on `(user_id, tenant_id)` and indexes on `tenant_id` and `user_id`.
4. **Given** the API starts after migration, **When** the health endpoint is called, **Then** it returns `200 OK`.

---

### User Story 4 — Future Tenant-Scoped Model Pattern Is Documented (Priority: P2)

A developer adding a new business module (e.g., `Property`) can refer to a documented pattern showing exactly how to add a tenant-scoped Prisma model with the required `tenantId` field, relation, and index.

**Why this priority**: Consistent tenant-scoping is a security requirement. Without a clear pattern, future developers may omit `tenantId` or its index, introducing data isolation bugs.

**Independent Test**: Read `docs/data-model.md` → find the `FutureTenantScopedModel` pattern with `tenantId`, `tenant Tenant @relation(...)`, and `@@index([tenantId])`. Confirm `docs/tenant-isolation.md` references the field naming convention.

**Acceptance Scenarios**:

1. **Given** `docs/data-model.md` exists, **When** a developer reads it, **Then** they find a documented Prisma model template for tenant-scoped models including `tenantId String @map("tenant_id")`, a `tenant Tenant @relation(...)`, and `@@index([tenantId])`.
2. **Given** the pattern is documented, **When** it is applied to a new model, **Then** the schema remains valid after `prisma validate`.

---

### Edge Cases

- What if a Clerk user is deleted? The `User` record with that `clerkUserId` must be handled by the application on Clerk webhook events — not Prisma schema behaviour. Cascade delete is not automatic from Clerk.
- What if a Clerk organization is deleted? Same as above — the `Tenant` record must be cleaned up via webhook. `TenantMembership` rows cascade delete when `Tenant` is deleted (via `onDelete: Cascade`).
- What if the migration is run against a database that already has the `_placeholder` table from Feature 012? Prisma will DROP the `_placeholder` table as part of the first real migration — this is expected behaviour.
- What if `clerkUserId` is not unique in Clerk? It is guaranteed unique by Clerk — treating it as `@unique` is safe.
- What if a user attempts to join the same tenant twice? The `@@unique([userId, tenantId])` constraint on `TenantMembership` prevents duplicate rows at the database level.
- What if `prisma:format` changes field order? Format is safe to run at any time — it only reformats whitespace/ordering, it does not change schema semantics.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `schema.prisma` MUST include a `User` model with fields: `id` (UUID PK), `clerkUserId` (unique), `email` (optional), `firstName` (optional), `lastName` (optional), `createdAt`, `updatedAt`.
- **FR-002**: `User.clerkUserId` MUST be marked `@unique`.
- **FR-003**: `schema.prisma` MUST include a `Tenant` model with fields: `id` (UUID PK), `clerkOrgId` (unique), `name`, `createdAt`, `updatedAt`.
- **FR-004**: `Tenant.clerkOrgId` MUST be marked `@unique`.
- **FR-005**: `schema.prisma` MUST include a `TenantMembership` model with fields: `id` (UUID PK), `userId`, `tenantId`, `role` (default `"member"`), `createdAt`, `updatedAt`.
- **FR-006**: `TenantMembership` MUST have a `@@unique([userId, tenantId])` constraint.
- **FR-007**: `TenantMembership` MUST have `@@index([tenantId])` and `@@index([userId])`.
- **FR-008**: `TenantMembership` MUST have foreign key relations to `User` (cascade delete) and `Tenant` (cascade delete).
- **FR-009**: All Prisma field names MUST use `camelCase`. Database column names MUST use `snake_case` via `@map`. Table names MUST use `snake_case` via `@@map`.
- **FR-010**: The `Placeholder` model from Feature 012 MUST be removed from `schema.prisma`.
- **FR-011**: `prisma:generate` MUST exit 0 after the schema update (SC-001).
- **FR-012**: `prisma:validate` MUST exit 0 (SC-002).
- **FR-013**: `prisma:migrate` MUST create a migration file named `init_base_identity_tenant_models` (SC-003).
- **FR-014**: `User` MUST NOT have a `tenantId` field — users are global and access tenants through `TenantMembership`.
- **FR-015**: `docs/data-model.md` MUST document all three base models and the future tenant-scoped model pattern (SC-004).

### Key Entities

- **`User`**: Represents an authenticated user mapped to a Clerk user identity. Global record — not tenant-scoped. Can belong to multiple tenants through `TenantMembership`. Fields mirror Clerk user profile data for offline access.
- **`Tenant`**: Represents a property management organisation (landlord/company) mapped to a Clerk organisation. Owns all tenant-scoped business data. Fields mirror Clerk org data for offline access.
- **`TenantMembership`**: Junction table linking a `User` to a `Tenant`. Holds the user's `role` within that tenant. Enforces uniqueness of user-tenant pairs. Enables multi-tenancy lookup patterns.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `pnpm --filter api prisma:generate` exits 0 and the generated client includes `prisma.user`, `prisma.tenant`, `prisma.tenantMembership` — verified by running the command.
- **SC-002**: `pnpm --filter api prisma:validate` exits 0 — verified by running the command.
- **SC-003**: `pnpm --filter api typecheck` exits 0 with zero errors and `pnpm --filter api build` exits 0 — verified by running the commands.
- **SC-004**: `pnpm --filter api prisma:migrate` (with Docker running) creates migration files and exits 0 — verified by running the command.
- **SC-005**: `docs/data-model.md` documents all three base models and the `FutureTenantScopedModel` pattern — verified by reading the file.
- **SC-006**: Zero occurrences of `Placeholder` model in `schema.prisma` after implementation — verified by grep.

---

## Assumptions

- Feature 012 (Prisma ORM Setup) is complete: `@prisma/client` and `prisma` are installed in `apps/api`, `PrismaService` extends `PrismaClient`, and `DatabaseModule` is globally registered.
- The `Placeholder` model in `schema.prisma` (from Feature 012) is replaced in this feature — it is not a real business entity.
- `DATABASE_URL` is configured in `apps/api/.env` pointing at the Docker PostgreSQL instance. No changes to `.env.example` are needed.
- Clerk guarantees `clerkUserId` and `clerkOrgId` uniqueness — treating them as `@unique` database constraints is safe and desirable for lookups.
- `role` in `TenantMembership` stores a string value (e.g., `"member"`, `"admin"`) for future RBAC. No permissions table is created in this feature.
- Full repository implementations (`UserRepository`, `TenantRepository`) are out of scope — they belong to later feature(s). This feature is schema + migration only.
- `email`, `firstName`, `lastName` on `User` are nullable — they may be synced from Clerk later via webhooks. Not all Clerk users have all profile fields populated.
- The migration name `init_base_identity_tenant_models` is used as the standard first migration name. Subsequent migrations are named per their change.
