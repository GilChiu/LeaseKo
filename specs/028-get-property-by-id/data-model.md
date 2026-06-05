# Data Model: Get Property by ID

**Feature**: 028-get-property-by-id
**Date**: 2026-06-04

---

## No Schema Changes

No new Prisma models, columns, or migrations are required.

---

## Existing Infrastructure Used

### `PropertyRepository.findById` (already exists)

```typescript
findById(id: string, tenantId: string): Promise<Property | null>
```

Returns the full `Property` entity if `id` matches a non-deleted record belonging to `tenantId`. Returns `null` in all other cases (record doesn't exist, belongs to a different tenant, or is soft-deleted). These cases are intentionally indistinguishable.

### `PropertyResponseDto` (already exists, reused)

The success response shape is identical to the property items returned by `GET /properties`. `PropertyResponseDto.fromDomain(property)` is used directly.

---

## New Application Type

### `GetPropertyByIdInput` (new — use case input, inline in use case file)

```typescript
interface GetPropertyByIdInput {
  id: string;       // from URL path parameter
  tenantId: string; // from verified JWT context only — never from path/query/body
}
```

No separate types file needed — the input interface is small enough to be inline.

---

## Error Behaviour

| Condition | Repository returns | Use case throws | HTTP status |
|---|---|---|---|
| Property found, correct tenant | `Property` entity | — (returns DTO) | 200 OK |
| Property not found anywhere | `null` | `NotFoundException` | 404 Not Found |
| Property found, wrong tenant | `null` | `NotFoundException` | 404 Not Found |
| Soft-deleted property | `null` | `NotFoundException` | 404 Not Found |

All `null` cases produce identical 404 responses — no information about other tenants is leaked.
