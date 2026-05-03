# Research: Prisma Base Models — User, Tenant, TenantMembership

**Feature**: 013-prisma-base-models
**Date**: 2026-05-03

---

## Decision 1: UUID vs CUID vs Auto-increment for Primary Keys

**Decision**: Use `String @id @default(uuid())` for all three base models.

**Rationale**:
- UUIDs are non-sequential, making ID enumeration attacks harder
- Prisma 5 generates UUIDs at the application layer (no DB extension required)
- Consistent with PostgreSQL best practices for distributed/multi-tenant systems
- Auto-increment integers expose table size and enable ID enumeration
- CUIDs are a valid alternative but UUIDs are more universally portable

**Alternatives considered**:
- `Int @id @default(autoincrement())` — rejected: enumerable, not distribution-safe
- `@default(cuid())` — acceptable, but UUIDs are more familiar in the ecosystem

---

## Decision 2: Naming Convention — camelCase Fields + snake_case DB Columns

**Decision**: Prisma fields use `camelCase`. PostgreSQL columns use `snake_case` via `@map`. Table names use `snake_case` via `@@map`.

**Rationale**:
- TypeScript/Prisma client usage is idiomatic camelCase (e.g., `user.clerkUserId`)
- PostgreSQL convention is snake_case (e.g., `clerk_user_id`)
- `@map` / `@@map` bridges both without forcing one convention on the other
- Consistent with the existing `tenant_id` naming established in `tenant-filter.util.ts` (Feature 011)

**Applied consistently**:
- `clerkUserId` → `@map("clerk_user_id")`
- `clerkOrgId` → `@map("clerk_org_id")`
- `tenantId` → `@map("tenant_id")`
- `firstName` → `@map("first_name")`
- `lastName` → `@map("last_name")`
- `createdAt` → `@map("created_at")`
- `updatedAt` → `@map("updated_at")`
- Table `User` → `@@map("users")`
- Table `Tenant` → `@@map("tenants")`
- Table `TenantMembership` → `@@map("tenant_memberships")`

---

## Decision 3: User Model — Global, Not Tenant-Scoped

**Decision**: `User` has no `tenantId` field. Access to tenants is through `TenantMembership`.

**Rationale**:
- A user may belong to multiple tenants (e.g., a contractor working for two landlords)
- Making `User` tenant-scoped would force duplication of user records per tenant
- Clerk models users as global identities and organisations as separate entities — our schema mirrors this
- The `TenantMembership` junction table is the correct place for user-tenant access

**Anti-pattern avoided**: Using `tenantId` on `User` directly would break the multi-tenant model and conflict with constitution Principle VI.

---

## Decision 4: TenantMembership Role Strategy

**Decision**: `role String @default("member")` — stored as a plain string in the backend database.

**Rationale**:
- Constitution Principle V requires backend to own authorization (not Clerk)
- Starting with a string (not an enum) allows easy extension to RBAC without a migration
- Values like `"member"`, `"admin"`, `"owner"` can be enforced in application-layer guards
- A Prisma `enum` would require a new migration every time a role is added

**Alternatives considered**:
- Prisma `enum Role { MEMBER ADMIN OWNER }` — rejected: requires migration for every new role; premature constraint
- Storing only in Clerk — rejected: violates constitution Principle V (backend owns authorization)

---

## Decision 5: Cascade Delete Strategy

**Decision**: `TenantMembership → User` uses `onDelete: Cascade`. `TenantMembership → Tenant` uses `onDelete: Cascade`.

**Rationale**:
- When a `User` is deleted (Clerk account removed), their membership rows should be automatically cleaned up
- When a `Tenant` is deleted (organisation removed), all memberships for that tenant should be removed
- This prevents orphaned `TenantMembership` rows which could cause authorization confusion

**Note**: `User` deletion and `Tenant` deletion are triggered by Clerk webhook events — the cascade at the DB level is a safety net.

---

## Decision 6: Placeholder Model Removal Strategy

**Decision**: Remove the `Placeholder` model from `schema.prisma` in the same edit that adds `User`, `Tenant`, `TenantMembership`.

**Rationale**:
- The `Placeholder` was an infrastructure hack needed for `prisma generate` in Feature 012 (Prisma 5 requires ≥1 model)
- Once real models exist, `Placeholder` has no purpose
- The migration will DROP the `_placeholder` table and CREATE the three base tables — this is one coherent first migration
- Leaving `Placeholder` alongside real models would create a spurious table

---

## Decision 7: Optional Fields on User

**Decision**: `email`, `firstName`, `lastName` are nullable (`String?`).

**Rationale**:
- Clerk does not guarantee all profile fields are populated on account creation
- Email may not be available if Clerk uses phone-number auth
- These fields will be populated via Clerk webhook sync (future feature)
- Making them required would block user record creation until all fields are available

---

## Decision 8: Do Not Index email or Tenant.name at This Stage

**Decision**: No index on `User.email` or `Tenant.name` in this feature.

**Rationale**:
- No query exists yet that searches users by email or tenants by name
- Premature indexes add write overhead and maintenance cost
- Add indexes when specific queries are introduced (YAGNI)
- `User.clerkUserId @unique` implicitly creates an index — sufficient for Clerk identity lookups

---

## Decision 9: Migration Name

**Decision**: Migration name = `init_base_identity_tenant_models`

**Rationale**:
- Descriptive, follows the project convention of underscore-separated identifiers
- Communicates that this is the first real migration and what it initialises
- The migration will: DROP `_placeholder`, CREATE `users`, CREATE `tenants`, CREATE `tenant_memberships`
