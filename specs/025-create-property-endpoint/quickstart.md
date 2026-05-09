# Quickstart: Create Property Use Case & API Endpoint

**Feature**: 025-create-property-endpoint
**Branch**: `feature/create-property-endpoint`
**Date**: 2026-05-09

---

## Prerequisites

- Feature 024 complete — `PropertiesModule`, `PROPERTY_REPOSITORY`, `PrismaPropertyRepository` all exist
- `pnpm install` already run
- On branch `feature/create-property-endpoint`
- `apps/api` builds cleanly from `feature/property-repository-layer` base

---

## Step 1 — Confirm branch

```bash
cd C:\Users\Zared\Projects\LeaseKo
git checkout feature/create-property-endpoint
git branch --show-current   # should print: feature/create-property-endpoint
```

---

## Step 2 — Create folder structure

```bash
New-Item -ItemType Directory -Force apps/api/src/modules/properties/application/use-cases
New-Item -ItemType Directory -Force apps/api/src/modules/properties/presentation/dto
```

---

## Step 3 — Create `create-property.use-case.ts`

**File**: `apps/api/src/modules/properties/application/use-cases/create-property.use-case.ts`

See [data-model.md](data-model.md) → "Application Layer: CreatePropertyUseCase" for full content.

Key rules:
- `@Inject(PROPERTY_REPOSITORY)` — NOT `PrismaPropertyRepository`
- `execute(input: CreatePropertyInput): Promise<Property>`
- No Prisma import, no HTTP import

---

## Step 4 — Create `create-property.dto.ts`

**File**: `apps/api/src/modules/properties/presentation/dto/create-property.dto.ts`

See [data-model.md](data-model.md) → "Presentation Layer: CreatePropertyDto" for full content.

Key rules:
- NO `tenantId` field
- `@IsString() @IsNotEmpty() @MaxLength(N)` for required fields
- `@IsOptional() @IsString() @MaxLength(N)` for optional fields
- `@ApiProperty` / `@ApiPropertyOptional` for Swagger

---

## Step 5 — Create `property-response.dto.ts`

**File**: `apps/api/src/modules/properties/presentation/dto/property-response.dto.ts`

See [data-model.md](data-model.md) → "Presentation Layer: PropertyResponseDto" for full content.

Key rules:
- Static `fromDomain(property: Property): PropertyResponseDto` mapper method
- `deletedAt` excluded from response
- `tenantId` included

---

## Step 6 — Create `properties.controller.ts`

**File**: `apps/api/src/modules/properties/presentation/properties.controller.ts`

See [data-model.md](data-model.md) → "Presentation Layer: PropertiesController" for full content.

Key rules:
- `@RequiresTenant()` on the `create()` method
- `@CurrentTenant() tenantId: string` — NOT from body
- `@Body() dto: CreatePropertyDto`
- Returns `PropertyResponseDto.fromDomain(property)`
- All Swagger decorators present

---

## Step 7 — Update `properties.module.ts`

**File**: `apps/api/src/modules/properties/properties.module.ts`

Changes:
- Add `controllers: [PropertiesController]`
- Add `CreatePropertyUseCase` to `providers`
- Import both from their new paths

See [data-model.md](data-model.md) → "Module Update: PropertiesModule" for full content.

---

## Step 8 — TypeScript typecheck

```bash
cd C:\Users\Zared\Projects\LeaseKo
pnpm --filter @leaseKo/api typecheck
```

Expected: no errors.

---

## Step 9 — Build

```bash
cd C:\Users\Zared\Projects\LeaseKo\apps\api
npx nest build
```

Expected: successful NestJS compilation, exit 0.

---

## Step 10 — Run full test suite

```bash
cd C:\Users\Zared\Projects\LeaseKo
pnpm --filter @leaseKo/api test
```

Expected: 37 passed, 37 total (no regressions).

---

## Step 11 — Verify architecture boundaries

```bash
# No Prisma imports in application layer new file
grep -r "@prisma/client" apps/api/src/modules/properties/application/use-cases/

# No tenantId in DTO
grep "tenantId" apps/api/src/modules/properties/presentation/dto/create-property.dto.ts
```

Expected: zero Prisma matches in use-cases; zero `tenantId` occurrences in DTO.

---

## Step 12 — Manual API test (optional, requires valid Clerk token)

```bash
curl -X POST http://localhost:3001/api/v1/properties \
  -H "Authorization: Bearer <CLERK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Property",
    "addressLine1": "123 Main St",
    "city": "Iloilo City",
    "country": "Philippines",
    "propertyType": "APARTMENT"
  }'
```

Expected: `201 Created` with property JSON including `id`, `tenantId`, `createdAt`.

---

## Step 13 — Update SPRINT-2-BACKLOG.md

Mark complete under US 8.1:
```markdown
- [x] Create CreateProperty use case
- [x] Create CreateProperty DTO
- [x] Create POST /properties endpoint
- [x] Add Swagger documentation for create property
- [x] Add validation rules for property creation
```

Do NOT mark: `Add unit tests for CreateProperty use case`

---

## Step 14 — Commit

```bash
git add apps/api/src/modules/properties/ SPRINT-2-BACKLOG.md specs/025-create-property-endpoint/
git status   # confirm no .env files staged
git commit -m "feat(api): add create property endpoint"
```

---

## What Was NOT Done (deferred)

| Deferred Item | Next Task |
|---|---|
| Unit tests for `CreatePropertyUseCase` | Feature 026 |
| `GET /properties` list endpoint | Feature 026 or 027 |
| `GET /properties/:id` | Future |
| `PATCH /properties/:id` | Future |
| `DELETE /properties/:id` (soft delete) | Future |
| `propertyType` enum enforcement | Future migration |
