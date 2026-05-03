# Implementation Plan: Tenant-Safe Query Enforcement

**Branch**: `011-tenant-safe-queries` | **Date**: 2026-05-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-tenant-safe-queries/spec.md`

## Summary

Establish the shared TypeScript infrastructure that makes tenant-safe database queries the default and only way to access tenant-scoped data in the LeaseKo backend. This feature creates two artifacts: a `tenantFilter(tenantId)` utility function and an `ITenantScopedRepository<T>` generic interface. Both are placed in `apps/api/src/common/`. No business modules are created. Prisma is not yet installed — the utilities are designed to be Prisma-compatible but do not import `@prisma/client`. Architecture documentation is added at `docs/tenant-isolation.md`.

## Technical Context

**Language/Version**: TypeScript 5.9.3 / Node.js 20
**Primary Dependencies**: NestJS 10 (existing); Prisma (planned, Feature 012 — not used here)
**Storage**: PostgreSQL (via Docker, existing) — Prisma schema not yet created
**Testing**: Jest via ts-jest; co-located `.spec.ts` files; `rootDir: "src"` in jest.config.ts
**Target Platform**: Linux server (Docker containerized NestJS)
**Project Type**: Web service — NestJS modular monolith backend
**Performance Goals**: N/A — infrastructure/typing layer only
**Constraints**: No Prisma imports. No business modules. Utilities must be compile-safe without `@prisma/client`. TypeScript strict mode.
**Scale/Scope**: Foundation layer — all future business modules depend on these interfaces

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  — This feature adds only `common/` infrastructure (utilities + interfaces). No new NestJS module. Clean Architecture is enforced by the interface contract (repository methods accept no HTTP/NestJS types).
- [x] Domain layer imports no NestJS or Prisma packages
  — `ITenantScopedRepository<T>` has zero external imports.
- [x] Controllers are thin — all logic delegated to use cases
  — No new controllers in this feature. Existing controllers unchanged.
- [x] Cross-module interaction uses explicit interfaces or events only
  — `ITenantScopedRepository<T>` IS the explicit interface contract. Future modules implement it.

**Multi-Tenancy (CRITICAL)**

- [x] All new DB tables include `tenant_id` column with index
  — N/A: No DB tables created in this feature. The data-model.md documents the requirement for all future tables.
- [x] All repository queries filter by `tenant_id` — no unscoped queries
  — N/A: No Prisma repository implementations in this feature. The interface contract enforces this requirement at compile time for all future implementations.
- [x] Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic
  — Already implemented (Features 009-010). Not changed by this feature.

**Authentication & Authorization**

- [x] Clerk JWT is verified against JWKS — client-supplied identity is never trusted
  — Already implemented (Feature 008). Not changed by this feature.
- [x] Role/permission checks are enforced in backend guards, not in frontend
  — Not in scope. Existing guards unchanged.

**Data Layer**

- [x] All DB access goes through repository interfaces
  — `ITenantScopedRepository<T>` IS the interface. Implementation deferred to Feature 012 (Prisma).
- [x] Prisma schema changes include `tenant_id` index on affected models
  — N/A: No Prisma schema in this feature. data-model.md documents the `@@index([tenantId])` requirement.

**API & Async**

- [x] All new endpoints are documented with Swagger/OpenAPI decorators
  — N/A: No new endpoints.
- [x] All DTOs use `class-validator` decorators for strict validation
  — N/A: No new DTOs.
- [x] Heavy operations offloaded to BullMQ with `tenantId` + `userId` in job payload
  — N/A: No async operations.
- [x] BullMQ jobs are idempotent
  — N/A.

**Testing**

- [x] Unit tests cover domain and application layer logic
  — Unit tests for `tenantFilter` utility (happy path + empty guard).
- [x] Integration tests cover repository and module interactions
  — N/A: No Prisma repository implementation in this feature.
- [x] E2E tests cover new API endpoints with auth + tenant context
  — N/A: No new endpoints.

**Security**

- [x] No secrets or credentials in source code
  — No secrets in utilities.
- [x] Rate limiting applied to new public-facing endpoints
  — N/A: No endpoints.
- [x] All inputs validated and sanitised before processing
  — `tenantFilter` validates non-empty string and throws on invalid input.

## Post-Design Constitution Check

All gates pass. No violations or complexity justifications required.

## Project Structure

### Documentation (this feature)

```text
specs/011-tenant-safe-queries/
+-- spec.md              ? written
+-- plan.md              ? this file
+-- research.md          ? written
+-- data-model.md        ? written
+-- quickstart.md        ? written
+-- contracts/
¦   +-- ITenantScopedRepository.md  ? written
+-- checklists/
¦   +-- requirements.md  ? written
+-- tasks.md             ? Phase 2 output (/speckit.tasks)
```

### Source Code (this feature)

```text
apps/api/src/
+-- common/
¦   +-- utils/
¦   ¦   +-- tenant-filter.util.ts          ? NEW: tenantFilter function
¦   ¦   +-- tenant-filter.util.spec.ts     ? NEW: unit tests
¦   +-- repositories/
¦       +-- tenant-scoped.repository.interface.ts  ? NEW: ITenantScopedRepository<T>
+-- (no other changes to existing files)

docs/
+-- tenant-isolation.md                    ? NEW: architecture documentation
```

## Implementation Phases

---

### Phase 1 — Tenant Filter Utility

**Goal**: Create `tenantFilter(tenantId: string)` at `apps/api/src/common/utils/tenant-filter.util.ts`.

**Why first**: All other artifacts (interface examples, docs, quickstart) reference this utility. Tests can run immediately after.

#### File: `apps/api/src/common/utils/tenant-filter.util.ts`

```typescript
export interface TenantWhereClause {
  tenantId: string;
}

/**
 * Returns a Prisma-compatible where clause fragment that scopes any query to a tenant.
 *
 * Use this in every repository method that reads or mutates a tenant-scoped model:
 *
 *   prisma.property.findMany({ where: { ...tenantFilter(tenantId) } })
 *   prisma.property.updateMany({ where: { id, ...tenantFilter(tenantId) }, data })
 *   prisma.property.deleteMany({ where: { id, ...tenantFilter(tenantId) } })
 *
 * @param tenantId - The verified tenant ID from IRequestContext. Must be non-empty.
 * @throws Error if tenantId is empty, whitespace-only, or null-like at runtime.
 */
export function tenantFilter(tenantId: string): TenantWhereClause {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error(
      'tenantId is required for tenant-scoped queries. ' +
      'Ensure the route is protected by @RequiresTenant() and tenantId is extracted from IRequestContext.',
    );
  }
  return { tenantId };
}
```

**Key decisions**:
- Returns `{ tenantId }` (camelCase) — Prisma TypeScript layer. Prisma maps to `tenant_id` via `@map`.
- Error message is descriptive — names the guard and context type to guide developers.
- `trim()` check catches whitespace-only strings.

---

### Phase 2 — Repository Interface

**Goal**: Create `ITenantScopedRepository<T>` at `apps/api/src/common/repositories/tenant-scoped.repository.interface.ts`.

**Why second**: The interface defines method signatures. Concrete module interfaces (e.g. `IPropertyRepository`) will extend this with typed params.

#### File: `apps/api/src/common/repositories/tenant-scoped.repository.interface.ts`

```typescript
/**
 * ITenantScopedRepository<T>
 *
 * Base interface for all Prisma repository implementations of tenant-scoped models.
 *
 * Architecture rules enforced by this interface:
 * - Every read method requires `tenantId` — no unscoped queries.
 * - Every mutation method requires both `id` and `tenantId` — no id-only mutations.
 * - No method accepts an Express Request, NestJS ExecutionContext, or JWT token.
 *   Repositories are infrastructure — they know nothing about HTTP.
 *
 * Prisma implementation pattern:
 *   findMany  ? prisma.model.findMany({ where: { ...tenantFilter(tenantId), ...filters } })
 *   findById  ? prisma.model.findFirst({ where: { id, ...tenantFilter(tenantId) } })
 *   create    ? prisma.model.create({ data: { ...data, tenantId } })
 *   update    ? prisma.model.updateMany({ where: { id, ...tenantFilter(tenantId) }, data }) + count check
 *   delete    ? prisma.model.deleteMany({ where: { id, ...tenantFilter(tenantId) } }) + count check
 *
 * @see docs/tenant-isolation.md for full architecture documentation
 * @see specs/011-tenant-safe-queries/contracts/ITenantScopedRepository.md for the contract spec
 */
export interface ITenantScopedRepository<T> {
  findMany(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;
  findById(id: string, tenantId: string): Promise<T | null>;
  create(tenantId: string, data: Record<string, unknown>): Promise<T>;
  update(id: string, tenantId: string, data: Record<string, unknown>): Promise<T | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}
```

**Key decisions**:
- `Record<string, unknown>` for `data` — generic base. Concrete module interfaces define typed DTOs.
- `filters?: Record<string, unknown>` on `findMany` — allows additional where conditions beyond tenantId.
- Explicit `tenantId: string` params (not `IRequestContext`) — repositories are infrastructure, not HTTP-aware.

---

### Phase 3 — Unit Tests

**Goal**: Create unit tests for `tenantFilter` at `apps/api/src/common/utils/tenant-filter.util.spec.ts`.

#### File: `apps/api/src/common/utils/tenant-filter.util.spec.ts`

```typescript
import { tenantFilter } from './tenant-filter.util';

describe('tenantFilter', () => {
  describe('happy path', () => {
    it('returns { tenantId } for a valid tenant ID', () => {
      expect(tenantFilter('org_123')).toEqual({ tenantId: 'org_123' });
    });

    it('returns the exact tenantId string without transformation', () => {
      const id = 'org_abc_XYZ_456';
      expect(tenantFilter(id)).toEqual({ tenantId: id });
    });
  });

  describe('guard — invalid tenantId', () => {
    it('throws when tenantId is an empty string', () => {
      expect(() => tenantFilter('')).toThrow();
    });

    it('throws when tenantId is whitespace only', () => {
      expect(() => tenantFilter('   ')).toThrow();
    });
  });
});
```

---

### Phase 4 — Architecture Documentation

**Goal**: Create `docs/tenant-isolation.md` covering the full tenant-safe query architecture.

#### File: `docs/tenant-isolation.md`

Sections (implementation detail):
1. Overview — why tenant isolation exists, P0 incident definition
2. tenantId flow — Clerk JWT ? guard ? IRequestContext ? controller ? use case ? repository
3. `tenantFilter` utility — signature, usage, import path
4. `ITenantScopedRepository<T>` — method signatures, import path, extension pattern
5. Model classification — tenant-scoped table and global exceptions table with rationale
6. Prisma schema rules — `tenantId String @map("tenant_id")` + `@@index([tenantId])`
7. Safe mutation patterns — `findFirst`, `updateMany`, `deleteMany`
8. Forbidden patterns — with code examples
9. Clean Architecture layer rules — import constraints table
10. Future Prisma setup notes — Feature 012 checklist

---

### Phase 5 — BACKLOG Update

**Goal**: Mark US 3.2 tasks as `[x]` in `BACKLOG.md`.

File: `BACKLOG.md`
- `[ ] Ensure all queries include tenant_id` ? `[x]`
- `[ ] Create helper utilities for tenant filtering` ? `[x]`

---

## Tenant-Safe Query Strategy

### Official Strategy

Every tenant-scoped Prisma model MUST:
1. Have `tenantId String @map("tenant_id")` field
2. Have `@@index([tenantId])` for query performance

Every tenant-scoped repository query MUST:
1. Use `tenantFilter(tenantId)` in the Prisma `where` clause
2. Receive `tenantId` as an explicit string parameter (extracted from `IRequestContext` by the use case)

### Naming Convention

| Layer | Field name | Notes |
|-------|-----------|-------|
| TypeScript (Prisma model) | `tenantId` | camelCase — Prisma convention |
| Prisma schema | `tenantId String @map("tenant_id")` | Maps TS camelCase to DB snake_case |
| PostgreSQL column | `tenant_id` | snake_case — PostgreSQL convention |
| `tenantFilter` return | `{ tenantId }` | Matches Prisma TypeScript field name |

---

## Tenant-Scoped Model Classification

### Tenant-Scoped (require tenantId)

| Model | Module | Prisma fields required |
|-------|--------|----------------------|
| `Property` | properties | `tenantId String @map("tenant_id")` + `@@index([tenantId])` |
| `Unit` | units | same |
| `Lease` | leases | same |
| `Payment` | payments | same |
| `MaintenanceRequest` | maintenance | same |
| `Notification` | notifications | same |
| `Document` | documents | same |
| `TenantSettings` | config | same |

### Global Exceptions (no tenantId)

| Model | Reason |
|-------|--------|
| `Tenant` | IS the tenant — adding tenantId would be circular |
| `User` | Cross-tenant identity — linked via TenantMembership |
| `TenantMembership` | Junction table containing tenantId as FK, not as isolation field |

---

## Repository Method Convention

**Decision**: Explicit `tenantId: string` parameters (NOT `IRequestContext`).

**Rationale**: Repositories are infrastructure — they must not know about HTTP concepts. Use cases extract `tenantId` before calling repositories. See research.md Decision 3.

---

## Safe Query Examples

```typescript
// findMany
prisma.property.findMany({ where: { ...tenantFilter(tenantId) } })

// findById
prisma.property.findFirst({ where: { id, ...tenantFilter(tenantId) } })

// create (tenantId injected, NOT from data payload)
prisma.property.create({ data: { ...data, tenantId } })

// update (atomic compound where)
const r = await prisma.property.updateMany({ where: { id, ...tenantFilter(tenantId) }, data })
if (r.count === 0) return null

// delete (atomic compound where)
const r = await prisma.property.deleteMany({ where: { id, ...tenantFilter(tenantId) } })
return r.count > 0
```

---

## Forbidden Query Examples

```typescript
// ? unscoped findMany
prisma.property.findMany()

// ? id-only update
prisma.property.update({ where: { id }, data })

// ? id-only delete
prisma.property.delete({ where: { id } })

// ? tenantId from request body
@Post() create(@Body() dto: { tenantId: string; name: string }) {}

// ? Prisma in use case
class GetPropertiesUseCase { constructor(private prisma: PrismaClient) {} }
```

---

## Testing and Validation Checklist

| Check | Method | SC |
|-------|--------|-----|
| TypeScript fails when tenantId omitted from interface call | `tsc --noEmit` | SC-001 |
| `tenantFilter('org_123')` ? `{ tenantId: 'org_123' }` | Unit test | SC-002 |
| `tenantFilter('')` throws Error | Unit test | SC-003 |
| Model classification list: 5 scoped + 3 global | Read docs | SC-004 |
| No `@prisma/client` in `application/` or `domain/` | grep check | SC-005 |
| `ITenantScopedRepository<T>` has no NestJS/Express imports | Read file | SC-006 |

---

## Notes for Next Tasks

### Feature 012: Prisma ORM Setup
- Install Prisma + `prisma-client-js`
- Configure `DATABASE_URL` in ConfigModule Joi schema
- `prisma init` ? schema at `apps/api/prisma/schema.prisma`
- Apply `@map("tenant_id")` + `@@index([tenantId])` patterns from data-model.md

### Feature 013: Base Schema Models
- Create `User`, `Tenant`, `TenantMembership` (global — no tenantId)
- Create `Property` as first tenant-scoped model with tenantId field
- All subsequent models follow data-model.md classification

### Feature 014: Repository Implementations
- `PrismaPropertyRepository implements IPropertyRepository extends ITenantScopedRepository<Property>`
- Use `tenantFilter` in every method
- Registered as DI token: `{ provide: IPropertyRepository, useClass: PrismaPropertyRepository }`

### Feature 015+: Property Module (first business module)
- Controller: `@RequiresTenant()` + `@CurrentUser()`
- Use case: receives `IRequestContext`, extracts `tenantId`, calls repository
- See quickstart.md for the complete end-to-end pattern
