# Research: Archive Property

**Feature**: 030-archive-property
**Date**: 2026-06-04

---

## Decision 1: No New Repository Method Required

**Decision**: Use the existing `softDelete(id: string, tenantId: string): Promise<boolean>` on `PropertyRepository`.

**Rationale**: Already defined in the interface and fully implemented in `PrismaPropertyRepository`. It executes `prisma.property.update({ where: { id, tenantId }, data: { deletedAt: new Date() } })`. Returns `true` on success, catches Prisma P2025 and returns `false` for not-found or wrong-tenant. Zero new infrastructure.

---

## Decision 2: Idempotent Re-Archive Works by Construction

**Decision**: No special handling is required for already-archived properties — the existing `softDelete` implementation is already idempotent.

**Rationale**: The Prisma `update` in `softDelete` uses `WHERE { id, tenantId }` with **no `deletedAt` filter**. If the property is already archived (deletedAt is set), the record still matches the WHERE clause → Prisma updates it again (resetting the timestamp) → returns `true`. From the caller's perspective, the operation succeeded. This satisfies FR-008 and US3 without any additional code.

**Note**: The `deletedAt` timestamp is reset on re-archive (idempotent success, but timestamp updates). This is acceptable — the system guarantees success, not timestamp immutability.

---

## Decision 3: NotFoundException for Both Not-Found and Cross-Tenant

**Decision**: When `softDelete` returns `false`, the use case throws `NotFoundException('Property not found.')`.

**Rationale**: `softDelete` returns `false` for Prisma P2025, which covers both "record doesn't exist" and "record belongs to different tenant". Both cases produce identical `NotFoundException` (HTTP 404). FR-006 and FR-007 are satisfied by construction — the merged response is indistinguishable.

---

## Decision 4: 204 No Content — No Response DTO

**Decision**: The archive endpoint returns HTTP 204 with no body. No response DTO needed.

**Rationale**: RFC 9110 standard for successful resource deletion. No information needs to be returned — the client already knows the ID it archived. This is also the simplest possible contract.

**Implementation note**: In NestJS, return `void` (or `undefined`) from the handler and apply `@HttpCode(HttpStatus.NO_CONTENT)`.

---

## Decision 5: No Request Body

**Decision**: No request body is accepted or validated for this endpoint.

**Rationale**: The operation is fully specified by the URL path parameter (`:id`) and the authenticated tenant context. No DTO is needed. The global `ValidationPipe` has nothing to validate.

---

## Decision 6: No Migration

**Decision**: No Prisma migration required.

**Rationale**: `deletedAt` already exists on the `Property` model. All read operations already filter `deletedAt: null`. The archive state is fully supported by the existing schema.

---

## Deferred Scope Reminder (from spec)

The unit cascade behaviour (whether archiving a property should also archive/hide its units) is explicitly deferred to Epic 9 (Unit Management). The plan's Complexity Tracking section must note this as a known pending concern.
