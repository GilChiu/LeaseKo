# Research: List Properties

**Feature**: 027-list-properties
**Date**: 2026-06-01

---

## Decision 1: Pagination Strategy

**Decision**: DB-level pagination via a new `findPagedByTenant` method on the `PropertyRepository` interface.

**Rationale**: The existing `findManyByTenant(tenantId): Promise<Property[]>` loads all records into memory. In-memory pagination would work for small datasets but is incorrect practice for a production SaaS. Adding a dedicated paged method is backward-compatible (no callers of `findManyByTenant` in production code yet) and follows the established repository pattern.

**Alternatives considered**:
- *In-memory pagination* — rejected: loads unbounded records, not acceptable for production
- *Modify `findManyByTenant` signature* — rejected: breaks existing return type relied on by `create-property.use-case.spec.ts` mock shape (TypeScript strict checking)
- *Cursor-based pagination* — deferred: offset/page is simpler for MVP; cursors can be added when needed

**Implementation**: Add `findPagedByTenant(tenantId, { page, limit }): Promise<{ items: Property[], total: number }>` to the interface and Prisma implementation using `findMany` + `count` in a `$transaction`.

---

## Decision 2: Response Envelope

**Decision**: `PaginatedPropertiesResponseDto` with fields `items`, `total`, `page`, `limit`, `hasMore`.

**Rationale**: Provides all information a client needs to implement pagination UI (current page, total pages calculable, explicit `hasMore` for list-style UIs). Consistent with standard REST pagination patterns. `hasMore = page * limit < total`.

**Alternatives considered**:
- *Return bare array* — rejected: non-paginated response is not extensible; clients can't navigate
- *Return only `items` + `total`* — rejected: client needs page/limit echoed back to avoid state drift

---

## Decision 3: Query Parameters

**Decision**: Optional `page` (default 1, min 1) and `limit` (default 20, min 1, max 100) query params validated via `class-validator`.

**Rationale**: Standard query-param conventions. Defaults satisfy the spec assumption (page 20). Max of 100 prevents accidental large queries.

---

## Decision 4: No Prisma Migration Required

**Decision**: No new migration needed.

**Rationale**: The `Property` model already exists with `tenant_id`, all indexes, and `deletedAt` for soft-delete. This feature adds only application-layer code and a new repository method.

---

## Decision 5: Existing Test Update

**Decision**: `create-property.use-case.spec.ts` must be updated to add `findPagedByTenant: jest.fn()` to its full-interface mock.

**Rationale**: TypeScript strict mode will reject a mock typed as `PropertyRepository` if it is missing a required interface method. This is a one-line change that does not affect test behaviour.

---

## Decision 6: Soft-Deleted Properties

**Decision**: Soft-deleted properties (where `deletedAt IS NOT NULL`) are excluded from list results.

**Rationale**: Consistent with the existing `findManyByTenant` implementation which already applies `deletedAt: null`. No behaviour change required; the new `findPagedByTenant` follows the same filter.
