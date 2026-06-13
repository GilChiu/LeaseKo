# Research: Update Renter Contact API

**Feature**: 043-update-contact-api | **Date**: 2026-06-05

---

## 1. Partial Update DTO — `@IsOptional` + `@IsNotEmpty`

**Decision**: `UpdateTenantContactDto` uses `@IsOptional()` on every field so omitting them passes validation, combined with `@IsNotEmpty()` / `@IsEmail()` on fields that have format constraints, so if a field IS supplied it must still be valid. Empty body is caught by checking `Object.keys(dto).length === 0` in the use case (or a custom class-validator decorator).

**Rationale**: Matches the `UpdatePropertyDto` pattern used in the properties module. `@IsOptional()` makes the field skip validation if absent. When present, `@IsNotEmpty()` still fires. This is the standard NestJS pattern for PATCH DTOs.

**Alternatives considered**:
- Separate DTO for each field combination: rejected — combinatorial explosion, impractical
- `@ValidateIf(() => value !== undefined)`: rejected — `@IsOptional()` is cleaner and idiomatic

---

## 2. Empty Body Rejection

**Decision**: Checked in the use case — if all fields in the input are `undefined`, throw `BadRequestException('At least one field must be provided.')`.

**Rationale**: The global `ValidationPipe` with `@IsOptional()` on all fields would pass an empty body `{}` as valid. The "at least one field" requirement is a business rule that belongs in the use case. This mirrors the pattern in `UpdatePropertyUseCase` which checks `Object.values(dto).filter(v => v !== undefined).length === 0`.

---

## 3. Email Uniqueness — Self-Exclusion

**Decision**: The use case normalises the new email to lowercase. Then it calls `findByEmail(tenantId, normalizedEmail)`. If it finds a contact and that contact's `id` differs from the contact being updated → `ConflictException`. If it finds the same contact or finds nothing → proceed with the update.

**Rationale**: The same `findByEmail` method from US 12.1 already returns active-only contacts. The only addition is comparing the found contact's `id` to `input.id` to implement self-exclusion. This avoids adding a new repository method.

**Alternatives considered**:
- New `findByEmailExcluding(tenantId, email, excludeId)` repository method: considered — cleaner but adds surface area for a simple check that can be done in the use case
- DB unique constraint on `(tenantId, email)` — already exists from US 12.1; Prisma P2002 on update is caught as fallback

---

## 4. Repository Update Method — `update(id, tenantId, data)`

**Decision**: `PrismaTenantContactRepository.update(id, tenantId, data)` uses `prisma.tenantContact.update({ where: { id, tenantId }, data })`. Returns `null` if Prisma throws P2025 (record not found for compound WHERE — covers both missing and cross-tenant cases). Returns null for archived contacts via an additional `deletedAt: null` guard in a pre-fetch `findById` call inside the use case.

**Rationale**: The compound `WHERE { id, tenantId }` in a `prisma.update` is the same pattern as `PrismaPropertyRepository.update`. P2025 on update means the record doesn't exist or doesn't match the tenant — both cases return null, producing identical 404. The archived check is done by the use case calling `findById` first (which already filters `deletedAt: null`); if null, it throws `NotFoundException` before attempting the update.

**Flow in use case**:
1. `findById(id, tenantId)` → null → throw `NotFoundException`
2. If email provided: `findByEmail(tenantId, normalizedEmail)` → found & different id → throw `ConflictException`
3. `update(id, tenantId, patchData)` → returns updated entity

---

## 5. Existing Infrastructure Reused

- `TenantContact` entity, `TENANT_CONTACT_REPOSITORY`, `tenantFilter()`
- `findById` and `findByEmail` repository methods (from US 12.1–12.3)
- `TenantContactResponseDto` (reused as-is)
- `ClerkJwtGuard`, `@CurrentTenant()`, `@RequiresTenant()`
- Global `ValidationPipe` (whitelist + transform)
