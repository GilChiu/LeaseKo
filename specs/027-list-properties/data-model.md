# Data Model: List Properties

**Feature**: 027-list-properties
**Date**: 2026-06-01

---

## No Schema Changes

No new Prisma models or migrations are required. This feature is purely an application-layer addition on top of the existing `Property` schema.

---

## Existing `Property` Model (reference)

```
Property
├── id            String   @id @default(cuid())
├── tenantId      String   (indexed, FK to Tenant)
├── name          String
├── addressLine1  String
├── addressLine2  String?
├── city          String
├── state         String?
├── postalCode    String?
├── country       String
├── propertyType  String
├── description   String?
├── createdAt     DateTime @default(now())
├── updatedAt     DateTime @updatedAt
└── deletedAt     DateTime? (soft-delete, nullable)
```

**Tenant isolation**: `tenantId` is present, indexed, and enforced by `tenantFilter()` in every repository query. Soft-deleted records (`deletedAt IS NOT NULL`) are excluded from all read methods.

---

## New Application Types

### `FindPagedByTenantOptions` (new — in `property-repository.types.ts`)

```typescript
export interface FindPagedByTenantOptions {
  page: number;   // 1-based, min 1
  limit: number;  // records per page, min 1, max 100
}
```

### `PagedProperties` (new — in `property-repository.types.ts`)

```typescript
export interface PagedProperties {
  items: Property[];
  total: number;
}
```

### `ListPropertiesInput` (new — use case input)

```typescript
export interface ListPropertiesInput {
  tenantId: string;  // from verified JWT context only
  page: number;      // default 1
  limit: number;     // default 20
}
```

---

## DTO Layer

### `ListPropertiesQueryDto` (new — presentation layer)

Query parameters accepted by GET /properties:

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| page | number | No | 1 | min: 1, integer |
| limit | number | No | 20 | min: 1, max: 100, integer |

### `PaginatedPropertiesResponseDto` (new — presentation layer)

Response envelope for GET /properties:

| Field | Type | Description |
|-------|------|-------------|
| items | PropertyResponseDto[] | Properties for this page |
| total | number | Total active properties for this tenant |
| page | number | Current page (echoed from request) |
| limit | number | Page size (echoed from request) |
| hasMore | boolean | `page * limit < total` |
