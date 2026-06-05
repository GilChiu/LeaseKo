# Implementation Plan: List Properties

**Branch**: `027-list-properties` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/027-list-properties/spec.md`

---

## Summary

Add a tenant-scoped `GET /properties` endpoint that returns a paginated list of properties belonging to the authenticated user's tenant. The endpoint introduces a `ListPropertiesUseCase`, a new paginated repository method, a query DTO, and a paginated response envelope. No database schema changes are required — the `Property` model already exists.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: NestJS, Prisma (behind repository), class-validator, Swagger/OpenAPI
**Storage**: PostgreSQL (existing `Property` table, no migration needed)
**Testing**: Jest — direct class instantiation (no `TestingModule`), repository fully mocked
**Target Platform**: Linux server (NestJS API in `apps/api`)
**Project Type**: Web service (NestJS modular monolith)
**Performance Goals**: Property list for up to 500 records returned in under 2 seconds
**Constraints**: Tenant isolation is a P0 correctness requirement; `tenantId` must never come from request body/query/header
**Scale/Scope**: Single tenant workspace; paginated in increments of 20 (default), max 100

---

## Constitution Check

_GATE: Must pass before implementation begins._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  - New `ListPropertiesUseCase` lives in `application/use-cases/`
  - New DTOs live in `presentation/dto/`
  - New repository method lives in `infrastructure/repositories/`
- [x] Domain layer imports no NestJS or Prisma packages — `Property` entity unchanged
- [x] Controllers are thin — `PropertiesController` delegates entirely to `ListPropertiesUseCase`
- [x] Cross-module interaction uses explicit interfaces — no new cross-module dependencies

**Multi-Tenancy (CRITICAL)**

- [x] No new DB tables — existing `Property.tenant_id` column and index are already in place
- [x] All repository queries filter by `tenant_id` — `findPagedByTenant` uses `tenantFilter()` + `$transaction([findMany, count])`
- [x] Request context (`tenantId`) injected via `@RequiresTenant()` guard and extracted with `@CurrentTenant()` decorator — identical pattern to `POST /properties`

**Authentication & Authorization**

- [x] Clerk JWT verified by `ClerkJwtGuard` before any handler logic — `@RequiresTenant()` enforces this
- [x] No role/permission checks added to frontend

**Data Layer**

- [x] All DB access goes through `PropertyRepository` interface via `PROPERTY_REPOSITORY` token
- [x] No direct `PrismaService` in use case or controller
- [x] No schema changes — no new migration required

**API & Async**

- [x] `GET /properties` documented with full Swagger decorators: `@ApiOkResponse`, `@ApiQuery` (page, limit), `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiBadRequestResponse`
- [x] `ListPropertiesQueryDto` uses `@IsOptional`, `@IsInt`, `@Min`, `@Max` from class-validator
- [x] No async queue work needed — this is a read operation

**Testing**

- [x] Unit tests cover `ListPropertiesUseCase.execute` in isolation (no Prisma, no NestJS, no HTTP)
- [x] Tests cover: happy path, empty result, cross-tenant isolation, pagination metadata, repository error propagation

**Security**

- [x] No secrets or credentials introduced
- [x] Rate limiting handled globally at app bootstrap level
- [x] `tenantId` comes only from `@CurrentTenant()` — never from `dto.tenantId` or query string

---

## Project Structure

### Documentation (this feature)

```
specs/027-list-properties/
├── plan.md              ← This file
├── research.md          ← Pagination strategy + design decisions
├── data-model.md        ← New types + DTO shapes
├── quickstart.md        ← Manual testing guide
├── contracts/
│   └── get-properties.md  ← Full API contract for GET /properties
└── checklists/
    └── requirements.md  ← Spec quality checklist
```

### Source Code Changes

```
apps/api/src/modules/properties/
│
├── application/
│   ├── repositories/
│   │   └── property.repository.ts            MODIFY — add findPagedByTenant method
│   ├── types/
│   │   └── property-repository.types.ts      MODIFY — add FindPagedByTenantOptions, PagedProperties
│   └── use-cases/
│       ├── create-property.use-case.spec.ts  MODIFY — add findPagedByTenant: jest.fn() to mock
│       ├── list-properties.use-case.ts       NEW
│       └── list-properties.use-case.spec.ts  NEW
│
├── infrastructure/
│   └── repositories/
│       └── prisma-property.repository.ts     MODIFY — implement findPagedByTenant
│
├── presentation/
│   └── dto/
│       ├── list-properties-query.dto.ts      NEW
│       └── paginated-properties-response.dto.ts  NEW
│
├── presentation/
│   └── properties.controller.ts              MODIFY — add GET /properties handler + inject ListPropertiesUseCase
│
└── properties.module.ts                      MODIFY — provide ListPropertiesUseCase
```

---

## Implementation Steps

### Step 1 — Add pagination types to `property-repository.types.ts`

Add two new exported interfaces. **No existing types are changed.**

```typescript
export interface FindPagedByTenantOptions {
  page: number;   // 1-based
  limit: number;  // records per page
}

export interface PagedProperties {
  items: Property[];
  total: number;
}
```

---

### Step 2 — Add `findPagedByTenant` to `PropertyRepository` interface

Add one new method. **Existing methods are unchanged.**

```typescript
/**
 * Return a paginated slice of active Properties for a tenant.
 * Excludes soft-deleted records. Results ordered by createdAt DESC.
 * tenantId MUST come from verified request context.
 */
findPagedByTenant(
  tenantId: string,
  options: FindPagedByTenantOptions,
): Promise<PagedProperties>;
```

---

### Step 3 — Implement `findPagedByTenant` in `PrismaPropertyRepository`

```typescript
async findPagedByTenant(
  tenantId: string,
  options: FindPagedByTenantOptions,
): Promise<PagedProperties> {
  const { page, limit } = options;
  const skip = (page - 1) * limit;
  const where = { ...tenantFilter(tenantId), deletedAt: null };

  const [records, total] = await this.prisma.$transaction([
    this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.property.count({ where }),
  ]);

  return { items: records.map((r) => this.toEntity(r)), total };
}
```

Uses `$transaction` for consistent count + records in a single round-trip.

---

### Step 4 — Update `create-property.use-case.spec.ts` mock

Add **one line** to the existing mock object to satisfy the updated interface:

```typescript
const mockRepo: PropertyRepository = {
  create: jest.fn(),
  findManyByTenant: jest.fn(),
  findPagedByTenant: jest.fn(),   // ← ADD THIS LINE
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};
```

No test behaviour changes.

---

### Step 5 — Create `ListPropertiesUseCase`

File: `application/use-cases/list-properties.use-case.ts`

```typescript
@Injectable()
export class ListPropertiesUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: {
    tenantId: string;
    page: number;
    limit: number;
  }): Promise<PagedProperties> {
    return this.properties.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
    });
  }
}
```

---

### Step 6 — Create `ListPropertiesQueryDto`

File: `presentation/dto/list-properties-query.dto.ts`

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListPropertiesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

Note: `@Type(() => Number)` is required so that `class-transformer` coerces the string query param to a number before `class-validator` runs.

---

### Step 7 — Create `PaginatedPropertiesResponseDto`

File: `presentation/dto/paginated-properties-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { PagedProperties } from '../../application/types/property-repository.types';
import { PropertyResponseDto } from './property-response.dto';

export class PaginatedPropertiesResponseDto {
  @ApiProperty({ type: [PropertyResponseDto] })
  items!: PropertyResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: true })
  hasMore!: boolean;

  static fromDomain(
    pagedResult: PagedProperties,
    page: number,
    limit: number,
  ): PaginatedPropertiesResponseDto {
    const dto = new PaginatedPropertiesResponseDto();
    dto.items = pagedResult.items.map(PropertyResponseDto.fromDomain);
    dto.total = pagedResult.total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < pagedResult.total;
    return dto;
  }
}
```

---

### Step 8 — Add `GET /properties` to `PropertiesController`

Inject `ListPropertiesUseCase` in the constructor. Add the handler:

```typescript
@Get()
@HttpCode(HttpStatus.OK)
@RequiresTenant()
@ApiOperation({ summary: 'List all properties for the current tenant' })
@ApiOkResponse({
  description: 'Paginated property list.',
  type: PaginatedPropertiesResponseDto,
})
@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid query parameters.' })
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid Bearer token.' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'No active tenant context.' })
@ApiInternalServerErrorResponse({ type: ErrorResponseDto, description: 'Unexpected server error.' })
async list(
  @CurrentTenant() tenantId: string,
  @Query() query: ListPropertiesQueryDto,
): Promise<PaginatedPropertiesResponseDto> {
  const result = await this.listProperties.execute({
    tenantId,
    page: query.page,
    limit: query.limit,
  });
  return PaginatedPropertiesResponseDto.fromDomain(result, query.page, query.limit);
}
```

---

### Step 9 — Register `ListPropertiesUseCase` in `PropertiesModule`

Add `ListPropertiesUseCase` to the `providers` array alongside `CreatePropertyUseCase`.

---

### Step 10 — Write `list-properties.use-case.spec.ts`

Required test cases:

| # | Test Description | Verifies |
|---|---|---|
| 1 | Returns items and total from repository | Happy path — result forwarded unchanged |
| 2 | Returns `items: []` and `total: 0` when tenant has no properties | FR-005: empty list not error |
| 3 | Calls `findPagedByTenant` with the exact tenantId from input | Constitution: tenantId must come from context |
| 4 | Calls `findPagedByTenant` with the exact page and limit | Input forwarded without mutation |
| 5 | Does not call any other repository method | Use case scope — single responsibility |
| 6 | Result items belong to the given tenantId (not another tenant's) | FR-002: cross-tenant isolation |
| 7 | Propagates repository errors without swallowing | Error handling |

---

## Complexity Tracking

No constitution violations. All gates pass. No justifications required.

---

## Post-Implementation Validation

Run in order after all files are created:

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```

All must pass before updating `BACKLOG.md`.
