# Quickstart: Tenant-Safe Queries

**Feature**: 011 — Tenant-Safe Query Enforcement

This guide shows how to use the two shared infrastructure pieces from Feature 011 when building a new tenant-scoped business module (e.g. Property, Lease, Payment).

---

## Prerequisites

- Feature 009 complete: `IRequestContext` exists, `@CurrentTenant()` works
- Feature 010 complete: `@RequiresTenant()` guard enforces tenantId on routes
- Feature 011 complete: `tenantFilter` utility and `ITenantScopedRepository<T>` interface exist

---

## Step 1: Use `tenantFilter` in a Prisma Repository

```typescript
// apps/api/src/modules/properties/infrastructure/prisma-property.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { tenantFilter } from '@/common/utils/tenant-filter.util';
import { IPropertyRepository } from '../domain/property.repository.interface';
import { Property } from '../domain/property.entity';

@Injectable()
export class PrismaPropertyRepository implements IPropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string): Promise<Property[]> {
    return this.prisma.property.findMany({
      where: { ...tenantFilter(tenantId) },
    });
  }

  findById(id: string, tenantId: string): Promise<Property | null> {
    return this.prisma.property.findFirst({
      where: { id, ...tenantFilter(tenantId) },
    });
  }

  create(tenantId: string, data: CreatePropertyDto): Promise<Property> {
    return this.prisma.property.create({
      data: { ...data, tenantId },
    });
  }

  async update(id: string, tenantId: string, data: UpdatePropertyDto): Promise<Property | null> {
    const result = await this.prisma.property.updateMany({
      where: { id, ...tenantFilter(tenantId) },
      data,
    });
    if (result.count === 0) return null;
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.prisma.property.deleteMany({
      where: { id, ...tenantFilter(tenantId) },
    });
    return result.count > 0;
  }
}
```

---

## Step 2: Use Case Extracts `tenantId` from Context

```typescript
// apps/api/src/modules/properties/application/get-properties.use-case.ts
import { Injectable } from '@nestjs/common';
import { IPropertyRepository } from '../domain/property.repository.interface';
import { IRequestContext } from '@/common/types/request-context.type';

@Injectable()
export class GetPropertiesUseCase {
  constructor(private readonly propertyRepo: IPropertyRepository) {}

  execute(context: IRequestContext) {
    // Extract tenantId from context — do NOT pass full context to repository
    return this.propertyRepo.findMany(context.tenantId!);
  }
}
```

---

## Step 3: Controller Uses `@RequiresTenant()` + `@CurrentUser()`

```typescript
// apps/api/src/modules/properties/presentation/properties.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequiresTenant } from '@/common/decorators/requires-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IRequestContext } from '@/common/types/request-context.type';
import { GetPropertiesUseCase } from '../application/get-properties.use-case';

@ApiTags('properties')
@ApiBearerAuth()
@RequiresTenant()
@Controller('properties')
export class PropertiesController {
  constructor(private readonly getProperties: GetPropertiesUseCase) {}

  @Get()
  findAll(@CurrentUser() context: IRequestContext) {
    return this.getProperties.execute(context);
  }
}
```

---

## Key Rules to Remember

| Rule | What to do |
|------|-----------|
| Every tenant-scoped route | Add `@RequiresTenant()` to the controller or method |
| Every repository method | Call `tenantFilter(tenantId)` in the where clause |
| Update/delete by ID | Use `updateMany`/`deleteMany` with `{ id, ...tenantFilter(tenantId) }` |
| New Prisma model (business entity) | Add `tenantId String` + `@map("tenant_id")` + `@@index([tenantId])` |
| tenantId source | ALWAYS from `IRequestContext` — NEVER from request body/params/headers |

---

## What NOT to Do

```typescript
// ❌ Never query without tenantId
prisma.property.findMany()

// ❌ Never update by id alone
prisma.property.update({ where: { id }, data })

// ❌ Never accept tenantId from the request body
@Post() create(@Body() dto: { tenantId: string; name: string }) { ... }

// ❌ Never use Prisma directly in a use case
class GetPropertiesUseCase {
  constructor(private readonly prisma: PrismaClient) {} // WRONG
}
```
