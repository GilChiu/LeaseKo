# Quickstart: Property Domain & Repository Layer Implementation

**Feature**: 024-property-repository-layer
**Branch**: `feature/property-repository-layer`
**Date**: 2026-05-09

---

## Prerequisites

- Feature 023 complete — `Property` Prisma model and migration exist
- `pnpm install` already run
- TypeScript builds cleanly on `feature/property-data-model` base

---

## Step 1 — Confirm branch

```bash
cd C:\Users\Zared\Projects\LeaseKo
git checkout feature/property-repository-layer
```

---

## Step 2 — Create folder structure

```bash
New-Item -ItemType Directory -Force apps/api/src/modules/properties/domain/entities
New-Item -ItemType Directory -Force apps/api/src/modules/properties/application/repositories
New-Item -ItemType Directory -Force apps/api/src/modules/properties/application/types
New-Item -ItemType Directory -Force apps/api/src/modules/properties/infrastructure/repositories
```

---

## Step 3 — Create `property.entity.ts`

**File**: `apps/api/src/modules/properties/domain/entities/property.entity.ts`

See [data-model.md](data-model.md) → "Domain Entity: Property" for full content.

Key rules:
- No `@prisma/client` import
- No `@nestjs` import
- Plain TypeScript `interface`

---

## Step 4 — Create `property-repository.types.ts`

**File**: `apps/api/src/modules/properties/application/types/property-repository.types.ts`

See [data-model.md](data-model.md) → "Repository Input Types" for full content.

Key rules:
- `CreatePropertyInput` includes `tenantId`
- `UpdatePropertyInput` does NOT include `tenantId`

---

## Step 5 — Create `property.repository.ts`

**File**: `apps/api/src/modules/properties/application/repositories/property.repository.ts`

See [data-model.md](data-model.md) → "Repository Interface & Token" for full content.

Key rules:
- `PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY')` exported from this file
- Interface imports `Property` from domain entity
- No `@prisma/client` import

---

## Step 6 — Create `prisma-property.repository.ts`

**File**: `apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts`

See [data-model.md](data-model.md) → "Infrastructure: PrismaPropertyRepository" for full content.

Key rules:
- `tenantFilter()` used in every tenant-scoped read
- `deletedAt: null` added to `findManyByTenant` and `findById`
- Private `toEntity()` maps Prisma record to `Property` interface
- `P2025` caught in `update` and `softDelete` → returns `null` / `false`

---

## Step 7 — Create `properties.module.ts`

**File**: `apps/api/src/modules/properties/properties.module.ts`

See [data-model.md](data-model.md) → "Module Wiring" for full content.

Key rules:
- `PROPERTY_REPOSITORY` bound to `PrismaPropertyRepository`
- No `DatabaseModule` import needed (PrismaService is `@Global`)
- Export `PROPERTY_REPOSITORY` for future use cases

---

## Step 8 — Register `PropertiesModule` in `AppModule`

**File**: `apps/api/src/app.module.ts`

Add to imports:
```typescript
import { PropertiesModule } from './modules/properties/properties.module';

// inside @Module({ imports: [...] })
PropertiesModule,
```

---

## Step 9 — TypeScript typecheck

```bash
cd C:\Users\Zared\Projects\LeaseKo
pnpm --filter @leaseKo/api typecheck
```

Expected: no errors.

---

## Step 10 — Build

```bash
pnpm --filter @leaseKo/api build
```

Expected: successful NestJS compilation.

---

## Step 11 — Run full test suite

```bash
pnpm --filter @leaseKo/api test
```

Expected: 37 passed, 37 total.

---

## Step 12 — Verify Prisma isolation

```bash
grep -r "@prisma/client" apps/api/src/modules/properties/domain/
grep -r "@prisma/client" apps/api/src/modules/properties/application/
```

Expected: zero matches in `domain/` and `application/` folders.

---

## Step 13 — Update SPRINT-2-BACKLOG.md

Mark complete under US 8.1:
```markdown
- [x] Define Property domain entity
- [x] Define Property repository interface
- [x] Implement PrismaPropertyRepository
```

---

## Step 14 — Commit

```bash
git add apps/api/src/modules/properties/ apps/api/src/app.module.ts SPRINT-2-BACKLOG.md
git status  # confirm no .env files staged
git commit -m "feat(api): add property repository layer"
```

---

## What Was NOT Done (deferred)

| Deferred Item | Next Task |
|---|---|
| `CreateProperty` use case | US 8.1 next |
| `CreateProperty` DTO | US 8.1 next |
| `POST /api/v1/properties` endpoint | US 8.1 next |
| Swagger documentation | US 8.1 next |
| Unit tests for use case | US 8.1 next |
| `update` use case | US 8.4 |
| `softDelete` use case | US 8.5 |
| `Unit` model | US 9.1 |
