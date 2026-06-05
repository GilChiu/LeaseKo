# Implementation Plan: Update Property

**Branch**: `029-update-property` | **Date**: 2026-06-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/029-update-property/spec.md`

---

## Summary

Add a tenant-scoped `PATCH /properties/:id` endpoint that applies a partial update to a property owned by the authenticated tenant. No schema changes, no new repository methods — `update(id, tenantId, input)` already exists. The new work is: `UpdatePropertyDto` (all-optional fields + class-level "at least one" validator), `UpdatePropertyUseCase`, the controller endpoint, and unit tests.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: NestJS, Prisma (behind repository), class-validator, Swagger/OpenAPI
**Storage**: PostgreSQL — no migration needed
**Testing**: Jest — direct class instantiation, repository fully mocked
**Target Platform**: Linux server (NestJS API in `apps/api`)
**Project Type**: Web service (NestJS modular monolith)
**Performance Goals**: Single record update in under 500ms
**Constraints**: Empty payload rejected; `tenantId` never updatable; 404 for cross-tenant identical to not-found
**Scale/Scope**: Single record partial update; no pagination

---

## Constitution Check

_GATE: Must pass before implementation begins._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  - New `UpdatePropertyUseCase` in `application/use-cases/`
  - New `UpdatePropertyDto` in `presentation/dto/`
  - New endpoint in existing `presentation/properties.controller.ts`
- [x] Domain layer unchanged — `Property` entity untouched
- [x] Controller is thin — delegates entirely to use case, returns DTO
- [x] No cross-module dependencies

**Multi-Tenancy (CRITICAL)**

- [x] No new DB tables — existing `Property.tenant_id` enforced
- [x] `update(id, tenantId, input)` already scoped by `tenantId` in Prisma `where` clause — returns `null` for wrong-tenant
- [x] `tenantId` extracted via `@CurrentTenant()` — never from path/body/query

**Authentication & Authorization**

- [x] `@RequiresTenant()` on endpoint
- [x] `tenantId` absent from `UpdatePropertyDto` — global `ValidationPipe (forbidNonWhitelisted: true)` rejects any attempt to supply it

**Data Layer**

- [x] All DB access through `PropertyRepository` interface
- [x] No schema changes — no migration

**API & Async**

- [x] `PATCH /properties/:id` documented with Swagger: `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiBadRequestResponse`, `@ApiParam`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`
- [x] `UpdatePropertyDto` uses `class-validator` with class-level `@Validate` constraint
- [x] No async queue work — single record write

**Testing**

- [x] Unit tests cover `UpdatePropertyUseCase.execute` in isolation
- [x] Tests cover: success, not-found, cross-tenant 404, correct argument forwarding, single responsibility, error propagation

**Security**

- [x] No secrets introduced
- [x] `tenantId` immutable — DTO excludes it, `ValidationPipe` blocks unknown fields
- [x] 404 for cross-tenant — no information leakage

---

## Project Structure

### Documentation

```
specs/029-update-property/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── patch-property.md
```

### Source Code Changes

```
apps/api/src/modules/properties/
│
├── application/
│   └── use-cases/
│       ├── update-property.use-case.ts       NEW
│       └── update-property.use-case.spec.ts  NEW
│
├── presentation/
│   ├── dto/
│   │   └── update-property.dto.ts            NEW
│   └── properties.controller.ts              MODIFY — add PATCH :id + inject UpdatePropertyUseCase
│
└── properties.module.ts                      MODIFY — provide UpdatePropertyUseCase
```

**No changes to**: repository interface, repository implementation, existing DTOs, domain entities, types, migrations.

---

## Implementation Steps

### Step 1 — Create `UpdatePropertyDto`

File: `presentation/dto/update-property.dto.ts`

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'AtLeastOnePropertyField', async: false })
class AtLeastOnePropertyFieldConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const fields = ['name','addressLine1','addressLine2','city','state','postalCode','country','propertyType','description'];
    return fields.some(f => obj[f] !== undefined);
  }
  defaultMessage(): string {
    return 'At least one field must be provided to update a property';
  }
}

@Validate(AtLeastOnePropertyFieldConstraint)
export class UpdatePropertyDto {
  @ApiPropertyOptional({ example: 'Sunset Apartments', maxLength: 120 })
  @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  // ... (all 9 fields, each @IsOptional @IsString @MaxLength)
}
```

The `@Validate(AtLeastOnePropertyFieldConstraint)` decorator is placed on the **class**, not on a field. When the global `ValidationPipe` processes the body, it runs class-level validators after field-level ones. An empty body `{}` will fail this constraint and return 400.

---

### Step 2 — Create `UpdatePropertyUseCase`

File: `application/use-cases/update-property.use-case.ts`

```typescript
@Injectable()
export class UpdatePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: {
    id: string;
    tenantId: string;
    data: UpdatePropertyInput;
  }): Promise<Property> {
    const updated = await this.properties.update(input.id, input.tenantId, input.data);
    if (!updated) {
      throw new NotFoundException('Property not found.');
    }
    return updated;
  }
}
```

Key: only fields present in `input.data` are sent to the repository. The use case does not filter undefined values — the repository's Prisma call handles partial data via `data: input` which Prisma applies as a partial update.

---

### Step 3 — Add `PATCH /properties/:id` to `PropertiesController`

Inject `UpdatePropertyUseCase`. Add after `GET :id`:

```typescript
@Patch(':id')
@HttpCode(HttpStatus.OK)
@RequiresTenant()
@ApiOperation({ summary: 'Update a property for the current tenant' })
@ApiParam({ name: 'id', description: 'Property unique identifier' })
@ApiOkResponse({ description: 'Property updated.', type: PropertyResponseDto })
@ApiNotFoundResponse({ ... })
@ApiBadRequestResponse({ ... })
@ApiUnauthorizedResponse({ ... })
@ApiForbiddenResponse({ ... })
async update(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
  @Body() dto: UpdatePropertyDto,
): Promise<PropertyResponseDto> {
  const updated = await this.updateProperty.execute({
    id,
    tenantId,
    data: { ...dto },
  });
  return PropertyResponseDto.fromDomain(updated);
}
```

The spread `{ ...dto }` produces a plain object with only the fields that were present in the request — undefined fields are not spread.

---

### Step 4 — Register `UpdatePropertyUseCase` in `PropertiesModule`

Add to `providers` array.

---

### Step 5 — Write `update-property.use-case.spec.ts`

Required test cases (6):

| # | Test | Verifies |
|---|---|---|
| 1 | Returns the updated `Property` on success | FR-001, FR-008 |
| 2 | Throws `NotFoundException` when `update()` returns null (not-found) | FR-001 |
| 3 | Throws `NotFoundException` when `update()` returns null (cross-tenant — same code path, documented) | FR-004, FR-005 |
| 4 | Calls `update()` with exact id, tenantId, and data object | Constitution: tenantId from context only |
| 5 | Does not call any other repository method | Single responsibility |
| 6 | Propagates unexpected repository errors | Error handling |

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

Update `SPRINT-2-BACKLOG.md` only after all four pass.
