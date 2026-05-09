# Research: Property Domain & Repository Layer

**Phase**: 0 — Pre-design research
**Feature**: 024-property-repository-layer
**Date**: 2026-05-09

---

## Decision 1: Domain Entity Shape — Class vs Interface vs Type Alias

**Decision**: Plain TypeScript `interface` for the domain entity (`Property`)

**Rationale**: The existing `UserRecord` in `user.repository.ts` uses a plain `interface`. The project prefers lean interfaces over classes in the application/domain boundary — no runtime overhead, no instantiation, no confusion with Prisma-generated types. A class would add unnecessary constructor boilerplate for a value object with no domain methods at this stage.

**Alternatives considered**:
- `class Property` — rejected; no domain behavior to encapsulate yet; adds constructor boilerplate
- `type Property = { ... }` — acceptable but `interface` is preferred for extension and readability
- Prisma's generated `Property` type — rejected; would couple domain to ORM, violating constitution rule IV

---

## Decision 2: Entity File Location

**Decision**: `apps/api/src/modules/properties/domain/entities/property.entity.ts`

**Rationale**: Follows the constitution's four-layer module structure (`domain / application / infrastructure / presentation`). Consistent with the pattern intended for business entities. `UserRecord` lives in the application layer (output type for the repo); `Property` will live in `domain/entities/` since it is the core domain concept.

---

## Decision 3: Repository Interface Location and Token Co-location

**Decision**: Co-locate the `PROPERTY_REPOSITORY` token with the `PropertyRepository` interface in a single file: `apps/api/src/modules/properties/application/repositories/property.repository.ts`

**Rationale**: The existing `user.repository.ts` co-locates the `USER_REPOSITORY` symbol, input types, output types, and the `UserRepository` interface in a single file. Following this established pattern keeps related concepts together and reduces import complexity.

**Alternative considered**: Separate token file (`property.repository.token.ts`) — rejected in favour of co-location to match the existing pattern.

---

## Decision 4: Minimum Repository Methods for This Task

**Decision**: Implement `create`, `findManyByTenant`, `findById` in this task. Defer `update` and `softDelete` to the use-case tasks that need them.

**Rationale**: The spec scopes this task to the foundation. Implementing `update` and `softDelete` before the use cases that call them would be premature. Adding them later in the same file is straightforward.

**Pattern note**: `findMany` is named `findManyByTenant` to make the tenantId requirement explicit in the method name, unlike `ITenantScopedRepository.findMany` which passes tenantId as the first argument. Both are tenant-safe; the name is more self-documenting for the Properties context.

---

## Decision 5: Mapper — Dedicated File vs Inline Private Method

**Decision**: Inline private `toEntity()` method inside `PrismaPropertyRepository`

**Rationale**: The mapping from `Prisma.Property` to `Property` (domain) is a direct field-by-field copy with no transformation logic. A dedicated `PropertyMapper` class would add a file and an `@Injectable()` dependency for a function that is essentially a type cast. If mapping becomes non-trivial in future (e.g., computed fields, nested relations), it can be extracted then. `PrismaUserRepository` maps inline (implicit — Prisma's generated type already matches `UserRecord` shape). For `Property`, an explicit `toEntity()` private method inside the repository is the right middle ground.

---

## Decision 6: `PropertiesModule` Registration in `AppModule`

**Decision**: Register `PropertiesModule` in `AppModule` immediately

**Rationale**: `AppModule` already imports all feature modules (`UsersModule`, `TenantsModule`, `AuthModule`, etc.) as they are created. The convention is to register the module when it is first introduced — not wait for the first endpoint. This ensures DI wiring is validated at build/startup time and not silently skipped.

---

## Decision 7: `deletedAt` Filtering — Repository or Use Case

**Decision**: Filter out `deletedAt: null` inside the **repository** (`findManyByTenant` and `findById`)

**Rationale**: Per spec FR-007 and FR-008, and per the constitution's principle that data access concerns belong to infrastructure: a use case author must not need to remember to add soft-delete filtering. The repository enforces it as an invariant. When the archive/unarchive use case is implemented later, it will use a separate repository method (e.g., `findByIdIncludingDeleted`) if needed.

---

## Decision 8: `PrismaClientKnownRequestError` Handling

**Decision**: Catch `P2025` (record not found on update/delete) in `update` and `softDelete` methods and return `null`/`false`. Do not catch FK violation errors on `create` — let them propagate.

**Rationale**: Matches `PrismaUserRepository` error handling pattern. FK violation on `create` (P2003) means `tenantId` doesn't exist — a programming/data error that should surface, not be silently swallowed.

---

## Summary of Resolved Decisions

| Topic | Decision |
|---|---|
| Entity shape | `interface Property` (no Prisma, no NestJS) |
| Entity file | `domain/entities/property.entity.ts` |
| Token co-location | Single file with interface: `property.repository.ts` |
| Minimum methods | `create`, `findManyByTenant`, `findById` |
| Mapper | Inline private `toEntity()` in `PrismaPropertyRepository` |
| AppModule registration | Add `PropertiesModule` to `AppModule` now |
| `deletedAt` filtering | In repository, not use case |
| Error handling | Follows `PrismaUserRepository` pattern (P2025 → null/false) |

All NEEDS CLARIFICATION items resolved. Ready for Phase 1 design.
