# Data Model: Property Domain & Repository Layer

**Feature**: 024-property-repository-layer
**Phase**: 1 — Design
**Date**: 2026-05-09

---

## Overview

This document describes the domain entity, repository interface, input types, and infrastructure implementation for Property data access. All design decisions follow the existing `users` module pattern established in Sprint 1.

---

## Domain Entity: `Property`

**File**: `apps/api/src/modules/properties/domain/entities/property.entity.ts`

```typescript
/**
 * Property — core domain entity for the Properties bounded context.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import from @prisma/client or PrismaService.
 * - MUST NOT import NestJS decorators.
 * - MUST NOT depend on HTTP request objects.
 * - MUST NOT contain persistence logic.
 *
 * @see apps/api/src/modules/properties/application/repositories/property.repository.ts
 * @see docs/data-layer.md
 */
export interface Property {
  id: string;
  tenantId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  propertyType: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

**Rules**: No Prisma import. No NestJS decorator. No HTTP concern. Pure TypeScript.

---

## Repository Interface & Token

**File**: `apps/api/src/modules/properties/application/repositories/property.repository.ts`

```typescript
import { Property } from '../../domain/entities/property.entity';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
} from '../types/property-repository.types';

/**
 * PropertyRepository — application-layer interface for Property data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This interface MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via PROPERTY_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaService or PrismaPropertyRepository directly.
 *
 * Tenant-safety rules:
 * - Every read and mutation method requires tenantId.
 * - No method returns or modifies a Property without confirming tenant ownership.
 * - tenantId is supplied by application layer (use cases) from verified request context —
 *   NEVER from body/query/header.
 *
 * @see apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts
 * @see docs/tenant-isolation.md
 */
export const PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY');

export interface PropertyRepository {
  /**
   * Create a new Property record linked to the given tenant.
   * tenantId is taken from input — it MUST come from verified request context,
   * not from any client-supplied payload.
   */
  create(input: CreatePropertyInput): Promise<Property>;

  /**
   * Return all active (non-deleted) Properties belonging to a tenant.
   * Records with deletedAt set are excluded automatically.
   */
  findManyByTenant(tenantId: string): Promise<Property[]>;

  /**
   * Find a single active Property by its ID, scoped to a tenant.
   * Returns null if the record does not exist, belongs to a different tenant,
   * or has been soft-deleted. These cases are intentionally indistinguishable.
   */
  findById(id: string, tenantId: string): Promise<Property | null>;

  /**
   * Update a Property's mutable fields, scoped to a tenant.
   * Returns null if the record does not exist or belongs to a different tenant.
   * tenantId MUST NOT be mutated.
   */
  update(
    id: string,
    tenantId: string,
    input: UpdatePropertyInput,
  ): Promise<Property | null>;

  /**
   * Soft-delete a Property by setting deletedAt to the current timestamp.
   * Returns true if the record was found and archived.
   * Returns false if no matching record exists for the given id + tenantId.
   */
  softDelete(id: string, tenantId: string): Promise<boolean>;
}
```

**Note**: `update` and `softDelete` are included in the interface for completeness (future use cases depend on them). The `PrismaPropertyRepository` implementation for this task implements all five methods, with `update` and `softDelete` being straightforward extensions of the established pattern.

---

## Repository Input Types

**File**: `apps/api/src/modules/properties/application/types/property-repository.types.ts`

```typescript
/**
 * Input types for PropertyRepository methods.
 *
 * Architecture rules:
 * - MUST NOT import from @prisma/client.
 * - CreatePropertyInput includes tenantId — it must come from verified request context.
 * - UpdatePropertyInput MUST NOT include tenantId — tenant ownership is immutable.
 */

export interface CreatePropertyInput {
  tenantId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  propertyType: string;
  description?: string | null;
}

export interface UpdatePropertyInput {
  name?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  propertyType?: string;
  description?: string | null;
}
```

---

## Infrastructure: `PrismaPropertyRepository`

**File**: `apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { Property } from '../../domain/entities/property.entity';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
} from '../../application/types/property-repository.types';
import { PropertyRepository } from '../../application/repositories/property.repository';

/** Prisma select shape — includes all columns needed for the domain entity. */
type PrismaProperty = Prisma.PropertyGetPayload<object>;

/**
 * PrismaPropertyRepository — infrastructure implementation of PropertyRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for Property data.
 * - Application layer (use cases) MUST inject PropertyRepository via PROPERTY_REPOSITORY token.
 * - All tenant-scoped queries MUST use tenantFilter() — no exceptions.
 * - Soft-deleted records (deletedAt != null) are excluded from all normal read methods.
 *
 * Error normalisation:
 * - P2025 (record not found on updateMany/deleteMany) → returns null / false
 */
@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePropertyInput): Promise<Property> {
    const record = await this.prisma.property.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state ?? null,
        postalCode: input.postalCode ?? null,
        country: input.country,
        propertyType: input.propertyType,
        description: input.description ?? null,
      },
    });
    return this.toEntity(record);
  }

  async findManyByTenant(tenantId: string): Promise<Property[]> {
    const records = await this.prisma.property.findMany({
      where: {
        ...tenantFilter(tenantId),
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findById(id: string, tenantId: string): Promise<Property | null> {
    const record = await this.prisma.property.findFirst({
      where: {
        id,
        ...tenantFilter(tenantId),
        deletedAt: null,
      },
    });
    return record ? this.toEntity(record) : null;
  }

  async update(
    id: string,
    tenantId: string,
    input: UpdatePropertyInput,
  ): Promise<Property | null> {
    try {
      const record = await this.prisma.property.update({
        where: { id, tenantId },
        data: input,
      });
      return this.toEntity(record);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.prisma.property.update({
        where: { id, tenantId },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return false;
      }
      throw e;
    }
  }

  private toEntity(record: PrismaProperty): Property {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      addressLine1: record.addressLine1,
      addressLine2: record.addressLine2,
      city: record.city,
      state: record.state,
      postalCode: record.postalCode,
      country: record.country,
      propertyType: record.propertyType,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    };
  }
}
```

**Tenant-safe query summary**:

| Method | Where clause | Excludes deletedAt? |
|---|---|---|
| `create` | tenantId in data | N/A |
| `findManyByTenant` | `tenantFilter(tenantId)` + `deletedAt: null` | ✅ |
| `findById` | `id` + `tenantFilter(tenantId)` + `deletedAt: null` | ✅ |
| `update` | `{ id, tenantId }` compound | N/A (update active only via compound key) |
| `softDelete` | `{ id, tenantId }` compound | N/A (sets deletedAt) |

---

## Module Wiring

**File**: `apps/api/src/modules/properties/properties.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PROPERTY_REPOSITORY } from './application/repositories/property.repository';
import { PrismaPropertyRepository } from './infrastructure/repositories/prisma-property.repository';

/**
 * PropertiesModule — Bounded context: Property management.
 *
 * Provides the PropertyRepository implementation via DI token.
 * PrismaService is NOT listed here — it is globally provided by DatabaseModule (@Global).
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - Only infrastructure/repositories/ files may use PrismaService.
 * - Use cases depend on PropertyRepository interface via PROPERTY_REPOSITORY token.
 * - Controllers in this module MUST NOT inject PrismaService or PrismaPropertyRepository.
 *
 * @see docs/data-layer.md
 */
@Module({
  providers: [
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PrismaPropertyRepository,
    },
  ],
  exports: [PROPERTY_REPOSITORY],
})
export class PropertiesModule {}
```

**AppModule change**: Add `PropertiesModule` to the `imports` array in `apps/api/src/app.module.ts`.

---

## Module Folder Structure

```text
apps/api/src/modules/properties/
├── domain/
│   └── entities/
│       └── property.entity.ts           # NEW — Property interface
├── application/
│   ├── repositories/
│   │   └── property.repository.ts       # NEW — PROPERTY_REPOSITORY token + interface
│   └── types/
│       └── property-repository.types.ts # NEW — CreatePropertyInput, UpdatePropertyInput
├── infrastructure/
│   └── repositories/
│       └── prisma-property.repository.ts # NEW — PrismaPropertyRepository
└── properties.module.ts                  # NEW — PropertiesModule wiring
```

_No `presentation/` layer created in this task — no controller or DTO._

---

## Files Modified

| File | Action | Change |
|---|---|---|
| `apps/api/src/app.module.ts` | Modify | Add `PropertiesModule` to `imports` array |

---

## Architecture Boundary Verification

| Layer | File | Prisma import? | NestJS import? |
|---|---|---|---|
| Domain | `property.entity.ts` | ❌ None | ❌ None |
| Application | `property.repository.ts` | ❌ None | ❌ None |
| Application | `property-repository.types.ts` | ❌ None | ❌ None |
| Infrastructure | `prisma-property.repository.ts` | ✅ Allowed | ✅ `@Injectable()` only |
| Module | `properties.module.ts` | ❌ None | ✅ `@Module()` only |
