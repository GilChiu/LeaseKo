# Quickstart: Implement Create Renter Contact API

**Feature**: 040-create-contact-api | **Endpoint**: `POST /api/v1/contacts`

This guide walks through implementing the feature from Prisma schema to E2E test, following the properties/units module pattern exactly.

---

## Prerequisites

- Branch: `sprint/003`
- Database running: `pnpm db:up`
- Existing infrastructure reused: `ClerkJwtGuard`, `@CurrentTenant()`, `@RequiresTenant()`, `PrismaService`, `tenantFilter()`

---

## Step 1 — Prisma Schema

Edit `apps/api/prisma/schema.prisma`.

**Add relation to Tenant model**:
```prisma
model Tenant {
  // ... existing fields ...
  contacts    TenantContact[]
}
```

**Append new model**:
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

Then run the migration:
```powershell
pnpm db:migrate
# When prompted for a name: create_tenant_contacts
```

---

## Step 2 — Domain Entity

Create `apps/api/src/modules/contacts/domain/entities/tenant-contact.entity.ts`:

```typescript
export interface TenantContact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

No imports. No decorators.

---

## Step 3 — Repository Types

Create `apps/api/src/modules/contacts/application/types/tenant-contact-repository.types.ts`:

```typescript
export interface CreateTenantContactInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
}
```

---

## Step 4 — Repository Interface

Create `apps/api/src/modules/contacts/application/repositories/tenant-contact.repository.ts`:

```typescript
import { TenantContact } from '../../domain/entities/tenant-contact.entity';
import { CreateTenantContactInput } from '../types/tenant-contact-repository.types';

export const TENANT_CONTACT_REPOSITORY = Symbol('TENANT_CONTACT_REPOSITORY');

export interface TenantContactRepository {
  create(input: CreateTenantContactInput): Promise<TenantContact>;
  findByEmail(tenantId: string, email: string): Promise<TenantContact | null>;
}
```

---

## Step 5 — Use Case

Create `apps/api/src/modules/contacts/application/use-cases/create-tenant-contact.use-case.ts`:

```typescript
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { TENANT_CONTACT_REPOSITORY, TenantContactRepository } from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

export interface CreateTenantContactInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}

@Injectable()
export class CreateTenantContactUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly contacts: TenantContactRepository,
  ) {}

  async execute(input: CreateTenantContactInput): Promise<TenantContact> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const existing = await this.contacts.findByEmail(input.tenantId, normalizedEmail);
    if (existing) {
      throw new ConflictException('A contact with this email already exists in this workspace.');
    }

    return this.contacts.create({
      tenantId: input.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: input.phone ?? null,
      idNumber: input.idNumber ?? null,
      notes: input.notes ?? null,
    });
  }
}
```

---

## Step 6 — Prisma Repository Implementation

Create `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { TenantContactRepository } from '../../application/repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';
import { CreateTenantContactInput } from '../../application/types/tenant-contact-repository.types';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { TenantContact as PrismaTenantContact } from '@prisma/client';

@Injectable()
export class PrismaTenantContactRepository implements TenantContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTenantContactInput): Promise<TenantContact> {
    const record = await this.prisma.tenantContact.create({
      data: {
        tenantId: input.tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        idNumber: input.idNumber,
        notes: input.notes,
      },
    });
    return this.toEntity(record);
  }

  async findByEmail(tenantId: string, email: string): Promise<TenantContact | null> {
    const record = await this.prisma.tenantContact.findFirst({
      where: {
        ...tenantFilter(tenantId),
        email,
        deletedAt: null,
      },
    });
    return record ? this.toEntity(record) : null;
  }

  private toEntity(record: PrismaTenantContact): TenantContact {
    return {
      id: record.id,
      tenantId: record.tenantId,
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phone: record.phone,
      idNumber: record.idNumber,
      notes: record.notes,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
```

---

## Step 7 — Request DTO

Create `apps/api/src/modules/contacts/presentation/dto/create-tenant-contact.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTenantContactDto {
  @ApiProperty({ example: 'Alice', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Smith', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'alice@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+63 912 345 6789', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'P-12345678A', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  idNumber?: string;

  @ApiPropertyOptional({ example: 'Prefers move-in after August.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
```

---

## Step 8 — Response DTO

Create `apps/api/src/modules/contacts/presentation/dto/tenant-contact-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

export class TenantContactResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) idNumber!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static fromDomain(contact: TenantContact): TenantContactResponseDto {
    const dto = new TenantContactResponseDto();
    dto.id = contact.id;
    dto.tenantId = contact.tenantId;
    dto.firstName = contact.firstName;
    dto.lastName = contact.lastName;
    dto.email = contact.email;
    dto.phone = contact.phone;
    dto.idNumber = contact.idNumber;
    dto.notes = contact.notes;
    dto.createdAt = contact.createdAt;
    dto.updatedAt = contact.updatedAt;
    return dto;
  }
}
```

---

## Step 9 — Controller

Create `apps/api/src/modules/contacts/presentation/contacts.controller.ts`:

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { CreateTenantContactUseCase } from '../application/use-cases/create-tenant-contact.use-case';
import { CreateTenantContactDto } from './dto/create-tenant-contact.dto';
import { TenantContactResponseDto } from './dto/tenant-contact-response.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly createTenantContact: CreateTenantContactUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Create a renter contact' })
  @ApiResponse({ status: 201, type: TenantContactResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No active workspace' })
  @ApiResponse({ status: 409, description: 'Email already exists in workspace' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateTenantContactDto,
  ): Promise<TenantContactResponseDto> {
    const contact = await this.createTenantContact.execute({
      tenantId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      idNumber: dto.idNumber,
      notes: dto.notes,
    });
    return TenantContactResponseDto.fromDomain(contact);
  }
}
```

---

## Step 10 — Module Registration

Create `apps/api/src/modules/contacts/contacts.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TENANT_CONTACT_REPOSITORY } from './application/repositories/tenant-contact.repository';
import { CreateTenantContactUseCase } from './application/use-cases/create-tenant-contact.use-case';
import { PrismaTenantContactRepository } from './infrastructure/repositories/prisma-tenant-contact.repository';
import { ContactsController } from './presentation/contacts.controller';

@Module({
  controllers: [ContactsController],
  providers: [
    {
      provide: TENANT_CONTACT_REPOSITORY,
      useClass: PrismaTenantContactRepository,
    },
    CreateTenantContactUseCase,
  ],
  exports: [TENANT_CONTACT_REPOSITORY],
})
export class ContactsModule {}
```

**Register in `apps/api/src/app.module.ts`** — import and add `ContactsModule` to the `imports` array.

---

## Step 11 — Tests

### Unit Test (`create-tenant-contact.use-case.spec.ts`)

Mock `TENANT_CONTACT_REPOSITORY`, assert:
- `findByEmail` called with normalized email
- `ConflictException` thrown when `findByEmail` returns a contact
- `create` called with lowercased email when `findByEmail` returns null

### Integration Test (`prisma-tenant-contact.repository.spec.ts`)

Use real `PrismaService` + test database:
- `create` persists a contact and returns the entity
- `findByEmail` returns `null` for unknown emails
- `findByEmail` returns the contact for a known email (case-exact match since email is stored lowercase)

### E2E Test (`contacts.e2e.spec.ts`)

Use the test Clerk JWT utility + real database:
- `POST /contacts` with valid body → 201 + response matches input
- `POST /contacts` with missing fields → 400 with all errors
- `POST /contacts` with duplicate email (same case) → 409
- `POST /contacts` with duplicate email (different case) → 409
- `POST /contacts` without auth → 401
- `POST /contacts` with auth but no org → 403
- `POST /contacts` same email in different workspace → 201 (cross-workspace allowed)

---

## Verification Checklist

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```

All four must pass before updating `BACKLOG.md`.
