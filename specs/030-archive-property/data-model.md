# Data Model: Archive Property

**Feature**: 030-archive-property
**Date**: 2026-06-04

---

## No Schema Changes

No new Prisma models, columns, or migrations are required.

---

## Existing Infrastructure Used

### `PropertyRepository.softDelete` (already exists)

```typescript
softDelete(id: string, tenantId: string): Promise<boolean>
```

Sets `deletedAt = new Date()` on the matching record. Returns `true` on success (including re-archiving an already-archived property). Returns `false` when the record does not exist or belongs to a different tenant (Prisma P2025).

### `deletedAt` field on `Property` (already exists)

```
Property.deletedAt: DateTime?  (nullable, set on archive)
```

All read operations (`findManyByTenant`, `findPagedByTenant`, `findById`) already filter `deletedAt: null`. Archived properties are already invisible to all read operations — no changes needed.

---

## Property State Transitions

```
Active (deletedAt = null)
    │
    │  archive (DELETE /properties/:id)
    ▼
Archived (deletedAt = timestamp)
    │
    │  re-archive (DELETE /properties/:id again) → idempotent success, deletedAt refreshed
    ▼
Still Archived (deletedAt = new timestamp)

Active  ←──────  Restore (OUT OF SCOPE — deferred to future feature)
```

---

## Error Behaviour

| Condition | `softDelete()` returns | Use case throws | HTTP status |
|---|---|---|---|
| Active property, correct tenant | `true` | — (returns void) | 204 No Content |
| Already-archived property, correct tenant | `true` | — (returns void) | 204 No Content |
| Property not found | `false` | `NotFoundException` | 404 Not Found |
| Property found, wrong tenant | `false` | `NotFoundException` | 404 Not Found |

The `true` cases are indistinguishable at the HTTP level. The `false` cases are indistinguishable at the HTTP level.

---

## Known Pending Concern — Unit Cascade (Deferred to Epic 9)

Archiving a property does not affect its associated units. Units remain active in the database. The Unit Management epic must address:
- Whether units under archived properties should be hidden from unit list queries
- Whether creating a unit under an archived property should be rejected
- Whether retrieving the unit list for an archived property's ID should return 404 or empty
