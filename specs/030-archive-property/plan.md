# Implementation Plan: Archive Property

**Branch**: `030-archive-property` | **Date**: 2026-06-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/030-archive-property/spec.md`

---

## Summary

Add a tenant-scoped `DELETE /properties/:id` endpoint that soft-archives a property. No schema changes, no new repository methods, no DTOs — `softDelete(id, tenantId): Promise<boolean>` already exists and already handles the idempotent re-archive case. The `ArchivePropertyUseCase` calls `softDelete`, throws `NotFoundException` when it returns `false`, and returns `void` on success. The endpoint returns `204 No Content`.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20+)
**Primary Dependencies**: NestJS, Prisma (behind repository), Swagger/OpenAPI
**Storage**: PostgreSQL — no migration needed (`deletedAt` already exists)
**Testing**: Jest — direct class instantiation, repository fully mocked
**Target Platform**: Linux server (NestJS API in `apps/api`)
**Project Type**: Web service (NestJS modular monolith)
**Performance Goals**: Archive operation in under 500ms
**Constraints**: Idempotent; 204 for both active and re-archive; 404 for not-found and cross-tenant (indistinguishable); no request body
**Scale/Scope**: Single record soft-delete

---

## Constitution Check

_GATE: Must pass before implementation begins._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  - New `ArchivePropertyUseCase` in `application/use-cases/`
  - New endpoint in existing `presentation/properties.controller.ts`
- [x] Domain layer unchanged — `Property` entity untouched
- [x] Controller is thin — calls use case, returns void
- [x] No cross-module dependencies

**Multi-Tenancy (CRITICAL)**

- [x] No new DB tables — `Property.tenant_id` and `Property.deletedAt` already enforced
- [x] `softDelete(id, tenantId)` already scoped by `tenantId` in Prisma `where` clause
- [x] `tenantId` extracted via `@CurrentTenant()` — never from path/body/query

**Authentication & Authorization**

- [x] `@RequiresTenant()` on endpoint — same as all other property endpoints
- [x] No frontend changes

**Data Layer**

- [x] All DB access through `PropertyRepository` interface
- [x] No schema changes — no migration

**API & Async**

- [x] `DELETE /properties/:id` documented with Swagger: `@ApiNoContentResponse`, `@ApiNotFoundResponse`, `@ApiParam`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`
- [x] No request body, no DTO, no class-validator
- [x] No async queue work — single record soft-delete

**Testing**

- [x] Unit tests cover `ArchivePropertyUseCase.execute` in isolation
- [x] Tests cover: success (active), idempotent re-archive (also success), not-found, cross-tenant, error propagation

**Security**

- [x] No secrets introduced
- [x] `tenantId` from JWT only
- [x] 404 for both not-found and cross-tenant — no information leakage
- [x] Soft delete — data retained, not destroyed

---

## Complexity Tracking

**Known Pending Concern (not a constitution violation):**

| Item | Status | Epic |
|------|--------|------|
| Unit cascade on property archive | Deferred | Epic 9 (Unit Management) — units belonging to an archived property are not archived or hidden in this story. Unit listing for an archived property's ID may return results until Epic 9 addresses this. |

---

## Project Structure

### Documentation

```
specs/030-archive-property/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── delete-property.md
```

### Source Code Changes

```
apps/api/src/modules/properties/
│
├── application/
│   └── use-cases/
│       ├── archive-property.use-case.ts       NEW
│       └── archive-property.use-case.spec.ts  NEW
│
├── presentation/
│   └── properties.controller.ts               MODIFY — add DELETE :id + inject ArchivePropertyUseCase
│
└── properties.module.ts                       MODIFY — provide ArchivePropertyUseCase
```

**No changes to**: repository interface, repository implementation, DTOs, domain entities, types, migrations.

---

## Implementation Steps

### Step 1 — Create `ArchivePropertyUseCase`

File: `application/use-cases/archive-property.use-case.ts`

```typescript
@Injectable()
export class ArchivePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: { id: string; tenantId: string }): Promise<void> {
    const archived = await this.properties.softDelete(input.id, input.tenantId);
    if (!archived) {
      throw new NotFoundException('Property not found.');
    }
  }
}
```

Key: `softDelete` returns `true` for both active and already-archived properties (idempotent). Returns `false` only for not-found or cross-tenant. The use case handles all four spec cases with two code paths.

---

### Step 2 — Add `DELETE /properties/:id` to `PropertiesController`

Import `Delete` from `@nestjs/common`. Import `ArchivePropertyUseCase`. Inject in constructor. Add after `PATCH ':id'`:

```typescript
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
@RequiresTenant()
@ApiOperation({ summary: 'Archive a property for the current tenant' })
@ApiParam({ name: 'id', description: 'Property unique identifier' })
@ApiNoContentResponse({ description: 'Property archived successfully.' })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Property not found or belongs to a different tenant.' })
@ApiUnauthorizedResponse({ ... })
@ApiForbiddenResponse({ ... })
@ApiInternalServerErrorResponse({ ... })
async archive(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
): Promise<void> {
  await this.archiveProperty.execute({ id, tenantId });
}
```

Note: `@ApiNoContentResponse` is from `@nestjs/swagger`. The handler returns `Promise<void>` — NestJS sends 204 with empty body.

---

### Step 3 — Register `ArchivePropertyUseCase` in `PropertiesModule`

Add to `providers` array.

---

### Step 4 — Write `archive-property.use-case.spec.ts`

Required test cases (5):

| # | Test | Verifies |
|---|---|---|
| 1 | Returns void when `softDelete` returns `true` (active property) | FR-001, FR-005 — happy path |
| 2 | Returns void when `softDelete` returns `true` (re-archive — idempotent) | FR-008, US3 — same code path, documented separately |
| 3 | Throws `NotFoundException` when `softDelete` returns `false` (not-found) | FR-006 |
| 4 | Throws `NotFoundException` when `softDelete` returns `false` (cross-tenant — same code path, documented separately) | FR-007 |
| 5 | Propagates unexpected repository errors without swallowing | Error handling |

Tests 1 and 2 share the same mock setup (`mockResolvedValueOnce(true)`) but are separate cases to document the idempotency guarantee. Tests 3 and 4 share the same mock setup (`mockResolvedValueOnce(false)`) but are separate to document the cross-tenant security invariant.

---

## Post-Implementation Validation

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```

Update `SPRINT-2-BACKLOG.md` only after all four pass.
