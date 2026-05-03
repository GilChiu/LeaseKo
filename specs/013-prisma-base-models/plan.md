# Implementation Plan: Prisma Base Models — User, Tenant, TenantMembership

**Branch**: `013-prisma-base-models` | **Date**: 2026-05-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-prisma-base-models/spec.md`

## Summary

Update `apps/api/prisma/schema.prisma` to replace the `Placeholder` model with three real base models: `User`, `Tenant`, and `TenantMembership`. Run `prisma format`, `prisma validate`, and `prisma generate` to confirm validity. Run the first database migration (`init_base_identity_tenant_models`) against Docker PostgreSQL to create the `users`, `tenants`, and `tenant_memberships` tables. Update `docs/data-model.md` with model documentation and the canonical tenant-scoped model pattern for future features.

## Technical Context

**Language/Version**: TypeScript 5.9.3 / Node.js 20
**Primary Dependencies**: Prisma 5.22.0 (already installed), `@prisma/client` 5.22.0
**Storage**: PostgreSQL (Docker, existing) — `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo`
**Testing**: No new test files — validation by `prisma validate`, `prisma generate`, `typecheck`, `build`, and direct DB inspection
**Target Platform**: Linux server (Docker containerised NestJS)
**Project Type**: Web service — NestJS modular monolith backend
**Performance Goals**: N/A — schema setup only
**Constraints**: No business models. No Prisma in controllers/use cases/domain. `Placeholder` model removed.
**Scale/Scope**: Identity + tenancy foundation — all future module schemas depend on `Tenant`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture
  — No new NestJS module. Schema is persistence-only. `PrismaService` stays in `database/prisma/` layer.
- [x] Domain layer imports no NestJS or Prisma packages
  — No domain layer changes. Repository interfaces (Feature 011) already separate from Prisma.
- [x] Controllers are thin — all logic delegated to use cases
  — No new controllers. `PrismaService` is forbidden in controllers per architecture rule.
- [x] Cross-module interaction uses explicit interfaces or events only
  — Future repository implementations will use `ITenantScopedRepository<T>` from Feature 011.

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column with index
  — EXCEPTION documented: `User`, `Tenant`, and `TenantMembership` are global/identity models.
    `User` is global — multi-tenancy is accessed through `TenantMembership`.
    `Tenant` IS the tenant boundary — it does not scope itself.
    `TenantMembership` has `tenantId` as a FK (not an isolation field) with `@@index([tenantId])`.
    Constitution Principle VI exception applies: global/identity models are explicitly permitted.
    All future business models (`Property`, `Unit`, etc.) MUST have `tenantId + @@index([tenantId])`.
- [x] All repository queries filter by `tenant_id`
  — N/A: No repository implementations in this feature. Pattern documented in `data-model.md`.
- [x] Request context injected via guard before any business logic
  — Already implemented (Features 009-010). Not changed.

**Authentication & Authorization**

- [x] Clerk JWT verified against JWKS
  — Already implemented. Not changed.
- [x] Role/permission checks enforced in backend guards
  — `TenantMembership.role` prepares for RBAC. Full permissions are out of scope.

**Data Layer**

- [x] All DB access goes through repository interfaces
  — No repositories in this feature. Pattern established in Feature 011.
- [x] Prisma schema changes include `tenant_id` index on affected models
  — `TenantMembership` has `@@index([tenantId])`. Global models exception documented.

**API & Async**

- [x] All new endpoints documented with Swagger — N/A: No new endpoints.
- [x] DTOs use class-validator — N/A: No new DTOs.
- [x] Heavy operations offloaded to BullMQ — N/A.
- [x] BullMQ jobs are idempotent — N/A.

**Testing**

- [x] Unit tests cover domain and application logic — N/A: No domain/application logic.
- [x] Integration tests cover repository interactions — N/A: No repositories.
- [x] E2E tests cover API endpoints — N/A: No new endpoints.

**Security**

- [x] No secrets in source code — `schema.prisma` uses `env("DATABASE_URL")`.
- [x] Rate limiting on public endpoints — N/A.
- [x] All inputs validated — `DATABASE_URL` validated by Joi (Feature 012). No new env vars.

## Post-Design Constitution Check

All gates pass. Multi-tenancy exception for global/identity models is explicitly justified and documented per constitution Principle VI. All future tenant-scoped models are bound by the `tenantId + @@index` pattern documented in `data-model.md` and `docs/data-model.md`.

## Project Structure

### Documentation (this feature)

```text
specs/013-prisma-base-models/
├── spec.md         ✓
├── plan.md         ✓ (this file)
├── research.md     ✓
├── data-model.md   ✓
├── quickstart.md   ✓
├── checklists/
│   └── requirements.md  ✓
└── tasks.md        ← /speckit.tasks output
```

### Source Code (this feature)

```text
apps/api/
├── prisma/
│   ├── schema.prisma              ← MODIFIED: remove Placeholder, add User/Tenant/TenantMembership
│   └── migrations/
│       └── <timestamp>_init_base_identity_tenant_models/
│           └── migration.sql      ← CREATED by prisma migrate dev

docs/
└── data-model.md                  ← CREATED: base model docs + future pattern
```

## Implementation Phases

---

### Phase 1 — Update `schema.prisma`

**Goal**: Replace the `Placeholder` model with `User`, `Tenant`, and `TenantMembership`. Add the future tenant-scoped model pattern as a comment.

#### File: `apps/api/prisma/schema.prisma` (full content after this phase)

```prisma
// Prisma schema — LeaseKo backend
// https://www.prisma.io/docs/concepts/components/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE IDENTITY & TENANCY MODELS
//
// These three models are GLOBAL — they do not carry tenantId.
// All tenant-scoped business models (Property, Unit, Lease, etc.) must include:
//   tenantId  String   @map("tenant_id")
//   tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
//   @@index([tenantId])
//
// See: docs/tenant-isolation.md and docs/data-model.md
// ─────────────────────────────────────────────────────────────────────────────

model User {
  id          String   @id @default(uuid())
  clerkUserId String   @unique @map("clerk_user_id")
  email       String?
  firstName   String?  @map("first_name")
  lastName    String?  @map("last_name")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  memberships TenantMembership[]

  @@map("users")
}

model Tenant {
  id         String   @id @default(uuid())
  clerkOrgId String   @unique @map("clerk_org_id")
  name       String
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  memberships TenantMembership[]

  @@map("tenants")
}

model TenantMembership {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tenantId  String   @map("tenant_id")
  role      String   @default("member")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([tenantId])
  @@index([userId])
  @@map("tenant_memberships")
}

// ─────────────────────────────────────────────────────────────────────────────
// FUTURE TENANT-SCOPED MODEL PATTERN
//
// Every tenant-scoped business model MUST follow this pattern exactly:
//
// model Property {
//   id        String   @id @default(uuid())
//   tenantId  String   @map("tenant_id")
//   createdAt DateTime @default(now()) @map("created_at")
//   updatedAt DateTime @updatedAt @map("updated_at")
//
//   tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
//
//   @@index([tenantId])
//   @@map("properties")
// }
//
// Requirements:
//   - tenantId is MANDATORY — no exceptions
//   - @@index([tenantId]) is MANDATORY — for query performance
//   - tenant relation is MANDATORY — for referential integrity
//   - Repositories MUST use tenantFilter() from tenant-filter.util.ts
//   - See: docs/tenant-isolation.md
// ─────────────────────────────────────────────────────────────────────────────
```

**Key facts**:
- `generator` and `datasource` blocks are unchanged from Feature 012
- `Placeholder` model is entirely removed
- All three models use `String @id @default(uuid())` — UUIDs generated at application layer
- All `DateTime` fields use `@map` for snake_case DB columns
- `email`, `firstName`, `lastName` are nullable (`String?`) — Clerk may not provide all fields on creation
- `role` on `TenantMembership` is `String @default("member")` — not an enum, allowing future RBAC extension without migrations

---

### Phase 2 — Format and Validate

**Goal**: Confirm the schema is syntactically valid and consistently formatted before running the migration.

#### Commands

```bash
pnpm --filter api prisma:format
# Expected: schema.prisma reformatted (or already correct) — exit 0

pnpm --filter api prisma:validate
# Expected: "The schema at prisma\schema.prisma is valid" — exit 0
```

**Note**: `prisma format` may reorder fields or adjust whitespace. The content must match the schema above after formatting.

---

### Phase 3 — Generate Prisma Client

**Goal**: Confirm the updated schema generates a valid Prisma client with all three models accessible.

#### Command

```bash
pnpm --filter api prisma:generate
# Expected: "Generated Prisma Client (v5.22.0)" — exit 0
# Expected: client exposes prisma.user, prisma.tenant, prisma.tenantMembership
```

---

### Phase 4 — Typecheck and Build

**Goal**: Confirm the NestJS API still compiles after the schema update.

#### Commands

```bash
pnpm --filter api typecheck
# Expected: exit 0, zero errors

pnpm --filter api build
# Expected: exit 0
```

**Note**: `PrismaService` extends `PrismaClient` — after `prisma:generate`, the generated client now includes `user`, `tenant`, and `tenantMembership` accessors. TypeScript will pick these up automatically.

---

### Phase 5 — Run Initial Migration

**Goal**: Apply the first Prisma migration to the Docker PostgreSQL database. This creates `users`, `tenants`, and `tenant_memberships` tables and drops `_placeholder`.

#### Prerequisites

```bash
pnpm db:up     # start Docker PostgreSQL
pnpm db:ps     # confirm leaseKo_postgres is running and healthy
```

#### Command

```bash
cd apps/api
pnpm prisma:migrate
# When prompted for migration name, enter: init_base_identity_tenant_models
# Expected: migration created and applied — exit 0
```

**What this migration does**:
1. Drops the `_placeholder` table (from Feature 012)
2. Creates `users` table with all columns and indexes
3. Creates `tenants` table with all columns and indexes
4. Creates `tenant_memberships` table with all columns, FK constraints, and indexes

**Migration file location**: `apps/api/prisma/migrations/<timestamp>_init_base_identity_tenant_models/migration.sql`

---

### Phase 6 — Verify Database Tables

**Goal**: Confirm tables, columns, and constraints were created correctly.

#### Via psql

```bash
docker exec -it leaseKo_postgres psql -U postgres -d leaseKo -c "\dt"
# Expected: users, tenants, tenant_memberships (and prisma migration table)

docker exec -it leaseKo_postgres psql -U postgres -d leaseKo -c "\d+ users"
# Expected: id uuid, clerk_user_id varchar (unique), email varchar nullable, etc.

docker exec -it leaseKo_postgres psql -U postgres -d leaseKo -c "\d+ tenant_memberships"
# Expected: unique constraint on (user_id, tenant_id), indexes on tenant_id and user_id
```

#### Via Prisma Studio (optional)

```bash
pnpm --filter api prisma:studio
# Open http://localhost:5555 — confirm three models visible
```

---

### Phase 7 — API Start Verification (optional)

**Goal**: Confirm the NestJS API starts without errors after migration.

#### Command

```bash
pnpm --filter api dev
# Expected log: "PrismaService connected to PostgreSQL"
# Expected: no PrismaClientInitializationError

# Test health endpoint
curl http://localhost:3001/api/v1/health
# Expected: 200 OK
```

---

### Phase 8 — Create `docs/data-model.md`

**Goal**: Document all three base models, the Clerk mapping, and the canonical tenant-scoped model pattern for future developers.

**Content** (see data-model.md artifact): model purpose, field descriptions, Clerk mapping, why `User` is global, why `TenantMembership` exists, future `tenantId` pattern, role strategy.

---

### Phase 9 — BACKLOG Update

**Goal**: Mark US 4.2 tasks as complete in `BACKLOG.md`.

```markdown
- [x] Create User model (clerk_user_id)
- [x] Create Tenant model
- [x] Add tenant_id fields
- [x] Add indexes for tenant_id
```

---

## Naming Convention Summary

| Context | Convention | Example |
|---------|-----------|---------|
| Prisma field (TypeScript) | `camelCase` | `clerkUserId` |
| PostgreSQL column | `snake_case` via `@map` | `clerk_user_id` |
| PostgreSQL table | `snake_case` via `@@map` | `tenant_memberships` |

---

## Index and Constraint Summary

| Model | Constraint | DB |
|-------|-----------|-----|
| `User.clerkUserId` | `@unique` | unique index on `clerk_user_id` |
| `Tenant.clerkOrgId` | `@unique` | unique index on `clerk_org_id` |
| `TenantMembership` | `@@unique([userId, tenantId])` | unique on `(user_id, tenant_id)` |
| `TenantMembership` | `@@index([tenantId])` | index on `tenant_id` |
| `TenantMembership` | `@@index([userId])` | index on `user_id` |

**Not indexed** (YAGNI): `User.email`, `Tenant.name` — add when queries require it.

---

## Global Model Exception

The following models are explicitly exempt from the `tenantId` requirement:

| Model | Reason |
|-------|--------|
| `User` | Maps global Clerk identity. Multi-tenant access via `TenantMembership`. |
| `Tenant` | IS the tenant boundary. Cannot scope itself. |
| `TenantMembership` | Junction table. `tenantId` is a FK reference, not a data isolation field. |

**All future models are tenant-scoped unless explicitly approved and documented here.**

---

## Future Tenant-Scoped Model Pattern

Every business model from Feature 014 onwards MUST include:

```prisma
model ExampleModel {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  // ... domain fields ...
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("example_models")
}
```

Corresponding repository:

```typescript
async findMany(tenantId: string): Promise<ExampleModel[]> {
  return this.prisma.exampleModel.findMany({
    where: tenantFilter(tenantId),
  });
}
```

---

## Validation Checklist

| Check | SC | Method |
|-------|----|--------|
| `User` model in schema | FR-001 | Read schema |
| `User.clerkUserId` is `@unique` | FR-002 | Read schema |
| `Tenant` model in schema | FR-003 | Read schema |
| `Tenant.clerkOrgId` is `@unique` | FR-004 | Read schema |
| `TenantMembership` model in schema | FR-005 | Read schema |
| `TenantMembership.@@unique([userId, tenantId])` | FR-006 | Read schema |
| `TenantMembership.@@index([tenantId])` + `@@index([userId])` | FR-007 | Read schema |
| FK relations with cascade delete | FR-008 | Read schema |
| All fields use `camelCase`; all `@map` use `snake_case` | FR-009 | Read schema |
| `Placeholder` model removed | FR-010 | `grep -r Placeholder schema.prisma` |
| `prisma:generate` exits 0 | SC-001, FR-011 | Run command |
| `prisma:validate` exits 0 | SC-002, FR-012 | Run command |
| `typecheck` exits 0 | SC-003 | Run command |
| `build` exits 0 | SC-003 | Run command |
| Migration runs, tables created | SC-004, FR-013 | Run command + psql |
| `docs/data-model.md` exists | SC-005, FR-015 | Read file |
| Zero `Placeholder` in schema | SC-006 | grep |

---

## Notes for Next Features

### Feature 014 (US 4.3) — Prisma Migrations Workflow

- Migration `init_base_identity_tenant_models` is already the first migration from this feature
- Future migrations: run `prisma migrate dev --name <description>` for each schema change
- Migration files land in `apps/api/prisma/migrations/`

### Feature 015 (US 4.4) — Repository Abstraction

- Create `IUserRepository` interface in `apps/api/src/modules/users/domain/`
- Create `UserPrismaRepository` in `apps/api/src/modules/users/infrastructure/`
- Inject `PrismaService` in repository constructor only — never in controllers or use cases
- Use `prisma.user.findUnique({ where: { clerkUserId } })` for Clerk identity lookups

### Feature 016 (US 5.x) — First Tenant-Scoped Business Model (Property)

- Add `Property` model to `schema.prisma` following the pattern above
- `tenantId String @map("tenant_id")` + `@@index([tenantId])` are MANDATORY
- Create `IPropertyRepository extends ITenantScopedRepository<Property>`
- Use `tenantFilter(tenantId)` in all repository queries
