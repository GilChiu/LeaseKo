# Data Model: Property

**Feature**: 023-property-data-model  
**Phase**: 1 — Design  
**Date**: 2026-05-09  
**Schema file**: `apps/api/prisma/schema.prisma`

---

## Overview

`Property` is the first tenant-scoped business entity in LeaseKo. It represents a physical property managed by a landlord or property management organisation within a tenant workspace. Every property record is owned by exactly one tenant and must never appear in another tenant's result set.

---

## Entity: Property

**Prisma model name**: `Property`  
**PostgreSQL table**: `properties`

### Schema Definition

```prisma
model Property {
  id           String    @id @default(uuid())
  tenantId     String    @map("tenant_id")
  name         String
  addressLine1 String    @map("address_line_1")
  addressLine2 String?   @map("address_line_2")
  city         String
  state        String?
  postalCode   String?   @map("postal_code")
  country      String
  propertyType String    @map("property_type")
  description  String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@map("properties")
}
```

### Field Reference

| Prisma Field | DB Column | Type | Required | Default | Notes |
|---|---|---|---|---|---|
| `id` | `id` | `String` (UUID) | Yes | `uuid()` | Primary key; UUID v4 |
| `tenantId` | `tenant_id` | `String` | Yes | — | FK → `tenants.id`; never from request body |
| `name` | `name` | `String` | Yes | — | Human-readable property name |
| `addressLine1` | `address_line_1` | `String` | Yes | — | Street address line 1 |
| `addressLine2` | `address_line_2` | `String?` | No | `NULL` | Apt, suite, unit — optional |
| `city` | `city` | `String` | Yes | — | City |
| `state` | `state` | `String?` | No | `NULL` | State / province — optional for international addresses |
| `postalCode` | `postal_code` | `String?` | No | `NULL` | Postal / ZIP code — optional for international |
| `country` | `country` | `String` | Yes | — | Country name or ISO code |
| `propertyType` | `property_type` | `String` | Yes | — | Plain string; validated at app layer (e.g., RESIDENTIAL, APARTMENT, COMMERCIAL) |
| `description` | `description` | `String?` | No | `NULL` | Free-form description; optional |
| `createdAt` | `created_at` | `DateTime` | Yes | `now()` | Auto-set on insert |
| `updatedAt` | `updated_at` | `DateTime` | Yes | auto | Auto-set by Prisma on every update |
| `deletedAt` | `deleted_at` | `DateTime?` | No | `NULL` | Soft-delete timestamp; NULL = active record |

### Indexes

| Index | Columns | Purpose |
|---|---|---|
| `@@index([tenantId])` | `tenant_id` | Required by constitution; enables tenant-scoped lookups |
| `@@index([tenantId, deletedAt])` | `tenant_id, deleted_at` | Optimises future queries that filter active records per tenant (`WHERE tenant_id = $1 AND deleted_at IS NULL`) |

### Relation: Property → Tenant

| Aspect | Value |
|---|---|
| Relation type | Many-to-one (many Properties → one Tenant) |
| FK column | `tenant_id` |
| References | `tenants.id` |
| `onDelete` | `Cascade` — deleting a Tenant deletes all owned Properties |

---

## Entity: Tenant (updated)

The existing `Tenant` model gains a reverse relation. No fields are added or changed.

```prisma
model Tenant {
  // ... existing fields unchanged ...
  memberships TenantMembership[]
  properties  Property[]           // ← NEW reverse relation
  @@map("tenants")
}
```

---

## Entity Relationships

```
Tenant (1) ──── (many) Property
```

- One `Tenant` owns zero or more `Property` records
- One `Property` belongs to exactly one `Tenant`
- Cascade: deleting a `Tenant` deletes all its `Property` records

---

## Tenant Isolation Rules

| Rule | Implementation |
|---|---|
| `tenantId` is mandatory | Non-nullable `String` field |
| `tenantId` is never from request input | Resolved from verified JWT → `RequestContext.tenantId` in future repository layer |
| DB enforces ownership | FK constraint on `tenant_id` → `tenants(id)` |
| Queries are always tenant-scoped | Future `PrismaPropertyRepository` MUST use `tenantFilter()` from `tenant-filter.util.ts` |
| Soft-deleted records excluded from normal queries | `@@index([tenantId, deletedAt])` enables efficient `WHERE deleted_at IS NULL` filtering |

---

## Deferred to Future Tasks

| Item | Task |
|---|---|
| Property domain entity (`Property` value object) | US 8.1 — domain layer |
| `IPropertyRepository` interface | US 8.1 — application layer |
| `PrismaPropertyRepository` implementation | US 8.1 — infrastructure layer |
| `CreateProperty` use case + DTO | US 8.1 — application layer |
| `POST /api/v1/properties` endpoint | US 8.1 — presentation layer |
| Soft-delete logic | US 8.5 — application layer |
| `Unit` model (FK → `Property`) | Sprint 2 US 9.1 |

---

## Notes for `PrismaPropertyRepository` (future)

- Must import `tenantFilter()` from `src/common/utils/tenant-filter.util.ts`
- All queries must include `where: { ...tenantFilter(tenantId), ... }`
- Soft-delete list queries must add `deletedAt: null` to the where clause
- `tenantId` must come from `RequestContextService.getTenantId()`, never from request payload
