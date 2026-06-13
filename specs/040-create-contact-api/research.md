# Research: Create Renter Contact API

**Feature**: 040-create-contact-api
**Phase**: 0 — Research & Unknown Resolution

---

## 1. Module Naming — `contacts` vs. `tenant-contacts`

**Decision**: Module and route prefix are both `contacts`. The data model entity retains the name `TenantContact`.

**Rationale**: The existing `TenantsModule` handles Clerk organisation sync at `/api/v1/tenants/sync`. Using `contacts` as the route prefix avoids all collision. The entity name `TenantContact` stays in code to clearly distinguish renter contacts from `Tenant` (the Clerk org record) and `User` (the Clerk user record).

**Alternatives considered**: Using `tenant-contacts` as the route — rejected as verbose; `contacts` is the clear industry term for people in a CRM.

---

## 2. Email Uniqueness — Case Sensitivity and Database Strategy

**Decision**: Normalize email to lowercase in the use case before creating; use a standard `@@unique([tenantId, email])` Prisma constraint (case-sensitive at DB level, but inputs are always lowercase).

**Rationale**: PostgreSQL `@@unique` is case-sensitive. Normalizing on write (lowercasing before insert/lookup) is simpler than a partial index or a `citext` column type, requires zero custom migrations, and satisfies the spec requirement for case-insensitive uniqueness.

**Implementation**: `CreateTenantContactUseCase.execute()` calls `input.email.toLowerCase().trim()` before passing to the repository.

**Archived contacts and uniqueness (for US 12.5)**: The current `@@unique([tenantId, email])` prevents creating a contact with the same email as an archived contact (spec FR-013 allows this). US 12.5 (ArchiveTenantContact) will need to migrate to a partial unique index or null the email on archive. This is noted as a known future migration.

**Alternatives considered**: PostgreSQL `citext` column type — requires a Prisma `@db.Citext` extension and database extension setup; more complex. Partial unique index via raw SQL — correct long-term solution but over-engineered for US 12.1 scope; deferred to US 12.5.

---

## 3. Duplicate Email — Check in Use Case vs. DB Constraint Only

**Decision**: Check for duplicate email in the use case first (call `findByEmail`), then rely on the DB constraint as a safety net. Throw `ConflictException` from the use case on duplicate, not from a Prisma error.

**Rationale**: The existing `CreateUnitUseCase` pattern propagates `ConflictException` from the repository when the DB raises a P2002 error. However, checking in the use case first gives a cleaner error message and avoids parsing Prisma error codes in the use case layer. The DB constraint handles the race condition.

**Implementation**:
1. Use case calls `repository.findByEmail(tenantId, email)` (returns null if not found)
2. If a contact is found, throw `new ConflictException('A contact with this email already exists in this workspace.')`
3. If not found, call `repository.create(input)`
4. DB constraint catches any race conditions and the `prisma-error.mapper` maps P2002 → 409 at the filter level

**Alternatives considered**: Only relying on DB constraint — rejected because the P2002 error bubbles up from the infrastructure layer, not the application layer, making unit tests harder.

---

## 4. `TenantContact` Entity Fields and Max Lengths

**Decision**: Fields and constraints as follows (matching spec Assumptions):

| Field       | Required | Max Length | Notes                              |
| ----------- | -------- | ---------- | ---------------------------------- |
| `firstName` | Yes      | 100        |                                    |
| `lastName`  | Yes      | 100        |                                    |
| `email`     | Yes      | 255        | Stored lowercase; valid email format |
| `phone`     | No       | 30         | Free-form; no format enforced      |
| `idNumber`  | No       | 50         | Passport/national ID; no format    |
| `notes`     | No       | 1000       |                                    |

**Rationale**: Lengths match standard CRM conventions and the spec Assumptions section.

---

## 5. Module Dependencies

**Decision**: `ContactsModule` has no imports from other domain modules. It provides `TENANT_CONTACT_REPOSITORY` and exports it for future use (e.g., `LeasesModule` will need to resolve contacts).

**Rationale**: For US 12.1 (create only), there are no cross-module dependencies. Exporting the repository token now makes it available when `LeasesModule` is built in US 13.1.

---

## 6. Prisma Model — Soft-Delete Column

**Decision**: Include `deletedAt DateTime?` in the Prisma schema now, even though archiving is deferred to US 12.5.

**Rationale**: Adding it now avoids a separate schema migration for US 12.5. All read queries in the repository will include `deletedAt: null` filter from day one, consistent with the `Property` and `Unit` patterns.

---

## 7. Route Conflict with Existing TenantsController

**Decision**: `POST /api/v1/tenants/sync` (existing) and `POST /api/v1/contacts` (new) do not conflict — different paths.

**Rationale**: The existing `TenantsController` is under the `tenants` route prefix (`@Controller('tenants')`). The new `ContactsController` uses the `contacts` prefix. No routing collision exists.
