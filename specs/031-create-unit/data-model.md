# Data Model: Create Unit (Feature 031)

## New: `Unit` Domain Entity

**File**: `apps/api/src/modules/units/domain/entities/unit.entity.ts`

```typescript
export type UnitStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

export interface Unit {
  id: string;
  tenantId: string;
  propertyId: string;
  unitNumber: string;
  status: UnitStatus;
  floorArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthlyRent: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Rules**:
- MUST NOT import from `@prisma/client`, NestJS, or any infrastructure package
- `monthlyRent` is typed as `number | null` in the domain — precision lives in the DB schema
- `status` uses a string union (not a TypeScript `enum`) to avoid reverse-mapping complexity
- `deletedAt` is intentionally absent — units do not have a soft-delete workflow in this feature

---

## New: `UnitStatus` Prisma Enum

Added to `apps/api/prisma/schema.prisma` before the `Unit` model:

```prisma
enum UnitStatus {
  AVAILABLE
  OCCUPIED
  MAINTENANCE
}
```

---

## New: `Unit` Prisma Model

Added to `apps/api/prisma/schema.prisma` in the tenant-scoped business models section:

```prisma
model Unit {
  id          String     @id @default(uuid())
  tenantId    String     @map("tenant_id")
  propertyId  String     @map("property_id")
  unitNumber  String     @map("unit_number")
  status      UnitStatus @default(AVAILABLE)
  floorArea   Float?     @map("floor_area")
  bedrooms    Int?
  bathrooms   Float?
  monthlyRent Decimal?   @map("monthly_rent") @db.Decimal(12, 2)
  description String?
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([propertyId, unitNumber])
  @@index([tenantId])
  @@index([propertyId])
  @@map("units")
}
```

**Constraints**:
- `@@unique([propertyId, unitNumber])` — enforces unit number uniqueness per property at DB level
- `@@index([tenantId])` — required by constitution; all tenant-scoped tables must have this index
- `@@index([propertyId])` — supports future `findManyByProperty` queries
- `onDelete: Cascade` on both FK relations — orphaned units are removed if a property or tenant is deleted

---

## Updated: `Property` Prisma Model (relation back-reference)

Add the `units` back-reference to the existing `Property` model:

```prisma
// In model Property — add one line:
units Unit[]
```

Full updated model:

```prisma
model Property {
  id           String    @id @default(uuid())
  tenantId     String    @map("tenant_id")
  name         String
  addressLine1 String    @map("address_line_1")
  addressLine2 String?   @map("address_line_2")
  city         String
  state        String?
  postalCode   String?   @map("postal_code")
  country      String
  propertyType String    @map("property_type")
  description  String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  units  Unit[]

  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@map("properties")
}
```

**Note**: Adding `units Unit[]` to `Property` is a Prisma schema requirement (both sides of a relation must be declared). It does not change the generated SQL for the `properties` table.

Also add `units Unit[]` back-reference to the `Tenant` model:

```prisma
// In model Tenant — add one line:
units  Unit[]
```

---

## Migration

After schema changes, run:

```powershell
pnpm db:migrate
```

Which executes `prisma migrate dev`. The generated migration will:

1. Create the `unit_status` PostgreSQL ENUM type
2. Create the `units` table with all columns, constraints, and indexes
3. Add a foreign key from `units.property_id` → `properties.id` (CASCADE)
4. Add a foreign key from `units.tenant_id` → `tenants.id` (CASCADE)

---

## New: `CreateUnitInput` (application types)

**File**: `apps/api/src/modules/units/application/types/unit-repository.types.ts`

```typescript
export interface CreateUnitInput {
  tenantId: string;
  propertyId: string;
  unitNumber: string;
  floorArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  monthlyRent?: number | null;
  description?: string | null;
}
```

`status` is absent — the repository always creates units with `AVAILABLE` status. The DTO/use-case layer never sets status.

---

## New: `UnitRepository` Interface

**File**: `apps/api/src/modules/units/application/repositories/unit.repository.ts`

```typescript
export const UNIT_REPOSITORY = Symbol('UNIT_REPOSITORY');

export interface UnitRepository {
  create(input: CreateUnitInput): Promise<Unit>;
}
```

Minimal interface for this feature. Future methods (`findByPropertyId`, `findById`, etc.) added when needed.

---

## Validation Rules Summary

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `unitNumber` | string | Yes | Non-empty, max 50 chars |
| `floorArea` | number | No | Positive (> 0) if provided |
| `bedrooms` | integer | No | Min 1 if provided |
| `bathrooms` | number | No | Positive (> 0) if provided |
| `monthlyRent` | number | No | Positive (> 0) if provided |
| `description` | string | No | Max 1000 chars if provided |

Validation enforced by `class-validator` decorators in `CreateUnitDto`. DB-level constraint for `unitNumber` uniqueness is enforced by `@@unique([propertyId, unitNumber])`.

---

## State Transitions

`UnitStatus` transitions are out of scope for this feature. The only valid initial state is `AVAILABLE`. Future features (assign lease, mark maintenance) will define the transition rules.

```
[creation] → AVAILABLE
```
