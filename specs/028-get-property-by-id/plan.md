# Implementation Plan: Get Property by ID

**Branch**: `028-get-property-by-id` | **Date**: 2026-06-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/028-get-property-by-id/spec.md`

---

## Summary

Add a tenant-scoped `GET /properties/:id` endpoint that returns a single property's full details if it belongs to the authenticated user's tenant, or a 404 if it does not exist or belongs to a different tenant. No schema changes, no new DTOs, no new repository methods — `findById(id, tenantId)` already exists and already merges both "not found" and "wrong tenant" into `null`.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: NestJS, Prisma (behind repository), Swagger/OpenAPI
**Storage**: PostgreSQL — no migration needed
**Testing**: Jest — direct class instantiation, repository fully mocked
**Target Platform**: Linux server (NestJS API in `apps/api`)
**Project Type**: Web service (NestJS modular monolith)
**Performance Goals**: Single record lookup in under 500ms
**Constraints**: 404 response for not-found and cross-tenant cases must be identical — no information leakage
**Scale/Scope**: Single record lookup; no pagination

---

## Constitution Check

_GATE: Must pass before implementation begins._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  - New `GetPropertyByIdUseCase` lives in `application/use-cases/`
  - New endpoint in existing `presentation/properties.controller.ts`
- [x] Domain layer imports no NestJS or Prisma packages — `Property` entity unchanged
- [x] Controller is thin — delegates to use case, returns DTO
- [x] No cross-module dependencies introduced

**Multi-Tenancy (CRITICAL)**

- [x] No new DB tables — `Property.tenant_id` already enforced
- [x] `findById(id, tenantId)` already uses `tenantFilter()` and returns `null` for wrong-tenant — both cases produce identical 404
- [x] `tenantId` extracted via `@CurrentTenant()` — never from path/query/body

**Authentication & Authorization**

- [x] `@RequiresTenant()` guard on endpoint — identical to existing pattern
- [x] No frontend authorization changes

**Data Layer**

- [x] All access through `PropertyRepository` interface — no direct Prisma
- [x] No schema changes — no migration required

**API & Async**

- [x] Endpoint documented with Swagger: `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiParam`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`
- [x] No async queue work — single record read
- [x] Path parameter requires no class-validator DTO (raw string, invalid IDs return 404)

**Testing**

- [x] Unit tests cover `GetPropertyByIdUseCase` in isolation
- [x] Tests cover: found case, not-found case, cross-tenant case (explicitly documented as same code path), argument forwarding, error propagation

**Security**

- [x] No secrets introduced
- [x] Rate limiting at app level
- [x] 404 for both not-found and cross-tenant — zero information leakage

---

## Project Structure

### Documentation

```
specs/028-get-property-by-id/
├── plan.md              ← This file
├── research.md          ← 6 decisions: no new repo method, NotFoundException, no new DTO, etc.
├── data-model.md        ← Error behaviour table, GetPropertyByIdInput type
├── quickstart.md        ← Manual testing guide
└── contracts/
    └── get-property-by-id.md  ← Full API contract
```

### Source Code Changes

```
apps/api/src/modules/properties/
│
├── application/
│   └── use-cases/
│       ├── get-property-by-id.use-case.ts       NEW
│       └── get-property-by-id.use-case.spec.ts  NEW
│
├── presentation/
│   └── properties.controller.ts                 MODIFY — add GET /properties/:id handler + inject GetPropertyByIdUseCase
│
└── properties.module.ts                         MODIFY — provide GetPropertyByIdUseCase
```

**No changes to**: repository interface, repository implementation, DTOs, domain entities, types, migrations.

---

## Implementation Steps

### Step 1 — Create `GetPropertyByIdUseCase`

File: `application/use-cases/get-property-by-id.use-case.ts`

```typescript
@Injectable()
export class GetPropertyByIdUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: { id: string; tenantId: string }): Promise<Property> {
    const property = await this.properties.findById(input.id, input.tenantId);
    if (!property) {
      throw new NotFoundException('Property not found.');
    }
    return property;
  }
}
```

Key: `NotFoundException` from `@nestjs/common` maps to HTTP 404. The use case never knows whether `null` was returned because the record doesn't exist or because it belongs to another tenant — this is intentional.

---

### Step 2 — Add `GET /properties/:id` to `PropertiesController`

Inject `GetPropertyByIdUseCase` in the constructor. Add:

```typescript
@Get(':id')
@HttpCode(HttpStatus.OK)
@RequiresTenant()
@ApiOperation({ summary: 'Get a property by ID for the current tenant' })
@ApiParam({ name: 'id', description: 'Property unique identifier' })
@ApiOkResponse({ description: 'Property found.', type: PropertyResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Property not found or belongs to a different tenant.' })
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid Bearer token.' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'No active tenant context.' })
@ApiInternalServerErrorResponse({ type: ErrorResponseDto, description: 'Unexpected server error.' })
async findOne(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
): Promise<PropertyResponseDto> {
  const property = await this.getPropertyById.execute({ id, tenantId });
  return PropertyResponseDto.fromDomain(property);
}
```

Note: `@Get(':id')` must be declared **after** `@Get()` in the controller to avoid NestJS route matching ambiguity.

---

### Step 3 — Register `GetPropertyByIdUseCase` in `PropertiesModule`

Add `GetPropertyByIdUseCase` to the `providers` array.

---

### Step 4 — Write `get-property-by-id.use-case.spec.ts`

Required test cases:

| # | Test Description | Verifies |
|---|---|---|
| 1 | Returns the full Property when `findById` resolves a record | FR-001: happy path |
| 2 | Throws `NotFoundException` when `findById` returns `null` (not-found) | FR-003: not-found returns 404 |
| 3 | Throws `NotFoundException` when `findById` returns `null` (cross-tenant — explicitly documented) | FR-002 + FR-004: cross-tenant also returns 404, indistinguishable |
| 4 | Calls `findById` with the exact `id` and `tenantId` from input | Constitution: tenantId from context only; id from path only |
| 5 | Does not call any other repository method | Single responsibility |
| 6 | Propagates unexpected repository errors | Error handling |

Tests 2 and 3 share the same mock setup (`mockResolvedValueOnce(null)`) — they are distinct test cases purely to document that both conditions produce the same outcome by design.

---

## Complexity Tracking

No constitution violations. All gates pass.

---

## Post-Implementation Validation

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```

Update `BACKLOG.md` only after all four pass.
