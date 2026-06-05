# Research: List Units by Property (Feature 032)

## Decision 1: Property Existence Check Strategy

**Decision**: Call `propertyRepository.findById(propertyId, tenantId)` as the first step in the use case, before issuing the unit query.

**Rationale**: The spec explicitly requires this order and states the reason: a legitimately empty property (no units yet) and an inaccessible property would both return an empty unit list if the unit query ran without a prior property check. These two cases are intentionally distinct — HTTP 200 + empty array vs HTTP 404 — and that distinction is only possible if the property is verified first. `findById` already implements all three inaccessibility cases (non-existent, cross-tenant, archived) in a single null-returning call, exactly as used in `CreateUnitUseCase` and `GetPropertyByIdUseCase`.

**Alternatives considered**:
- Query units with `propertyId + tenantId` and infer property accessibility from result count — rejected; produces identical empty result for accessible-empty and inaccessible properties, violating the spec's security invariant
- Separate existence query (SELECT 1) then unit query — rejected; `findById` already does this more efficiently and returns the full property object as a side benefit

---

## Decision 2: Unit Query Tenant Filter

**Decision**: `PrismaUnitRepository.findManyByProperty()` filters by both `propertyId` AND `tenantId` in the Prisma `where` clause.

**Rationale**: The constitution states "every query MUST filter by `tenant_id`" with no exceptions. Even though the property check already confirmed tenant ownership, the unit query itself must also include the tenantId filter. This is defense-in-depth: if the property check were ever bypassed (a bug, a future refactor, a test stub), the unit query would still not return cross-tenant data. The `@@index([tenantId])` and `@@index([propertyId])` indexes on the `units` table already cover this query pattern efficiently.

**Alternatives considered**:
- Filter only by `propertyId` (after verifying property ownership) — rejected; violates constitution rule VI which admits no exceptions

---

## Decision 3: Ordering

**Decision**: `orderBy: { unitNumber: 'asc' }` — lexicographic (string) sort.

**Rationale**: The spec requires ordering by unit number ascending. Unit numbers are stored as strings in the `units` table (`unit_number TEXT`), so Prisma's default sort is lexicographic. This means "10" sorts before "2". This is a documented trade-off (per spec Assumptions section): numeric-aware sorting is out of scope for this feature. Lexicographic ordering is deterministic, predictable, and implemented with zero additional complexity.

**Alternatives considered**:
- Natural sort (numeric-aware) — rejected; would require a Prisma raw query or a custom sort expression; spec explicitly scopes this out
- `createdAt` ordering — rejected; unit number is more meaningful to a landlord scanning a unit list

---

## Decision 4: Pagination Defaults and Maximum

**Decision**: `page` defaults to 1, `limit` defaults to 50, maximum `limit` is 100.

**Rationale**: The spec sets these values explicitly. A default of 50 (vs the properties endpoint's 20) is appropriate because unit counts per property are typically bounded — a single building rarely has thousands of units — and a higher default reduces round trips for landlords with medium-sized buildings. The cap of 100 prevents unbounded reads while staying practical for the largest expected properties.

**Alternatives considered**:
- Match the properties endpoint default of 20 — rejected; per spec, 50 is the specified default for this endpoint
- No maximum limit (return all) — rejected; unbounded reads are a performance and denial-of-service risk

---

## Decision 5: Response Envelope Shape

**Decision**: Use the same paginated envelope as `PaginatedPropertiesResponseDto`: `{ items: UnitResponseDto[], total: number, page: number, limit: number, hasMore: boolean }`.

**Rationale**: Consistency across all list endpoints in the API reduces client-side complexity — consumers of the API can apply the same pagination logic to properties and units. `hasMore` is computed as `page * limit < total`, giving clients a simple boolean flag without requiring them to compute it themselves. All five fields mirror the existing properties response exactly.

**Alternatives considered**:
- Cursor-based pagination — rejected; overkill for a bounded unit list; offset/page is sufficient and consistent with the existing endpoint
- Return only `{ items, total }` without `page`/`limit`/`hasMore` — rejected; clients would need to track these externally; reduces API usability

---

## Decision 6: Reuse of `UnitResponseDto`

**Decision**: The items array in `PaginatedUnitsResponseDto` contains `UnitResponseDto` instances — the same DTO already defined for the create-unit endpoint response.

**Rationale**: The list response returns the same full unit record shape as the create response. Reusing `UnitResponseDto` eliminates duplication and ensures both endpoints expose an identical unit shape. `UnitResponseDto.fromDomain(unit)` is already implemented.

**Alternatives considered**:
- A trimmed `UnitSummaryDto` with fewer fields — rejected; spec requires all fields in the list response; no fields are specified as list-only vs detail-only
