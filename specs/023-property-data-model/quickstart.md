# Quickstart: Property Data Model Implementation

**Feature**: 023-property-data-model  
**Branch**: `feature/property-data-model`  
**Date**: 2026-05-09

---

## Prerequisites

- Node.js 18+ and pnpm installed
- PostgreSQL running locally (port 5432) **or** Docker available
- `apps/api/.env` configured with the correct `DATABASE_URL`

---

## Step 1 — Ensure the feature branch is active

```bash
cd C:\Users\Zared\Projects\LeaseKo
git checkout feature/property-data-model
```

---

## Step 2 — Start PostgreSQL

**Option A — Docker (recommended)**

```bash
# From repo root
$env:DB_PORT="5433"
docker compose -f infra/docker-compose.yml up -d postgres

# Update apps/api/.env:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/leaseKo
```

**Option B — Local PostgreSQL (when Docker is unavailable)**

```bash
# Override DATABASE_URL inline for this session:
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/leaseKo"
# (apps/api/.env points to 5433 by default; override at shell level when using local PG)
```

---

## Step 3 — Update `schema.prisma`

File: `apps/api/prisma/schema.prisma`

### 3a. Add `properties` reverse relation to the `Tenant` model

```prisma
model Tenant {
  // existing fields ...
  memberships TenantMembership[]
  properties  Property[]           // ← ADD THIS LINE

  @@map("tenants")
}
```

### 3b. Replace the `FUTURE TENANT-SCOPED MODEL PATTERN` comment block with the real `Property` model

Remove the entire comment block at the bottom of the file and replace it with:

```prisma
// ─────────────────────────────────────────────────────────────────────────────
// TENANT-SCOPED BUSINESS MODELS
// ─────────────────────────────────────────────────────────────────────────────

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

---

## Step 4 — Validate the schema

```bash
cd apps/api
pnpm prisma:validate
```

Expected output: `The schema at prisma\schema.prisma is valid 🚀`

---

## Step 5 — Run the migration

```bash
cd apps/api
pnpm prisma:migrate -- --name add_property_model
```

Alternative (equivalent):
```bash
cd apps/api
npx prisma migrate dev --name add_property_model
```

Expected output:
```
Applying migration `[timestamp]_add_property_model`
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

---

## Step 6 — Confirm migration status

```bash
pnpm prisma:migrate:status
```

Expected output:
```
2 migrations found in prisma/migrations
Database schema is up to date!
```

---

## Step 7 — Regenerate Prisma Client

```bash
pnpm prisma:generate
```

---

## Step 8 — Run the full test suite

```bash
cd C:\Users\Zared\Projects\LeaseKo
pnpm --filter @leaseKo/api test
```

Expected: `37 passed, 37 total` (or more if new tests are added)

---

## Step 9 — Build the API

```bash
pnpm --filter @leaseKo/api build
```

---

## Step 10 — Update SPRINT-2-BACKLOG.md

Mark these four tasks complete in `SPRINT-2-BACKLOG.md`:

```markdown
- [x] Create Property Prisma model
- [x] Add tenantId relation to Property
- [x] Add indexes for tenantId
- [x] Create Prisma migration for Property model
```

---

## Step 11 — Commit

```bash
cd C:\Users\Zared\Projects\LeaseKo
git add apps/api/prisma/schema.prisma
git add apps/api/prisma/migrations/
git add SPRINT-2-BACKLOG.md
git status  # Confirm no .env files are staged
git commit -m "feat(api): add property data model"
```

---

## What Was NOT Done (deferred to next tasks)

| Deferred Item | Next Task |
|---|---|
| Property domain entity | US 8.1 — domain layer |
| `IPropertyRepository` interface | US 8.1 — application layer |
| `PrismaPropertyRepository` | US 8.1 — infrastructure layer |
| `CreateProperty` use case + DTO | US 8.1 — application layer |
| `POST /api/v1/properties` endpoint | US 8.1 — presentation layer |
| Unit model | US 9.1 |
