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
