# Data Model: Prisma Base Models — User, Tenant, TenantMembership

**Feature**: 013-prisma-base-models
**Date**: 2026-05-03
**File**: `apps/api/prisma/schema.prisma`

---

## Complete schema.prisma After This Feature

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

---

## Entity Summary

### User

| Field | Type | Constraints | DB Column |
|-------|------|-------------|-----------|
| `id` | `String` | `@id @default(uuid())` | `id` |
| `clerkUserId` | `String` | `@unique` | `clerk_user_id` |
| `email` | `String?` | optional | `email` |
| `firstName` | `String?` | optional | `first_name` |
| `lastName` | `String?` | optional | `last_name` |
| `createdAt` | `DateTime` | `@default(now())` | `created_at` |
| `updatedAt` | `DateTime` | `@updatedAt` | `updated_at` |

**Table**: `users`
**Relations**: `memberships TenantMembership[]`
**Global model** — no `tenantId`. Access via `TenantMembership`.

---

### Tenant

| Field | Type | Constraints | DB Column |
|-------|------|-------------|-----------|
| `id` | `String` | `@id @default(uuid())` | `id` |
| `clerkOrgId` | `String` | `@unique` | `clerk_org_id` |
| `name` | `String` | required | `name` |
| `createdAt` | `DateTime` | `@default(now())` | `created_at` |
| `updatedAt` | `DateTime` | `@updatedAt` | `updated_at` |

**Table**: `tenants`
**Relations**: `memberships TenantMembership[]`
**Global model** — identifies the property management organisation.

---

### TenantMembership

| Field | Type | Constraints | DB Column |
|-------|------|-------------|-----------|
| `id` | `String` | `@id @default(uuid())` | `id` |
| `userId` | `String` | FK → `users.id` | `user_id` |
| `tenantId` | `String` | FK → `tenants.id` | `tenant_id` |
| `role` | `String` | `@default("member")` | `role` |
| `createdAt` | `DateTime` | `@default(now())` | `created_at` |
| `updatedAt` | `DateTime` | `@updatedAt` | `updated_at` |

**Table**: `tenant_memberships`
**Constraints**: `@@unique([userId, tenantId])`
**Indexes**: `@@index([tenantId])`, `@@index([userId])`
**Cascade**: both FK relations use `onDelete: Cascade`

---

## Naming Convention

| Context | Convention | Example |
|---------|-----------|---------|
| Prisma field (TS) | `camelCase` | `clerkUserId` |
| PostgreSQL column | `snake_case` via `@map` | `clerk_user_id` |
| PostgreSQL table | `snake_case` via `@@map` | `tenant_memberships` |

---

## Index and Constraint Summary

| Model | Constraint/Index | Purpose |
|-------|-----------------|---------|
| `User` | `@unique` on `clerkUserId` | Clerk identity lookup; implicit index |
| `Tenant` | `@unique` on `clerkOrgId` | Clerk org lookup; implicit index |
| `TenantMembership` | `@@unique([userId, tenantId])` | Prevent duplicate memberships |
| `TenantMembership` | `@@index([tenantId])` | Fast lookup by tenant |
| `TenantMembership` | `@@index([userId])` | Fast lookup by user |

---

## Removed

The `Placeholder` model (from Feature 012) is removed in the same schema edit that adds these models.
The corresponding `_placeholder` table will be dropped by the migration.

---

## Files Modified

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Remove `Placeholder`, add `User`, `Tenant`, `TenantMembership` |

## Files Created / Updated by This Feature

| File | Change |
|------|--------|
| `apps/api/prisma/migrations/*` | Created by `prisma migrate dev` |
| `docs/data-model.md` | Updated with base model documentation |
