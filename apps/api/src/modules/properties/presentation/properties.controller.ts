import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { CreatePropertyUseCase } from '../application/use-cases/create-property.use-case';
import { GetPropertyByIdUseCase } from '../application/use-cases/get-property-by-id.use-case';
import { ListPropertiesUseCase } from '../application/use-cases/list-properties.use-case';
import { ArchivePropertyUseCase } from '../application/use-cases/archive-property.use-case';
import { UpdatePropertyUseCase } from '../application/use-cases/update-property.use-case';
import { CreatePropertyDto } from './dto/create-property.dto';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto';
import { PaginatedPropertiesResponseDto } from './dto/paginated-properties-response.dto';
import { PropertyResponseDto } from './dto/property-response.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

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
  constructor(
    private readonly createProperty: CreatePropertyUseCase,
    private readonly listProperties: ListPropertiesUseCase,
    private readonly getPropertyById: GetPropertyByIdUseCase,
    private readonly updateProperty: UpdatePropertyUseCase,
    private readonly archiveProperty: ArchivePropertyUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'List all properties for the current tenant' })
  @ApiOkResponse({
    description: 'Paginated property list.',
    type: PaginatedPropertiesResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid query parameters.',
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
  async list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListPropertiesQueryDto,
  ): Promise<PaginatedPropertiesResponseDto> {
    const result = await this.listProperties.execute({
      tenantId,
      page: query.page,
      limit: query.limit,
    });
    return PaginatedPropertiesResponseDto.fromDomain(result, query.page, query.limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Get a property by ID for the current tenant' })
  @ApiParam({ name: 'id', description: 'Property unique identifier' })
  @ApiOkResponse({
    description: 'Property found.',
    type: PropertyResponseDto,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Property not found or belongs to a different tenant.',
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
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<PropertyResponseDto> {
    const property = await this.getPropertyById.execute({ id, tenantId });
    return PropertyResponseDto.fromDomain(property);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Update a property for the current tenant' })
  @ApiParam({ name: 'id', description: 'Property unique identifier' })
  @ApiOkResponse({
    description: 'Property updated.',
    type: PropertyResponseDto,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Property not found or belongs to a different tenant.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Empty payload or validation error.',
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
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const fields = Object.values(dto).filter((v) => v !== undefined);
    if (fields.length === 0) {
      throw new BadRequestException('At least one field must be provided to update a property');
    }
    const updated = await this.updateProperty.execute({
      id,
      tenantId,
      data: { ...dto },
    });
    return PropertyResponseDto.fromDomain(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresTenant()
  @ApiOperation({ summary: 'Archive a property for the current tenant (soft-delete)' })
  @ApiParam({ name: 'id', description: 'Property unique identifier' })
  @ApiNoContentResponse({ description: 'Property archived successfully.' })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Property not found or belongs to a different tenant.',
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
  async archive(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.archiveProperty.execute({ id, tenantId });
  }

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
