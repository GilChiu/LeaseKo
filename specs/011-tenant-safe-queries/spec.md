# Feature Specification: Tenant-Safe Query Enforcement

**Feature Branch**: `011-tenant-safe-queries`
**Created**: 2026-05-03
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer Cannot Accidentally Write an Unscoped Query (Priority: P1)

A developer writing a new repository method for a tenant-scoped business entity (e.g. Property, Lease) is forced by TypeScript types and interface contracts to provide `tenantId` — they cannot call the method without it. Forgetting to pass `tenantId` is a compile-time error, not a runtime bug.

**Why this priority**: This is the primary safety guarantee. If repository signatures don't require `tenantId`, the entire tenant isolation architecture depends entirely on developer discipline — which is insufficient for a production SaaS.

**Independent Test**: Create a repository interface method `findById(id: string, tenantId: string)` and attempt to call it without `tenantId` → TypeScript compile error. This test requires only the type definitions — no Prisma, no database.

**Acceptance Scenarios**:

1. **Given** a tenant-scoped repository interface, **When** a developer calls `findById(id)` without `tenantId`, **Then** TypeScript compilation fails with a type error.
2. **Given** a tenant-scoped repository interface, **When** a developer calls `findById(id, tenantId)` with both arguments, **Then** the call compiles successfully.
3. **Given** the `tenantFilter(tenantId)` utility, **When** called with a valid `tenantId` string, **Then** it returns `{ tenantId }` (the Prisma-compatible where clause).

---

### User Story 2 — Developer Has a Standard Pattern for Tenant-Scoped Prisma Queries (Priority: P1)

A developer implementing a Prisma repository for any tenant-scoped entity can follow one documented pattern for `findMany`, `findUnique`, `update`, and `delete` operations — without needing to remember or look up which field to filter by.

**Why this priority**: Standardization prevents both omission bugs (forgetting the filter) and naming bugs (using `tenant_id` instead of `tenantId` or vice versa). One clear pattern eliminates entire classes of data leakage errors.

**Independent Test**: Read `tenantFilter(tenantId)` utility — it returns `{ tenantId: string }` (camelCase, matching Prisma convention). Call it in a mock Prisma `findMany` pattern → the resulting where clause includes `tenantId`.

**Acceptance Scenarios**:

1. **Given** the `tenantFilter` utility, **When** passed a `tenantId`, **Then** it returns `{ tenantId }` — the exact shape needed for a Prisma `where` clause.
2. **Given** a tenant-scoped `update` operation, **When** the repository composes the Prisma query using `tenantFilter`, **Then** both `id` and `tenantId` are required in the filter — update-by-id-alone is impossible.
3. **Given** a tenant-scoped `delete` operation, **When** composed using `tenantFilter`, **Then** both `id` and `tenantId` are in the where clause — delete-by-id-alone is impossible.

---

### User Story 3 — Global (Non-Tenant) Models Are Explicitly Documented and Treated Differently (Priority: P2)

A developer knows exactly which models require `tenantId` and which do not. Global identity/membership models (e.g. a future `User` or `TenantMembership` table) are documented as explicit exceptions — not silent omissions.

**Why this priority**: Without explicit documentation, a developer might add `tenantId` to a model that shouldn't have it, or omit it from one that should. The exception list must be authoritative.

**Independent Test**: Read the model classification documentation (spec or README section) — it lists tenant-scoped models and global exceptions with rationale for each exception.

**Acceptance Scenarios**:

1. **Given** the model classification documentation, **When** a developer adds a new business entity (Property, Unit, Lease), **Then** they know it must include `tenantId` and an index.
2. **Given** the model classification documentation, **When** a developer adds a `User` model, **Then** they know it is a global model and does not require `tenantId`.
3. **Given** the model classification documentation, **When** a developer needs to add a cross-tenant lookup (e.g. resolve which tenant a user belongs to), **Then** there is an explicit `TenantMembership` pattern documented.

---

### User Story 4 — Clean Architecture Data Flow Is Documented and Enforced by Interfaces (Priority: P2)

A developer can follow a clear documented flow: `guard → controller (decorator) → use case → repository interface → Prisma infrastructure`. At no point does `tenantId` come from the request body or query params, and at no point does a repository parse an HTTP request.

**Why this priority**: Clean Architecture rules are only useful when they're enforced, not just documented. Interface contracts are the enforcement mechanism before Prisma is installed.

**Independent Test**: Read the repository interface `ITenantScopedRepository<T>` — it defines `findById`, `findMany`, `create`, `update`, `delete` signatures. All mutating and querying methods require `tenantId`. The interface has no `Request`, `HttpContext`, or JWT imports.

**Acceptance Scenarios**:

1. **Given** `ITenantScopedRepository<T>`, **When** a developer implements it, **Then** all method signatures require `tenantId: string` — the interface contract enforces it.
2. **Given** a use case that accepts `IRequestContext`, **When** it calls a repository, **Then** it passes `context.tenantId` explicitly — it does not pass the entire request object.
3. **Given** a repository implementation, **When** inspected, **Then** it contains no imports from `@nestjs/common`, `express`, or JWT libraries.

---

### Edge Cases

- What if `tenantId` is an empty string? `tenantFilter` should reject empty strings — treat them the same as `null` (invalid tenant context). This is a guardrail at the utility level.
- What if a developer wants to query by `id` only across all tenants (e.g. admin lookup)? This is out of scope — no admin/super-tenant access pattern is defined yet. All queries must be tenant-scoped for now.
- What if Prisma uses `snake_case` columns (`tenant_id`) but TypeScript uses `camelCase` (`tenantId`)? Prisma auto-maps `camelCase` in TypeScript to `snake_case` in the database when configured with `@@map` / `@map`. The utility uses `tenantId` (camelCase) — Prisma handles the DB column name.
- What if a repository method is called from a background job (BullMQ) rather than an HTTP request? The job payload must include `tenantId` (established in Feature 009 plan). The repository receives `tenantId` as a plain string — the source (HTTP vs job) is irrelevant at the repository level.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a `tenantFilter(tenantId: string)` utility function that returns `{ tenantId }` for use in Prisma `where` clauses.
- **FR-002**: `tenantFilter` MUST validate that `tenantId` is a non-empty string and throw an error if called with an empty or null-like value.
- **FR-003**: The system MUST define a `ITenantScopedRepository<T>` generic interface that declares `findById`, `findMany`, `create`, `update`, and `delete` with `tenantId: string` required on all tenant-scoped operations.
- **FR-004**: The system MUST document which future Prisma models are tenant-scoped (require `tenantId`) and which are global exceptions.
- **FR-005**: The system MUST document the clean architecture data flow: guard → controller → use case → repository interface → Prisma implementation.
- **FR-006**: The system MUST NOT implement business modules (Property, Lease, etc.) — only the shared infrastructure layer.
- **FR-007**: The system MUST NOT install or configure Prisma — the utilities must be architecture-ready but Prisma-agnostic until Feature 012.
- **FR-008**: All repository interface methods that mutate or read tenant-scoped data MUST require `tenantId: string` as a parameter — there must be no overload or default that allows omission.
- **FR-009**: The `tenantFilter` utility MUST use `tenantId` (camelCase) as the property key — matching the Prisma TypeScript convention for auto-mapped `snake_case` DB columns.
- **FR-010**: The clean architecture rule MUST be enforced by TypeScript interfaces, not only by documentation.

### Key Entities

- **`tenantFilter(tenantId: string)`**: Utility function at `apps/api/src/common/utils/tenant-filter.util.ts`. Returns `{ tenantId: string }`.
- **`ITenantScopedRepository<T>`**: Generic interface at `apps/api/src/common/repositories/tenant-scoped.repository.interface.ts`. Defines method signatures for all tenant-scoped data operations.
- **Tenant-Scoped Model**: Any future Prisma model representing business data owned by a tenant. Must have `tenantId String` field and `@@index([tenantId])`.
- **Global Model**: A Prisma model that exists outside tenant scope (e.g. `User`, `TenantMembership`). Must be explicitly documented as a global exception.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: TypeScript compilation fails when `tenantId` is omitted from any `ITenantScopedRepository` method call — verified by attempting to call any interface method without `tenantId`.
- **SC-002**: `tenantFilter('org_123')` returns `{ tenantId: 'org_123' }` — verified by a unit test or manual invocation.
- **SC-003**: `tenantFilter('')` throws an error — verified by a unit test or manual invocation.
- **SC-004**: The model classification list covers at minimum: 5 tenant-scoped models (Property, Unit, Lease, Payment, MaintenanceRequest) and 3 global models (User, Tenant, TenantMembership) — verified by reading the documented list.
- **SC-005**: Zero direct Prisma client imports exist in `application/` or `domain/` layer files — verified by `grep -r "@prisma/client" apps/api/src/modules/*/application` returning no results.
- **SC-006**: `ITenantScopedRepository<T>` has no NestJS, Express, or JWT imports — verified by reading the interface file.

---

## Assumptions

- Prisma is **not yet installed** — utilities are designed to be Prisma-compatible but do not import `@prisma/client`.
- The Prisma naming convention for this project will use camelCase in TypeScript (e.g. `tenantId`) mapped to `snake_case` in PostgreSQL (e.g. `tenant_id`) — consistent with Prisma defaults.
- No business modules (Property, Unit, Lease, etc.) exist yet — the interface and utility are foundational infrastructure only.
- `IRequestContext` already exists at `apps/api/src/common/types/request-context.type.ts` with `{ userId: string; tenantId: string | null; role: string | null }`.
- Use cases will receive `IRequestContext` and extract `tenantId` before passing it to repositories — they will not pass the full context to repository methods.
- BullMQ job payloads already include `tenantId` per the Feature 009 plan — repository methods called from job processors receive `tenantId` as a plain string.
- The `create` operation on tenant-scoped models injects `tenantId` from the request context — it is never provided by the caller in request body data.
