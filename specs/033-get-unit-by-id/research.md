# Research: Get Unit by ID (Feature 033)

## Decision 1: Controller Naming and Placement

**Decision**: New class `UnitController` (singular) at `@Controller('units')`, registered in the existing `UnitsModule` alongside `UnitsController`.

**Rationale**: The existing `UnitsController` handles `properties/:propertyId/units` routes (collection operations scoped under a property). The new `UnitController` handles `units/:id` (direct single-unit access). Using singular vs plural names avoids confusion and is a common NestJS convention. Both controllers belong to the same `units` bounded context so sharing a module is correct — no new module or `AppModule` change is needed.

**Alternatives considered**:
- Adding `GET /:id` to the existing `UnitsController` — rejected; would create a conflict between `@Controller('properties/:propertyId/units')` and the flat `units/:id` path; NestJS does not allow a controller to resolve routes from two different base paths
- Registering a new `UnitDetailModule` — rejected; overkill for a single endpoint in the same bounded context

---

## Decision 2: `findById` Null Semantics

**Decision**: `UnitRepository.findById(id, tenantId)` returns `null` for both non-existent units and units belonging to a different tenant. Both cases are intentionally indistinguishable.

**Rationale**: This exactly mirrors `PropertyRepository.findById(id, tenantId)` which is the established pattern throughout this codebase. The Prisma query uses `findFirst` with `WHERE id = ? AND tenant_id = ?` — a non-existent ID and a cross-tenant ID both produce zero rows, which maps to `null`. The use case then throws `NotFoundException` for `null`, making the two cases identical at the HTTP layer.

**Alternatives considered**:
- Separate queries for existence vs ownership check — rejected; creates a timing window (TOCTOU) and leaks information about whether the unit exists for another tenant

---

## Decision 3: No `deletedAt` Filter

**Decision**: `findById` does NOT include a `deletedAt: null` filter.

**Rationale**: The `Unit` model has no `deletedAt` field — units do not have a soft-delete mechanism. Adding a `deletedAt` filter would be a compile error. The spec explicitly states "Units have no soft-delete mechanism." This is a deliberate difference from `PropertyRepository.findById()` which does include `deletedAt: null`.

**Alternatives considered**:
- Adding `deletedAt` to the `Unit` model — out of scope; no user story requires unit archiving in this sprint

---

## Decision 4: `UnitResponseDto` Reuse

**Decision**: The `GET /units/:id` response uses the existing `UnitResponseDto.fromDomain(unit)` — no new DTO class is created.

**Rationale**: The full unit record shape is identical across all unit endpoints (create, list, get-by-id). `UnitResponseDto` already includes all required fields. Creating a duplicate `UnitDetailResponseDto` would add maintenance overhead with zero benefit.

**Alternatives considered**:
- A trimmed "summary" DTO — rejected; spec requires all fields in the single-unit response
