# Research: Get Renter Contact by ID

**Feature**: 042-get-contact-by-id | **Date**: 2026-06-05

---

## 1. Not-Found Strategy — Unified 404 for All Inaccessible Cases

**Decision**: The repository's `findById(id, tenantId)` method returns `null` for all three cases (non-existent, cross-tenant, archived). The use case throws `NotFoundException` when the repository returns `null`. The controller never needs to distinguish the cases.

**Rationale**: Merging all inaccessible cases at the repository level prevents information leakage. A caller that receives 404 cannot determine whether the record does not exist, belongs to another workspace, or is archived. This is the same pattern used by `PrismaPropertyRepository.findById` and `PrismaUnitRepository.findById` — both filter by `id`, `tenantId`, and `deletedAt: null` in a single `findFirst` query; anything that doesn't match returns `null`.

**Alternatives considered**:
- Use case distinguishes null from cross-tenant: rejected — violates the security requirement; different error codes would reveal cross-tenant data existence
- Controller catches Prisma errors and maps them: rejected — error mapping belongs in the repository or a filter, not the controller

---

## 2. NotFoundException Responsibility — Use Case vs. Controller

**Decision**: The use case throws `NotFoundException` when `findById` returns `null`. The controller simply awaits the use case and returns the DTO — it does not need try/catch.

**Rationale**: Consistent with how `GetPropertyByIdUseCase` handles the not-found case in the properties module — the use case throws and the controller is clean. `NotFoundException` from `@nestjs/common` maps to 404 via the global exception filter automatically.

**Alternatives considered**:
- Controller throws NotFoundException: rejected — violates thin-controller principle; business decision (null = not found) belongs in the use case
- Repository throws NotFoundException: rejected — repositories return domain values or null; HTTP exceptions belong in the application or presentation layer

---

## 3. Path Parameter Validation

**Decision**: No `@IsUUID()` or other validation on the `:id` path parameter. The lookup proceeds with whatever string is provided; if nothing is found, 404 is returned.

**Rationale**: The spec explicitly states that malformed IDs return 404 rather than 400. Adding UUID validation would change the behaviour for malformed IDs to 400, contradicting FR-005. The repository query will simply return zero results for any non-matching string — no DB error occurs for a non-UUID `findFirst` call in Prisma.

**Alternatives considered**:
- `@IsUUID()` validation pipe on param: rejected — returns 400 for malformed IDs, contradicting FR-005 and the "indistinguishable" principle
- Custom pipe that returns null for invalid UUIDs: rejected — over-engineered; Prisma handles non-UUID strings gracefully

---

## 4. Response DTO Reuse

**Decision**: Reuse the existing `TenantContactResponseDto` from US 12.1 — no new DTO needed.

**Rationale**: The response shape for a single contact is identical whether returned by the create endpoint or the get-by-id endpoint. Reusing the DTO avoids duplication and keeps Swagger documentation consistent.

---

## 5. Existing Infrastructure Reused

All the following already exist and require no changes:
- `TenantContact` Prisma model and `tenant_contacts` table
- `TenantContact` domain entity
- `TenantContactRepository` interface and `TENANT_CONTACT_REPOSITORY` DI token
- `TenantContactResponseDto` — reused as-is
- `ClerkJwtGuard`, `@CurrentTenant()`, `@RequiresTenant()`, `tenantFilter()`
- Global `ValidationPipe` and `GlobalExceptionFilter`
