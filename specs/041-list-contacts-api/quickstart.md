# Quickstart: Implement List Renter Contacts API

**Feature**: 041-list-contacts-api | **Endpoint**: `GET /api/v1/contacts`

All changes are additive to the existing `contacts` module. No migration needed.

---

## Step 1 — Add Types to tenant-contact-repository.types.ts

Append to `apps/api/src/modules/contacts/application/types/tenant-contact-repository.types.ts`:

```typescript
export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
}

export interface PagedTenantContacts {
  items: TenantContact[];
  total: number;
}
```

Add the `TenantContact` import at the top if not already present.

---

## Step 2 — Add findPagedByTenant to Repository Interface

In `apps/api/src/modules/contacts/application/repositories/tenant-contact.repository.ts`, add to `TenantContactRepository`:

```typescript
findPagedByTenant(
  tenantId: string,
  options: FindPagedByTenantOptions,
): Promise<PagedTenantContacts>;
```

Also import `FindPagedByTenantOptions` and `PagedTenantContacts` from the types file.

---

## Step 3 — Implement findPagedByTenant in Prisma Repository

In `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.ts`, add:

```typescript
async findPagedByTenant(
  tenantId: string,
  { page, limit }: FindPagedByTenantOptions,
): Promise<PagedTenantContacts> {
  const skip = (page - 1) * limit;
  const where = { ...tenantFilter(tenantId), deletedAt: null };

  const [records, total] = await this.prisma.$transaction([
    this.prisma.tenantContact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.tenantContact.count({ where }),
  ]);

  return { items: records.map((r) => this.toEntity(r)), total };
}
```

---

## Step 4 — Create ListTenantContactsUseCase

Create `apps/api/src/modules/contacts/application/use-cases/list-tenant-contacts.use-case.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { TENANT_CONTACT_REPOSITORY, TenantContactRepository } from '../repositories/tenant-contact.repository';
import { PagedTenantContacts } from '../types/tenant-contact-repository.types';

export interface ListTenantContactsUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
}

@Injectable()
export class ListTenantContactsUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly contacts: TenantContactRepository,
  ) {}

  async execute(input: ListTenantContactsUseCaseInput): Promise<PagedTenantContacts> {
    return this.contacts.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
    });
  }
}
```

---

## Step 5 — Create Query DTO

Create `apps/api/src/modules/contacts/presentation/dto/list-contacts-query.dto.ts`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListContactsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

---

## Step 6 — Create Paginated Response DTO

Create `apps/api/src/modules/contacts/presentation/dto/paginated-tenant-contacts-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { PagedTenantContacts } from '../../application/types/tenant-contact-repository.types';
import { TenantContactResponseDto } from './tenant-contact-response.dto';

export class PaginatedTenantContactsResponseDto {
  @ApiProperty({ type: [TenantContactResponseDto] })
  items!: TenantContactResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  static fromDomain(
    result: PagedTenantContacts,
    page: number,
    limit: number,
  ): PaginatedTenantContactsResponseDto {
    const dto = new PaginatedTenantContactsResponseDto();
    dto.items = result.items.map((c) => TenantContactResponseDto.fromDomain(c));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
```

---

## Step 7 — Add GET / to ContactsController

In `apps/api/src/modules/contacts/presentation/contacts.controller.ts`, add the `list` method and its imports:

```typescript
@Get()
@HttpCode(HttpStatus.OK)
@RequiresTenant()
@ApiOperation({ summary: 'List all renter contacts for the current workspace' })
@ApiOkResponse({ description: 'Paginated contact list.', type: PaginatedTenantContactsResponseDto })
@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid query parameters.' })
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid Bearer token.' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'No active workspace.' })
@ApiInternalServerErrorResponse({ type: ErrorResponseDto, description: 'Unexpected server error.' })
async list(
  @CurrentTenant() tenantId: string,
  @Query() query: ListContactsQueryDto,
): Promise<PaginatedTenantContactsResponseDto> {
  const result = await this.listTenantContacts.execute({
    tenantId,
    page: query.page,
    limit: query.limit,
  });
  return PaginatedTenantContactsResponseDto.fromDomain(result, query.page, query.limit);
}
```

Also inject `ListTenantContactsUseCase` in the constructor.

---

## Step 8 — Register Use Case in ContactsModule

In `apps/api/src/modules/contacts/contacts.module.ts`, add `ListTenantContactsUseCase` to providers.

---

## Verification Checklist

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```

All four must pass before updating `BACKLOG.md`.
