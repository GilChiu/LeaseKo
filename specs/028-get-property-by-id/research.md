# Research: Get Property by ID

**Feature**: 028-get-property-by-id
**Date**: 2026-06-04

---

## Decision 1: No New Repository Method Required

**Decision**: Use the existing `findById(id: string, tenantId: string): Promise<Property | null>` method on `PropertyRepository`.

**Rationale**: `findById` is already defined in the interface and fully implemented in `PrismaPropertyRepository`. It accepts both `id` and `tenantId`, uses `tenantFilter()`, and excludes soft-deleted records — satisfying FR-001 through FR-007 with zero new infrastructure.

**Alternatives considered**: None — the method already exists for this exact purpose.

---

## Decision 2: NotFoundException for Both "Not Found" and "Wrong Tenant"

**Decision**: When `findById` returns `null`, the use case throws a `NotFoundException` (HTTP 404) unconditionally.

**Rationale**: The repository already merges the two cases — it returns `null` whether the record doesn't exist or belongs to a different tenant. The use case therefore never needs to know which case occurred. This satisfies FR-002, FR-003, and FR-004 (indistinguishable responses) by construction, with no conditional logic in the use case.

**Alternatives considered**:
- *Separate 403 for cross-tenant* — rejected: violates FR-004; leaks existence of other tenant's data.
- *Domain-specific error type* — unnecessary; `NotFoundException` is the correct HTTP semantic and is sufficient.

---

## Decision 3: No New DTO

**Decision**: Reuse `PropertyResponseDto` and `PropertyResponseDto.fromDomain()` for the success response.

**Rationale**: The property detail response shape is identical to the item shape in the list endpoint. Creating a separate DTO would be a premature abstraction with no benefit.

---

## Decision 4: No New Migration

**Decision**: No Prisma migration required.

**Rationale**: This feature adds only application-layer code. The `Property` schema is unchanged.

---

## Decision 5: Path Parameter Handling

**Decision**: Accept the `:id` path parameter as a raw string and pass it directly to the repository. Invalid formats return 404 (not 400).

**Rationale**: Consistent with FR-002/FR-003 — any ID that cannot be resolved within the tenant's scope is treated as not found. This avoids a separate validation path and keeps the response surface minimal.

---

## Decision 6: Existing Test Pattern

**Decision**: Unit tests follow the same pattern as `create-property.use-case.spec.ts` and `list-properties.use-case.spec.ts` — direct class instantiation, full interface mock, no NestJS TestingModule.

**Rationale**: Consistent with the established testing discipline across all use cases in this module. Tests must cover: found case, not-found case (repo returns null), cross-tenant case (repo also returns null — same code path, explicitly documented), and correct argument forwarding.
