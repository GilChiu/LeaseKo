# Research: Tenant-Safe Query Enforcement

**Feature**: 011 — Tenant-Safe Query Enforcement
**Created**: 2026-05-03
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Decision 1: Prisma Field Naming Convention

**Decision**: Use `tenantId` (camelCase) in the Prisma TypeScript model + `@map("tenant_id")` in the Prisma schema for the PostgreSQL DB column.

**Rationale**:
- Prisma does NOT auto-map camelCase → snake_case. Without `@map`, `tenantId` in the schema produces a column named `tenantId` in PostgreSQL.
- PostgreSQL convention is `snake_case`. Using `@map("tenant_id")` gives `tenant_id` in the DB while TypeScript code uses the camelCase field name `tenantId`.
- The `tenantFilter` utility returns `{ tenantId }` — the Prisma TypeScript field name. Prisma translates `tenantId` to `tenant_id` in the generated SQL.

**Alternatives Considered**:
- `tenant_id` in both Prisma schema and TypeScript — rejected because Prisma TypeScript conventions are camelCase. Mixing `snake_case` identifiers in TypeScript is an anti-pattern.
- Auto-snake-case mapping via Prisma generator plugin — rejected because it adds complexity. `@map` is explicit and clear.

---

## Decision 2: Repository Interface Placement

**Decision**: `apps/api/src/common/repositories/tenant-scoped.repository.interface.ts`

**Rationale**:
- `apps/api/src/common/` already organises cross-cutting infrastructure into sub-directories: `decorators/`, `guards/`, `types/`, `utils/`, etc.
- A `repositories/` sub-directory follows the same pattern and provides a clear home for shared repository interfaces.
- Module-specific repository interfaces (e.g. `IPropertyRepository`) will live inside their own module's `domain/` layer. The `common/repositories/` directory holds only the shared generic base interface.

**Alternatives Considered**:
- `common/types/` — rejected. Types describe data shapes. Interfaces with method signatures are behavioral contracts, not types.
- `shared/` directory — rejected. `shared/` already exists at `apps/api/src/shared/` but contains queue utilities. Repository interfaces are architectural patterns, not shared utilities.

---

## Decision 3: Repository Method Convention

**Decision**: Explicit `tenantId: string` parameter — NOT `RequestContext`.

```typescript
findMany(tenantId: string, filters?: Partial<T>): Promise<T[]>
findById(id: string, tenantId: string): Promise<T | null>
create(tenantId: string, data: Omit<T, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<T>
update(id: string, tenantId: string, data: Partial<Omit<T, 'id' | 'tenantId'>>): Promise<T | null>
delete(id: string, tenantId: string): Promise<boolean>
```

**Rationale**:
- Repositories are in the infrastructure layer. They must not know about `IRequestContext`, which is an HTTP/NestJS concept.
- `IRequestContext` carries `userId` and `role` which are irrelevant to data access. Repositories do not need them.
- Explicit `tenantId: string` is the minimum required parameter — clean, testable, and framework-agnostic.
- Use cases (application layer) are responsible for extracting `tenantId` from `IRequestContext` before calling repositories.

**Alternatives Considered**:
- `findById(ctx: IRequestContext, id: string)` — rejected. Violates Clean Architecture: infrastructure (repository) would depend on a presentation/HTTP-layer concept.
- `findById(id: string, opts: { tenantId: string })` — viable but adds boilerplate without benefit for a simple string parameter.

---

## Decision 4: Safe Prisma Mutation Pattern

**Decision**: Use `findFirst` for scoped reads, `updateMany`/`deleteMany` for scoped mutations — all with `{ id, tenantId }` in the where clause.

```typescript
// Find
await prisma.property.findFirst({ where: { id, tenantId } })

// Update
const result = await prisma.property.updateMany({ where: { id, tenantId }, data })
if (result.count === 0) return null  // not found OR not owned by tenant

// Delete
const result = await prisma.property.deleteMany({ where: { id, tenantId } })
return result.count > 0
```

**Rationale**:
- Prisma's `update({ where: { id } })` with a UUID primary key is safe IF tenantId is also in the where. However, `update` requires the where clause to resolve to a unique record — this requires either a compound unique index on `[id, tenantId]` or `id` alone. Using `id` alone as the unique key means `update({ where: { id } })` works without tenantId — creating a footgun.
- `updateMany`/`deleteMany` with `{ id, tenantId }` is atomic and always requires both fields. The `count` check catches both "not found" and "wrong tenant" without leaking which case it was.
- `findFirst` works without unique constraints and naturally enforces the where clause.

**Alternatives Considered**:
- `update({ where: { id } })` after a `findFirst` guard — rejected. Two queries, non-atomic, and still requires developer discipline.
- Adding compound unique index `@@unique([id, tenantId])` — rejected. `id` (UUID) is already globally unique. A compound unique is redundant and misleading.

---

## Decision 5: Architecture Documentation Location

**Decision**: `docs/tenant-isolation.md` — a new top-level `docs/` directory.

**Rationale**:
- Architecture documentation belongs in `docs/`, separate from feature specs (`specs/`).
- `docs/` is a standard convention and allows future docs (auth patterns, error handling, etc.) alongside `tenant-isolation.md`.
- The README.md already exists and describes the project overview. Embedding a full architecture doc in README would make it unwieldy.

**Alternatives Considered**:
- `README.md` section — rejected for length; multi-tenant isolation documentation is substantial.
- `specs/011-tenant-safe-queries/architecture.md` — rejected; spec artifacts are planning artifacts, not living documentation.

---

## Decision 6: Unit Test Location and Pattern

**Decision**: Co-located `.spec.ts` files. Test `tenantFilter` in `apps/api/src/common/utils/tenant-filter.util.spec.ts`.

**Rationale**:
- Jest config sets `rootDir: "src"` and `testRegex: ".*\\.spec\\.ts$"` — co-located spec files are the established pattern.
- The `ITenantScopedRepository<T>` interface has no runtime behavior; type-level correctness is validated by TypeScript compilation (tsc). No spec file needed for the interface.
- A unit test for `tenantFilter` validates both the happy path and the guard (empty string rejection).

**Test Coverage Plan**:
```
tenantFilter('org_123') → { tenantId: 'org_123' }   ✓ happy path
tenantFilter('')        → throws Error               ✓ empty guard
tenantFilter(null)      → throws Error (TS prevents this, but guard added)
```

---

## All NEEDS CLARIFICATION Resolved

| # | Question | Answer |
|---|----------|--------|
| 1 | Prisma camelCase or snake_case in TypeScript? | `tenantId` (camelCase) + `@map("tenant_id")` |
| 2 | Repository interface location? | `common/repositories/` |
| 3 | Repository convention: explicit tenantId or RequestContext? | Explicit `tenantId: string` |
| 4 | Safe mutation pattern (update/delete)? | `updateMany`/`deleteMany` with `{ id, tenantId }` |
| 5 | Documentation location? | `docs/tenant-isolation.md` |
| 6 | Test location? | Co-located `.spec.ts` |
