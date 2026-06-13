# Research: List Renter Contacts API

**Feature**: 041-list-contacts-api | **Date**: 2026-06-05

---

## 1. Pagination Strategy — Offset vs. Cursor

**Decision**: Offset-based pagination (`page` + `limit`) matching the existing `ListPropertiesUseCase` pattern.

**Rationale**: The `properties` and `units` list endpoints already use offset-based pagination with `page` and `limit` query parameters. Consistency across the API reduces the surface area for client-side implementation differences. Cursor-based pagination offers better performance on very large datasets but is over-engineered for the contact list at this stage — a landlord workspace will typically have hundreds to low thousands of contacts.

**Alternatives considered**:
- Cursor-based pagination (`cursor` + `limit`): rejected — inconsistent with existing endpoints; over-engineered for typical workspace sizes
- Keyset pagination: rejected — same reasoning as cursor-based

---

## 2. Sort Order

**Decision**: `createdAt DESC` (newest contacts first).

**Rationale**: Matches the sort order used by `findPagedByTenant` in the `PrismaPropertyRepository` and `PrismaUnitRepository`. Consistent ordering makes the API predictable. "Newest first" is standard for CRM-style list views — landlords typically want to see recently added contacts at the top.

**Alternatives considered**:
- Alphabetical by `lastName`: rejected — adds complexity; user-configurable sort is deferred to a future story
- `updatedAt DESC`: rejected — makes the list reorder when contacts are modified, which is confusing for browsing

---

## 3. `total` Count — Active Only vs. All Records

**Decision**: `total` counts only active contacts (`deletedAt IS NULL`).

**Rationale**: FR-002 explicitly requires archived contacts to be excluded from results and total. A `total` that included archived records would be misleading for UI pagination controls (e.g., "Showing 20 of 25" when 5 are archived). The database query uses `$transaction([findMany, count])` with the same `WHERE` clause for both operations, so the count is always consistent with the items.

**Alternatives considered**:
- Separate `activeTotal` and `archivedTotal`: rejected — over-engineered; archived contacts are invisible to the user in this feature
- Include archived in `total` with a flag: rejected — inconsistent with spec FR-002 and FR-007

---

## 4. Response Envelope Shape

**Decision**: `{ items, total, page, limit }` — matches `PaginatedPropertiesResponseDto` shape exactly.

**Rationale**: The existing `PaginatedPropertiesResponseDto` sets the convention. Clients can treat all paginated list endpoints uniformly. The `page` and `limit` values are echoed back so clients don't need to track query params separately.

**Alternatives considered**:
- `{ data, meta: { total, page, limit } }`: rejected — inconsistent with existing endpoints
- HAL/JSON:API format: rejected — over-engineered for this API stage

---

## 5. Query DTO — String-to-Number Coercion

**Decision**: Use `@Type(() => Number)` from `class-transformer` on `page` and `limit` fields in `ListContactsQueryDto`, with `transform: true` in the global `ValidationPipe`.

**Rationale**: HTTP query parameters arrive as strings. The existing `ListPropertiesQueryDto` already uses `@Type(() => Number)` for the same reason. The global `ValidationPipe` is configured with `transform: true` in `main.ts`, so coercion is applied before validation. Non-numeric values like `"abc"` will fail the `@IsInt()` check after coercion produces `NaN`.

**Alternatives considered**:
- Manual `parseInt` in controller: rejected — violates thin-controller principle; duplicates NestJS pipe functionality
- Custom pipe: rejected — `@Type(() => Number)` + global transform is the established pattern

---

## 6. Existing Infrastructure Reused (No Changes Needed)

All the following already exist and require no changes:
- `TenantContact` Prisma model and `tenant_contacts` table (created in US 12.1)
- `TenantContact` domain entity (`domain/entities/tenant-contact.entity.ts`)
- `TenantContactRepository` interface and `TENANT_CONTACT_REPOSITORY` DI token
- `PrismaTenantContactRepository` — only `findPagedByTenant` is added
- `ContactsModule` — only `ListTenantContactsUseCase` is added as a provider
- `ContactsController` — only `GET /` route is added
- `ClerkJwtGuard`, `@CurrentTenant()`, `@RequiresTenant()`, `tenantFilter()`
- Global `ValidationPipe` (whitelist + transform + forbidNonWhitelisted)
- `ThrottlerGuard` (globally applied; new route auto-covered)
