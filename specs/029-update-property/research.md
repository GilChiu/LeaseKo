# Research: Update Property

**Feature**: 029-update-property
**Date**: 2026-06-04

---

## Decision 1: No New Repository Method Required

**Decision**: Use the existing `update(id: string, tenantId: string, input: UpdatePropertyInput): Promise<Property | null>` on `PropertyRepository`.

**Rationale**: Already defined in the interface and implemented in `PrismaPropertyRepository` using `prisma.property.update({ where: { id, tenantId }, data: input })`. Returns `null` on Prisma P2025 (record not found or wrong tenant) — the same merged-null pattern as `findById`. Zero new infrastructure needed.

---

## Decision 2: NotFoundException for Both Not-Found and Cross-Tenant

**Decision**: When `update()` returns `null`, the use case throws `NotFoundException('Property not found.')`.

**Rationale**: Identical to `GetPropertyByIdUseCase`. The repository merges "not found" and "wrong tenant" into `null`, so the use case never needs to distinguish. FR-004 and FR-005 are satisfied by construction.

---

## Decision 3: No New Response DTO

**Decision**: Reuse `PropertyResponseDto.fromDomain()` for the success response.

**Rationale**: The updated property response shape is identical to the GET endpoints. A separate DTO would be a premature abstraction.

---

## Decision 4: "At Least One Field" via Custom ValidatorConstraint

**Decision**: Add a custom `ValidatorConstraint` class (`AtLeastOnePropertyFieldConstraint`) inline in `UpdatePropertyDto`, applied with `@Validate(AtLeastOnePropertyFieldConstraint)` at the class level.

**Rationale**: Standard class-validator approach for cross-field or class-level validation. Keeps validation in the presentation layer (DTO), not the use case. The constraint checks that at least one of the known updatable fields is not `undefined` on the dto object.

**Alternatives considered**:
- *Manual check in use case* — rejected: leaks presentation-layer validation into business logic.
- *Pipe-based empty check* — rejected: less declarative, harder to document in Swagger errors.
- *`@IsDefined()` on every field with `@ValidateIf`* — rejected: verbose and fragile; the class-level validator is cleaner.

---

## Decision 5: Nullable Fields Not Cleared in MVP

**Decision**: `UpdatePropertyDto` does not support setting nullable fields (`addressLine2`, `state`, `postalCode`, `description`) to `null` explicitly. Clients must omit the field entirely to leave it unchanged.

**Rationale**: The spec says "partial update" with no mention of clearing values. Supporting `null` in the DTO would require `@ValidateIf(o => o.field !== null)` on each nullable field, adding complexity without a stated requirement. The MVP omits null-clearing; a future enhancement can add it.

---

## Decision 6: No Migration

**Decision**: No Prisma migration required.

**Rationale**: This feature adds only application-layer code. The `Property` schema is unchanged.

---

## Decision 7: Test Pattern

**Decision**: Follow the established pattern from `GetPropertyByIdUseCase` spec tests — direct class instantiation, full interface mock, no NestJS TestingModule.

**Test cases required**: successful update, not-found (repo returns null), cross-tenant (repo also returns null — same code path, documented separately), correct argument forwarding (id, tenantId, input), no other repo method called, error propagation. DTO empty payload rejection is verified at the class-validator level, not in the use case test.
