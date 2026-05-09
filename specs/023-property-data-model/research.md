# Research: Property Data Model & Prisma Migration

**Phase**: 0 — Pre-design research  
**Feature**: 023-property-data-model  
**Date**: 2026-05-09

---

## Decision 1: `propertyType` — String vs Prisma Enum

**Decision**: Plain `String` field

**Rationale**: The MVP has no agreed-upon canonical list of property types. Using a `String` avoids early Prisma enum migration churn (adding/removing enum values requires `ALTER TYPE` in PostgreSQL, which locks the table). Application-layer validation (via `class-validator`'s `@IsIn([...])`) will constrain the accepted values when the Create Property use case is implemented, without requiring a schema migration when the list changes.

**Alternatives considered**:
- Prisma `enum PropertyType` — rejected for MVP because the enum value list is not finalised and evolving it requires schema migrations
- PostgreSQL `CHECK` constraint — rejected; not natively supported by Prisma enum syntax, requires raw SQL migration

---

## Decision 2: `deletedAt` — Include or Omit

**Decision**: Include `deletedAt DateTime? @map("deleted_at")`

**Rationale**: The Sprint 2 backlog (US 8.5) plans a soft-delete / archive feature. Adding `deletedAt` now avoids a future `ALTER TABLE` migration that would need to handle existing rows. The field is nullable, so existing behaviour is unchanged. The composite index `@@index([tenantId, deletedAt])` enables efficient future queries that filter out soft-deleted records per tenant.

**Alternatives considered**:
- Omit now, add in US 8.5 migration — rejected because schema changes to production tables are riskier than adding a nullable column from the start

---

## Decision 3: Tenant Cascade — `onDelete: Cascade` vs `Restrict`

**Decision**: `onDelete: Cascade`

**Rationale**: The existing `TenantMembership` model uses `onDelete: Cascade` for both its `userId` and `tenantId` foreign keys, establishing the pattern for the project. When a `Tenant` is deleted (e.g., account closure), all owned data (properties, future units, leases) should be deleted atomically. `Restrict` would require manual cleanup and make tenant offboarding more complex.

**Alternatives considered**:
- `onDelete: Restrict` — rejected; requires explicit cascading logic in application code and makes tenant deletion multi-step
- `onDelete: SetNull` — rejected; `tenantId` is non-nullable on `Property`, so this would fail at the DB level

---

## Decision 4: PostgreSQL Connection — Port Resolution

**Decision**: Use local PostgreSQL on port 5432 as primary dev target; Docker on port 5433 when running Docker alongside local PG.

**Rationale**: A local PostgreSQL 18 instance on this Windows machine occupies port 5432. Docker Compose is configured with `${DB_PORT:-5432}`, so starting Docker with `DB_PORT=5433` routes the container to 5433. The `apps/api/.env` currently points to port 5433 (Docker). When Docker is unavailable, override `DATABASE_URL` to use port 5432 for the local instance.

**Confirmed configuration**:
```
# apps/api/.env (current)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/leaseKo

# Override for local PG (when Docker is unavailable):
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/leaseKo"
```

**Alternatives considered**:
- Always use Docker — rejected; Docker Desktop may not be running during CI or on some developer machines
- Always use local PG — rejected; Docker is the standard dev env; both must be supported

---

## Decision 5: Prisma Script — Migration Command

**Decision**: Use `pnpm prisma:migrate -- --name add_property_model` (project script) or `npx prisma migrate dev --name add_property_model` from `apps/api/`

**Rationale**: The project defines `"prisma:migrate": "prisma migrate dev"` in `apps/api/package.json`. To pass the `--name` flag, use `pnpm prisma:migrate -- --name add_property_model` or call `npx prisma migrate dev` directly. Both are equivalent.

**Migration naming convention**: `add_property_model` — lowercase snake_case, descriptive of what is added. Consistent with the existing migration `init_base_identity_tenant_models`.

---

## Decision 6: Schema Naming Convention

**Decision**: camelCase Prisma field names, snake_case PostgreSQL columns via `@map`, snake_case table names via `@@map`

**Rationale**: Already established by the existing schema. All existing models use this pattern:
- `clerkUserId String @unique @map("clerk_user_id")`
- `createdAt DateTime @default(now()) @map("created_at")`
- `@@map("users")`, `@@map("tenants")`, `@@map("tenant_memberships")`

`Property` will follow the same convention: `addressLine1 String @map("address_line_1")`, `@@map("properties")`.

---

## Decision 7: `Tenant.properties` Reverse Relation

**Decision**: Add `properties Property[]` to the `Tenant` model

**Rationale**: Prisma requires the reverse side of a relation to be explicitly declared. Adding `properties Property[]` to `Tenant` allows Prisma to generate the relation accessors and validates the schema. This is a schema-only change with no runtime impact on existing endpoints.

---

## Summary of Resolved Decisions

| Topic | Decision |
|---|---|
| `propertyType` field type | `String` (plain) |
| Soft-delete readiness | `deletedAt DateTime?` — included |
| Tenant FK cascade | `onDelete: Cascade` |
| PostgreSQL connection | Port 5432 (local) or 5433 (Docker) |
| Migration name | `add_property_model` |
| Naming convention | camelCase fields → `@map("snake_case")` → `@@map("table_name")` |
| Tenant reverse relation | `properties Property[]` on `Tenant` |

All NEEDS CLARIFICATION items resolved. Ready for Phase 1 design.
