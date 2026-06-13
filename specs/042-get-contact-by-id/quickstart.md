# Quickstart: Implement Get Renter Contact by ID

**Feature**: 042-get-contact-by-id | **Endpoint**: `GET /api/v1/contacts/:id`

All changes are additive to the existing `contacts` module. No migration, no new DTOs.

---

## Step 1 — Add findById to Repository Interface

In `apps/api/src/modules/contacts/application/repositories/tenant-contact.repository.ts`, add:

```typescript
findById(id: string, tenantId: string): Promise<TenantContact | null>;
```

---

## Step 2 — Implement findById in Prisma Repository

In `apps/api/src/modules/contacts/infrastructure/repositories/prisma-tenant-contact.repository.ts`, add:

```typescript
async findById(id: string, tenantId: string): Promise<TenantContact | null> {
  const record = await this.prisma.tenantContact.findFirst({
    where: {
      id,
      ...tenantFilter(tenantId),
      deletedAt: null,
    },
  });
  return record ? this.toEntity(record) : null;
}
```

---

## Step 3 — Create GetTenantContactByIdUseCase

Create `apps/api/src/modules/contacts/application/use-cases/get-tenant-contact-by-id.use-case.ts`:

```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TENANT_CONTACT_REPOSITORY, TenantContactRepository } from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

export interface GetTenantContactByIdUseCaseInput {
  id: string;
  tenantId: string;
}

@Injectable()
export class GetTenantContactByIdUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly contacts: TenantContactRepository,
  ) {}

  async execute(input: GetTenantContactByIdUseCaseInput): Promise<TenantContact> {
    const contact = await this.contacts.findById(input.id, input.tenantId);
    if (!contact) {
      throw new NotFoundException('Contact not found.');
    }
    return contact;
  }
}
```

---

## Step 4 — Add GET /:id to ContactsController

In `contacts.controller.ts`, add to imports: `Get`, `Param`, `NotFoundException`, `ApiNotFoundResponse`, `ApiParam`, `GetTenantContactByIdUseCase`.

Add method:

```typescript
@Get(':id')
@HttpCode(HttpStatus.OK)
@RequiresTenant()
@ApiOperation({ summary: 'Get a renter contact by ID' })
@ApiParam({ name: 'id', description: 'Contact unique identifier' })
@ApiOkResponse({ description: 'Contact found.', type: TenantContactResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Contact not found or not accessible.' })
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid Bearer token.' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'No active workspace.' })
@ApiInternalServerErrorResponse({ type: ErrorResponseDto, description: 'Unexpected server error.' })
async findOne(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
): Promise<TenantContactResponseDto> {
  const contact = await this.getTenantContactById.execute({ id, tenantId });
  return TenantContactResponseDto.fromDomain(contact);
}
```

Inject `GetTenantContactByIdUseCase` in the constructor as `getTenantContactById`.

---

## Step 5 — Register in ContactsModule

Add `GetTenantContactByIdUseCase` to providers in `contacts.module.ts`.

---

## Verification Checklist

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @leaseKo/api test
```
