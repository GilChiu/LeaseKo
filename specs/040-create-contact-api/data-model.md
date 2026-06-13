# Data Model: Create Renter Contact API

**Feature**: 040-create-contact-api
**Phase**: 1 — Design

---

## Prisma Schema Addition (`apps/api/prisma/schema.prisma`)

Add to the `Tenant` model's relations:
```prisma
contacts TenantContact[]
```

New model to append:

```prisma
model TenantContact {
  id        String    @id @default(uuid())
  tenantId  String    @map("tenant_id")
  firstName String    @map("first_name")
  lastName  String    @map("last_name")
  email     String
  phone     String?
  idNumber  String?   @map("id_number")
  notes     String?
  deletedAt DateTime? @map("deleted_at")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@map("tenant_contacts")
}
```

**Key constraints**:
- `@@unique([tenantId, email])` — database-level uniqueness per workspace. Email is stored lowercase to achieve case-insensitive uniqueness.
- `@@index([tenantId])` — required by constitution on every tenant-scoped table.
- `@@index([tenantId, deletedAt])` — optimises the common query pattern `WHERE tenant_id = ? AND deleted_at IS NULL`.
- `onDelete: Cascade` — deleting a Tenant (workspace) cascades to all its contacts.

---

## Domain Entity (`domain/entities/tenant-contact.entity.ts`)

Pure TypeScript interface — no NestJS, Prisma, or framework imports.

```typescript
export interface TenantContact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;           // always stored lowercase
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Repository Types (`application/types/tenant-contact-repository.types.ts`)

```typescript
export interface CreateTenantContactInput {
  tenantId: string;       // from verified JWT — never from request body
  firstName: string;
  lastName: string;
  email: string;          // normalized to lowercase before reaching the repository
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
}
```

---

## Repository Interface (`application/repositories/tenant-contact.repository.ts`)

```typescript
export const TENANT_CONTACT_REPOSITORY = Symbol('TENANT_CONTACT_REPOSITORY');

export interface TenantContactRepository {
  /**
   * Creates a new TenantContact. Throws ConflictException if a contact
   * with the same (tenantId, email) combination already exists.
   */
  create(input: CreateTenantContactInput): Promise<TenantContact>;

  /**
   * Finds an active contact by email within a workspace.
   * Returns null when no active contact exists.
   * Used by the use case to check uniqueness before creating.
   */
  findByEmail(tenantId: string, email: string): Promise<TenantContact | null>;
}
```

---

## Use Case (`application/use-cases/create-tenant-contact.use-case.ts`)

```typescript
export interface CreateTenantContactUseCaseInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}
```

**Business logic** (the only logic allowed outside the domain entity):
1. Normalize `email` to `email.toLowerCase().trim()`
2. Call `repository.findByEmail(tenantId, normalizedEmail)`
3. If result is not null → throw `ConflictException('A contact with this email already exists in this workspace.')`
4. Call `repository.create({ tenantId, firstName, lastName, email: normalizedEmail, phone, idNumber, notes })`
5. Return created `TenantContact`

---

## DTO: Request (`presentation/dto/create-tenant-contact.dto.ts`)

```typescript
class CreateTenantContactDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName: string;

  @IsEmail() @MaxLength(255)
  email: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(50)
  idNumber?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}
```

**Security invariants**:
- `tenantId` is **absent** from the DTO — the global `ValidationPipe` with `forbidNonWhitelisted: true` will reject any request body that includes a `tenantId` field.

---

## DTO: Response (`presentation/dto/tenant-contact-response.dto.ts`)

```typescript
class TenantContactResponseDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(contact: TenantContact): TenantContactResponseDto;
}
```

Note: `deletedAt` is excluded from the response (consistent with `PropertyResponseDto` pattern).

---

## Controller (`presentation/contacts.controller.ts`)

```
@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
class ContactsController {
  @Post()
  @HttpCode(201)
  @RequiresTenant()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateTenantContactDto)
    → returns TenantContactResponseDto
}
```

---

## Validation Rules Summary

| Field       | Rule                        | Error class        |
| ----------- | --------------------------- | ------------------ |
| `firstName` | non-empty, max 100          | `BadRequestException` (400) |
| `lastName`  | non-empty, max 100          | `BadRequestException` (400) |
| `email`     | valid email, max 255        | `BadRequestException` (400) |
| `phone`     | optional, max 30            | `BadRequestException` (400) |
| `idNumber`  | optional, max 50            | `BadRequestException` (400) |
| `notes`     | optional, max 1000          | `BadRequestException` (400) |
| email duplicate | unique per workspace    | `ConflictException` (409) |
