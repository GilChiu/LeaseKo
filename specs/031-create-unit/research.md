# Research: Create Unit (Feature 031)

## Decision 1: Module Placement — New `units/` Module vs. Embedding in `properties/`

**Decision**: Create a new `units/` module under `apps/api/src/modules/`.

**Rationale**: The LeaseKo constitution explicitly lists `Units` as a distinct bounded context alongside `Properties`, `Leases`, `Payments`, etc. Embedding unit logic inside the properties module would violate bounded context boundaries and create a module that would need to be split later. A separate `units/` module follows the four-layer structure already established by `properties/` and allows the `units` domain to evolve independently (future: list units, update unit, assign lease to unit, etc.).

**Alternatives considered**:
- Embed under `properties/` as a sub-folder — rejected; violates bounded context principle and makes extraction harder
- Nest units entirely inside a `properties/units/` sub-route controller — rejected; HTTP route nesting does not dictate module boundaries in Clean Architecture

---

## Decision 2: Cross-Module Dependency Strategy

**Decision**: `UnitsModule` imports `PropertiesModule` and receives `PROPERTY_REPOSITORY` via NestJS dependency injection.

**Rationale**: The use case needs to validate the property (exists, belongs to tenant, not archived) before creating the unit. The `PropertyRepository.findById(id, tenantId)` method already implements all three 404 conditions in a single call. `PropertiesModule` already exports `PROPERTY_REPOSITORY`, so `UnitsModule` can import it without any architectural violation. Cross-module interaction occurs through an explicitly defined interface (not a direct service import), satisfying the constitution.

**Alternatives considered**:
- Emit a domain event from the use case and let a listener verify the property — over-engineered for a synchronous request; events are for async side-effects
- Re-implement property lookup in the units module — violates DRY and duplicates tenant-isolation logic

---

## Decision 3: UnitStatus Representation

**Decision**: TypeScript string union type (`'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'`) in the domain entity; Prisma native enum (`enum UnitStatus { AVAILABLE OCCUPIED MAINTENANCE }`) in the schema.

**Rationale**: The domain entity (`unit.entity.ts`) must not import from NestJS or Prisma. A string union type gives full type safety in the domain without any infrastructure coupling. Prisma's native enum maps directly to a PostgreSQL `ENUM` type, giving DB-level constraint enforcement and preventing invalid values from ever being stored. The repository's `toEntity()` method casts the Prisma enum value to the domain union type — no runtime conversion needed since the string values are identical.

**Alternatives considered**:
- TypeScript `enum` in domain — rejected; string unions are preferred in modern TypeScript for domain types (better exhaustiveness, easier to extend, no reverse mapping overhead)
- Store status as a plain `String` in Prisma — rejected; removes DB-level constraint enforcement

---

## Decision 4: Numeric Field Types for Rent, Area, Bedrooms, Bathrooms

**Decision**:
- `monthlyRent`: `Decimal @db.Decimal(12, 2)` in Prisma schema; `number | null` in domain entity (converted via `.toNumber()` in `toEntity()`)
- `floorArea`: `Float?` in Prisma; `number | null` in domain
- `bathrooms`: `Float?` in Prisma; `number | null` in domain (allows 1.5 baths — common in real estate)
- `bedrooms`: `Int?` in Prisma; `number | null` in domain (whole rooms only)

**Rationale**: Monetary values (`monthlyRent`) require decimal precision — PostgreSQL's `NUMERIC(12,2)` avoids floating-point rounding errors for financial data. `floorArea` and `bathrooms` use `Float` (double-precision) for flexibility without requiring monetary precision. `bedrooms` is always a whole number — `Int` enforces this at the DB layer. The domain entity uses `number` for all to avoid coupling to `Prisma.Decimal`.

**Alternatives considered**:
- All numeric fields as `Float` — rejected for `monthlyRent`; floating-point arithmetic on currency is a known source of bugs (e.g., 0.1 + 0.2 ≠ 0.3 in IEEE 754)
- `Int` for all numeric fields — rejected; fractional bathrooms (1.5) and floor areas (50.5 sqm) are legitimate values

---

## Decision 5: Duplicate Unit Number Conflict Handling

**Decision**: `PrismaUnitRepository.create()` catches `PrismaClientKnownRequestError` with code `P2002` and throws NestJS `ConflictException`.

**Rationale**: The `@@unique([propertyId, unitNumber])` constraint on the `units` table enforces uniqueness at the database level — the repository layer is the only place that touches Prisma, so it is the correct layer to catch and translate this error. The global exception filter already handles `P2002` via `mapPrismaError()`, but an explicit catch in the repository provides clearer error messaging ("Unit number already exists under this property") and is consistent with how `PrismaPropertyRepository` handles `P2025`.

**Alternatives considered**:
- Pre-check for duplicate before insert (SELECT then INSERT) — rejected; introduces a TOCTOU race condition under concurrent requests; the DB constraint + catch is atomic and correct
- Let the global filter catch P2002 — technically works, but produces a generic "A record with this value already exists" message; explicit handling is more informative

---

## Decision 6: Property Validation in the Use Case

**Decision**: Call `propertyRepository.findById(propertyId, tenantId)` in `CreateUnitUseCase`. If it returns `null`, throw `NotFoundException('Property not found.')`.

**Rationale**: `PropertyRepository.findById()` already handles all three inaccessible-property scenarios in one call:
1. Non-existent property → returns `null` (no matching row)
2. Other tenant's property → returns `null` (filtered by `tenantId`)
3. Archived property → returns `null` (`deletedAt: null` filter applied)

All three cases produce identical `NotFoundException` responses, satisfying the spec's security requirement that they be indistinguishable. No additional logic is needed — the existing method does exactly what's required.

**Alternatives considered**:
- Separate existence check from tenant check — rejected; would reveal whether the property exists for a different tenant
- Check property existence in the repository alongside unit creation in a transaction — over-engineered; the use case's sequential check is correct and simple

---

## Decision 7: tenantId Derivation on the Created Unit

**Decision**: After the property lookup succeeds, pass `property.tenantId` to `CreateUnitInput.tenantId`.

**Rationale**: The spec explicitly states "the tenantId on the created unit is always derived from the property's tenantId, not set independently." Although the JWT-sourced tenantId and the property's tenantId are always equal when the lookup succeeds (because `findById` filters by tenantId), using `property.tenantId` makes the derivation chain explicit and self-documenting in code. It is clearer than relying on the implied equality.

**Alternatives considered**:
- Pass the JWT tenantId directly to `CreateUnitInput` — functionally equivalent but less explicit; doesn't document the derivation
