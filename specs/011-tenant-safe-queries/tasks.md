# Tasks: Tenant-Safe Query Enforcement

**Input**: Design documents from `/specs/011-tenant-safe-queries/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US1–US4]**: Which user story this task satisfies
- No story label = Setup / Foundational / Polish phase

---

## Phase 1: Setup

**Purpose**: Prepare the `common/repositories/` directory that does not yet exist.

- [X] T001 Create `apps/api/src/common/repositories/` directory with `.gitkeep` placeholder

**Checkpoint**: Directory structure ready for T004.

---

## Phase 2: Foundational — `tenantFilter` Utility

**Purpose**: Create the core utility that all repository implementations, tests, and documentation will reference. This is the BLOCKING prerequisite — T003 and T004 both depend on it.

- [X] T002 Create `tenantFilter(tenantId)` function and `TenantWhereClause` type in `apps/api/src/common/utils/tenant-filter.util.ts`

**What T002 must contain**:
- `export interface TenantWhereClause { tenantId: string; }`
- `export function tenantFilter(tenantId: string): TenantWhereClause` — throws descriptively on empty/whitespace, returns `{ tenantId }`
- JSDoc showing Prisma usage: `findMany`, `updateMany`, `deleteMany` spread examples

**Checkpoint**: Utility exists and compiles. T003 and T004 can now start in parallel.

---

## Phase 3: User Story 1 — Compile-Time Enforcement (Priority: P1) 🎯 MVP

**Goal**: A developer calling any `ITenantScopedRepository<T>` method without `tenantId` gets a TypeScript compile error.

**Independent Test**: Run `pnpm --filter api typecheck` — `tsc --noEmit` must pass. Attempt to call `findById(id)` on the interface without `tenantId` → TypeScript error (SC-001). Read the interface file → zero imports from `@nestjs/common`, `express`, or JWT libraries (SC-006).

- [X] T003 [P] [US1] Create `ITenantScopedRepository<T>` generic interface in `apps/api/src/common/repositories/tenant-scoped.repository.interface.ts`
- [X] T004 [US1] Run `pnpm --filter api typecheck` and confirm zero type errors (SC-001, SC-006)

**What T003 must contain**:
- Generic interface `ITenantScopedRepository<T>` with five methods: `findMany`, `findById`, `create`, `update`, `delete`
- All methods require `tenantId: string` — no overloads that omit it
- Zero external imports (no NestJS, Prisma, Express, IRequestContext)
- JSDoc referencing `docs/tenant-isolation.md` and `specs/011-tenant-safe-queries/contracts/ITenantScopedRepository.md`
- Inline Prisma implementation comments (as plan.md Phase 2 specifies)

**Checkpoint**: Interface compiles. Running `tsc --noEmit` passes. Interface is importable by future modules.

---

## Phase 4: User Story 2 — Standard Query Pattern (Priority: P1) 🎯 MVP

**Goal**: `tenantFilter` returns the correct Prisma-compatible where clause shape and throws on invalid input.

**Independent Test**: Run `pnpm --filter api test` — both happy-path and guard tests pass (SC-002, SC-003).

- [X] T005 [P] [US2] Create unit tests for `tenantFilter` in `apps/api/src/common/utils/tenant-filter.util.spec.ts`
- [X] T006 [US2] Run `pnpm --filter api test` and confirm all four tests pass (SC-002, SC-003)

**What T005 must contain** (four test cases):
1. `tenantFilter('org_123')` returns `{ tenantId: 'org_123' }`
2. `tenantFilter('org_abc_XYZ_456')` returns the exact string without transformation
3. `tenantFilter('')` throws
4. `tenantFilter('   ')` throws (whitespace-only guard)

**Checkpoint**: Tests green. `tenantFilter` is validated and ready for use in future Prisma repositories.

---

## Phase 5: User Story 3 — Model Classification (Priority: P2)

**Goal**: A developer knows exactly which future Prisma models require `tenantId` and which are global exceptions, with documented rationale.

**Independent Test**: Read `docs/tenant-isolation.md` — find the model classification section listing ≥ 5 tenant-scoped models and ≥ 3 global exceptions each with rationale (SC-004).

- [X] T007 [US3] Create `docs/` directory and `docs/tenant-isolation.md` with the model classification sections (tenant-scoped table + global exceptions table + `TenantMembership` query pattern note)

**What T007 must contain**:
- **Tenant-scoped models table**: Property, Unit, Lease, Payment, MaintenanceRequest, Notification, Document, TenantSettings — each with required Prisma fields (`tenantId String @map("tenant_id")` + `@@index([tenantId])`)
- **Global exceptions table**: Tenant, User, TenantMembership — each with documented rationale
- **Cross-tenant query rule**: how to query global models on behalf of a tenant (filter via TenantMembership, not via adding tenantId to User)
- **Prisma schema rule**: `tenantId String @map("tenant_id")` maps TypeScript camelCase to PostgreSQL `tenant_id`

**Checkpoint**: Model classification is documented. Any developer adding a new Prisma model has an authoritative reference.

---

## Phase 6: User Story 4 — Clean Architecture Data Flow (Priority: P2)

**Goal**: The complete `tenantId` data flow from Clerk JWT to Prisma query is documented and the interface proves no HTTP types cross the infrastructure boundary.

**Independent Test**: Read `docs/tenant-isolation.md` — the data flow section shows the full path from guard to Prisma. Read `ITenantScopedRepository<T>` — no HTTP/NestJS imports present (SC-006 re-confirmed by docs).

- [X] T008 [US4] Extend `docs/tenant-isolation.md` with: tenantId flow diagram, `tenantFilter` usage section, `ITenantScopedRepository<T>` usage section, safe query examples, forbidden query examples, Clean Architecture layer import rules table, and future Prisma setup notes

**What T008 must add to docs/tenant-isolation.md**:
- **tenantId flow**: `Clerk JWT → ClerkJwtGuard → request.user.tenantId → @CurrentTenant() → Controller → Use Case → Repository → tenantFilter(tenantId) → Prisma SQL`
- **`tenantFilter` section**: signature, import path, spread usage in `findMany`/`updateMany`/`deleteMany`
- **`ITenantScopedRepository<T>` section**: method signatures, import path, how to extend for module-specific interfaces
- **Safe query examples**: `findMany`, `findFirst`, `create` (tenantId injected), `updateMany` + count check, `deleteMany` + count check
- **Forbidden query examples**: id-only `update`, id-only `delete`, unscoped `findMany`, tenantId from `@Body()`/`@Query()`, Prisma in use case constructor
- **Layer import rules table**: Domain/Application/Infrastructure/Presentation — what each may and must not import
- **Future Prisma setup notes**: what to do in Feature 012 (Prisma init, `@map("tenant_id")`, `@@index`)

**Checkpoint**: Full architecture documentation complete. SC-004 confirmed by model table. SC-005 note documented.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Backlog bookkeeping and final build verification.

- [X] T009 Update `BACKLOG.md` — mark both US 3.2 tasks as `[x]`: "Ensure all queries include tenant_id" and "Create helper utilities for tenant filtering"
- [X] T010 Run `pnpm --filter api build` and confirm zero build errors

**Checkpoint**: All tasks complete, build passes, backlog updated.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)        → no dependencies
Phase 2 (Foundational) → requires Phase 1 ✓
Phase 3 (US1, P1)      → requires Phase 2 ✓ (T003 can parallel with T005)
Phase 4 (US2, P1)      → requires Phase 2 ✓ (T005 can parallel with T003)
Phase 5 (US3, P2)      → requires Phase 2 ✓ (docs reference tenantFilter)
Phase 6 (US4, P2)      → requires Phase 5 ✓ (extends same docs file)
Phase 7 (Polish)       → requires all phases complete
```

### User Story Dependencies

- **US1 (P1)**: Depends on foundational T002 only — no dependency on US2
- **US2 (P1)**: Depends on foundational T002 only — no dependency on US1
- **US3 (P2)**: Depends on T002 (docs reference tenantFilter) — can run in parallel with US1/US2
- **US4 (P2)**: Depends on T007 (US3) — same docs file

### Parallel Opportunities

- **T003 [US1] and T005 [US2]** can run in parallel after T002 completes (different files, no shared dependencies)
- **T003 [US1] and T007 [US3]** can run in parallel (interface file vs docs file — no dependencies between them)
- **T005 [US2] and T007 [US3]** can run in parallel (test file vs docs file)

---

## Parallel Execution: After T002 Completes

```
# These three tasks can run simultaneously after T002:
Task A: T003 — write ITenantScopedRepository<T>   → apps/api/src/common/repositories/
Task B: T005 — write tenantFilter.util.spec.ts     → apps/api/src/common/utils/
Task C: T007 — write docs/tenant-isolation.md      → docs/

# Then sequentially:
T004 — pnpm typecheck   (after T003)
T006 — pnpm test        (after T005)
T008 — extend docs      (after T007)
T009 — BACKLOG update   (after all above)
T010 — pnpm build       (after T009)
```

---

## Implementation Strategy

**MVP scope** (minimum for US1 + US2 P1 stories): T001 → T002 → T003 + T005 (parallel) → T004 + T006.

After MVP the system has:
- A validated `tenantFilter` utility that all future Prisma repositories will use
- An `ITenantScopedRepository<T>` interface that enforces `tenantId` at compile time
- Unit tests proving the utility's guard behaviour

US3 + US4 (P2) add the authoritative documentation that completes the architectural pattern.

---

## Summary

| Phase | Tasks | User Story | Parallelizable |
|-------|-------|-----------|----------------|
| 1 — Setup | T001 | — | No |
| 2 — Foundational | T002 | — | No |
| 3 — US1 P1 | T003, T004 | US1 | T003 [P] |
| 4 — US2 P1 | T005, T006 | US2 | T005 [P] |
| 5 — US3 P2 | T007 | US3 | T007 [P] |
| 6 — US4 P2 | T008 | US4 | No |
| 7 — Polish | T009, T010 | — | No |

**Total tasks**: 10
**MVP tasks**: T001–T006 (6 tasks, US1 + US2 complete)
**Parallel opportunities**: T003 + T005 + T007 can all run simultaneously after T002
