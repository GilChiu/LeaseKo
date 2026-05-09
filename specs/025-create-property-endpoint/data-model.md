# Data Model: Create Property Use Case & API Endpoint

**Feature**: 025-create-property-endpoint
**Phase**: 1 — Design
**Date**: 2026-05-09

---

## Overview

This document describes the use case, DTOs, controller, and module wiring for the Create Property API flow. All entities from Feature 024 are reused as-is. No schema changes are required.

---

## Reused Entities (Feature 024)

- `Property` domain entity — `apps/api/src/modules/properties/domain/entities/property.entity.ts`
- `CreatePropertyInput` — `apps/api/src/modules/properties/application/types/property-repository.types.ts`
- `PropertyRepository` / `PROPERTY_REPOSITORY` — `apps/api/src/modules/properties/application/repositories/property.repository.ts`
- `PrismaPropertyRepository` — `apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts`
- `PropertiesModule` — `apps/api/src/modules/properties/properties.module.ts`

---

## Application Layer: `CreatePropertyUseCase`

**File**: `apps/api/src/modules/properties/application/use-cases/create-property.use-case.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';
import { CreatePropertyInput } from '../types/property-repository.types';
import { Property } from '../../domain/entities/property.entity';

/**
 * CreatePropertyUseCase — creates a new Property under the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on PropertyRepository interface via PROPERTY_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 */
@Injectable()
export class CreatePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: CreatePropertyInput): Promise<Property> {
    return this.properties.create(input);
  }
}
```

**Key rules**:
- No Prisma import
- No HTTP import
- `tenantId` arrives via `input.tenantId` — set by the controller from verified context

---

## Presentation Layer: `CreatePropertyDto`

**File**: `apps/api/src/modules/properties/presentation/dto/create-property.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * CreatePropertyDto — validated request body for POST /properties.
 *
 * Security rules (NON-NEGOTIABLE):
 * - tenantId MUST NOT be present in this DTO.
 * - tenantId is sourced from verified Clerk JWT context in the controller.
 * - The global ValidationPipe (forbidNonWhitelisted: true) will reject any
 *   request body field not declared here.
 */
export class CreatePropertyDto {
  @ApiProperty({ example: 'Sunset Apartments', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '123 Main Street', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Unit A', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ example: 'Iloilo City', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @ApiPropertyOptional({ example: 'Iloilo', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @ApiPropertyOptional({ example: '5000', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string;

  @ApiProperty({ example: 'Philippines', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  country!: string;

  @ApiProperty({
    example: 'APARTMENT',
    description: 'Type of property (free-form string at this stage)',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  propertyType!: string;

  @ApiPropertyOptional({ example: 'A 12-unit apartment building.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
```

**Validation rule summary**:

| Field | Required | Type | Max Length |
|---|---|---|---|
| `name` | ✅ | string | 120 |
| `addressLine1` | ✅ | string | 255 |
| `addressLine2` | ❌ | string | 255 |
| `city` | ✅ | string | 120 |
| `state` | ❌ | string | 120 |
| `postalCode` | ❌ | string | 30 |
| `country` | ✅ | string | 120 |
| `propertyType` | ✅ | string | 80 |
| `description` | ❌ | string | 1000 |

---

## Presentation Layer: `PropertyResponseDto`

**File**: `apps/api/src/modules/properties/presentation/dto/property-response.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Property } from '../../domain/entities/property.entity';

/**
 * PropertyResponseDto — response shape for Property API endpoints.
 *
 * Maps the Property domain entity to a response-safe object.
 * Does not expose Prisma types, raw DB internals, or Clerk JWT claims.
 */
export class PropertyResponseDto {
  @ApiProperty({ example: 'uuid-v4-here' })
  id!: string;

  @ApiProperty({ example: 'org_2abc123xyz' })
  tenantId!: string;

  @ApiProperty({ example: 'Sunset Apartments' })
  name!: string;

  @ApiProperty({ example: '123 Main Street' })
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Unit A', nullable: true })
  addressLine2!: string | null;

  @ApiProperty({ example: 'Iloilo City' })
  city!: string;

  @ApiPropertyOptional({ example: 'Iloilo', nullable: true })
  state!: string | null;

  @ApiPropertyOptional({ example: '5000', nullable: true })
  postalCode!: string | null;

  @ApiProperty({ example: 'Philippines' })
  country!: string;

  @ApiProperty({ example: 'APARTMENT' })
  propertyType!: string;

  @ApiPropertyOptional({ example: 'A 12-unit apartment building.', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '2026-05-09T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-09T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(property: Property): PropertyResponseDto {
    const dto = new PropertyResponseDto();
    dto.id = property.id;
    dto.tenantId = property.tenantId;
    dto.name = property.name;
    dto.addressLine1 = property.addressLine1;
    dto.addressLine2 = property.addressLine2;
    dto.city = property.city;
    dto.state = property.state;
    dto.postalCode = property.postalCode;
    dto.country = property.country;
    dto.propertyType = property.propertyType;
    dto.description = property.description;
    dto.createdAt = property.createdAt;
    dto.updatedAt = property.updatedAt;
    return dto;
  }
}
```

**Note**: `deletedAt` is intentionally excluded from the response — clients never need to see it on a newly created property.

---

## Presentation Layer: `PropertiesController`

**File**: `apps/api/src/modules/properties/presentation/properties.controller.ts`

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { CreatePropertyUseCase } from '../application/use-cases/create-property.use-case';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyResponseDto } from './dto/property-response.dto';

/**
 * PropertiesController — thin HTTP adapter for Property management endpoints.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT use PrismaService.
 * - MUST NOT parse JWT or read tenantId from request body/query/header.
 * - MUST NOT contain business logic — delegates entirely to use cases.
 * - tenantId is extracted from verified request context via @CurrentTenant().
 */
@ApiTags('Properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(private readonly createProperty: CreatePropertyUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Create a new property for the current tenant' })
  @ApiCreatedResponse({
    description: 'Property created successfully.',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error — missing or invalid request body fields.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Authenticated but no active organization/tenant context.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const property = await this.createProperty.execute({
      tenantId,
      name: dto.name,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2 ?? null,
      city: dto.city,
      state: dto.state ?? null,
      postalCode: dto.postalCode ?? null,
      country: dto.country,
      propertyType: dto.propertyType,
      description: dto.description ?? null,
    });
    return PropertyResponseDto.fromDomain(property);
  }
}
```

---

## Module Update: `PropertiesModule`

**File**: `apps/api/src/modules/properties/properties.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PROPERTY_REPOSITORY } from './application/repositories/property.repository';
import { PrismaPropertyRepository } from './infrastructure/repositories/prisma-property.repository';
import { CreatePropertyUseCase } from './application/use-cases/create-property.use-case';
import { PropertiesController } from './presentation/properties.controller';

@Module({
  controllers: [PropertiesController],
  providers: [
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PrismaPropertyRepository,
    },
    CreatePropertyUseCase,
  ],
  exports: [PROPERTY_REPOSITORY],
})
export class PropertiesModule {}
```

---

## File Structure (after implementation)

```text
apps/api/src/modules/properties/
├── domain/
│   └── entities/
│       └── property.entity.ts                    # EXISTING (Feature 024)
├── application/
│   ├── repositories/
│   │   └── property.repository.ts                # EXISTING (Feature 024)
│   ├── types/
│   │   └── property-repository.types.ts          # EXISTING (Feature 024)
│   └── use-cases/
│       └── create-property.use-case.ts           # NEW
├── infrastructure/
│   └── repositories/
│       └── prisma-property.repository.ts         # EXISTING (Feature 024)
├── presentation/
│   ├── dto/
│   │   ├── create-property.dto.ts                # NEW
│   │   └── property-response.dto.ts              # NEW
│   └── properties.controller.ts                  # NEW
└── properties.module.ts                          # MODIFIED — add controller + use case
```

---

## Files Modified

| File | Action |
|---|---|
| `apps/api/src/modules/properties/properties.module.ts` | Modify — add `controllers`, `CreatePropertyUseCase` to providers |

---

## Architecture Boundary Verification

| Layer | File | Prisma? | NestJS HTTP? |
|---|---|---|---|
| Domain | `property.entity.ts` | ❌ | ❌ |
| Application | `property.repository.ts` | ❌ | ❌ |
| Application | `property-repository.types.ts` | ❌ | ❌ |
| Application | `create-property.use-case.ts` | ❌ | `@Injectable` only |
| Infrastructure | `prisma-property.repository.ts` | ✅ allowed | `@Injectable` only |
| Presentation | `create-property.dto.ts` | ❌ | ✅ `class-validator` only |
| Presentation | `property-response.dto.ts` | ❌ | ✅ `@ApiProperty` only |
| Presentation | `properties.controller.ts` | ❌ | ✅ full NestJS controller |
| Module | `properties.module.ts` | ❌ | ✅ `@Module` only |

---

## Tenant Isolation Flow

```
HTTP Request (no tenantId in body)
  ↓
ClerkJwtGuard — verifies JWT, sets request.user.tenantId
  ↓
RequiresTenant metadata check — 403 if tenantId null
  ↓
PropertiesController.create(@CurrentTenant() tenantId)
  ↓
CreatePropertyUseCase.execute({ tenantId, ...dto })
  ↓
PropertyRepository.create({ tenantId, ... })
  ↓
PrismaPropertyRepository — stores property.tenantId
```

**Cross-tenant creation is structurally impossible**: the frontend never controls `tenantId` — it comes from the Clerk JWT org claim.
