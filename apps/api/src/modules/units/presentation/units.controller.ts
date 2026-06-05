import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
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
import { CreateUnitUseCase } from '../application/use-cases/create-unit.use-case';
import { ListUnitsByPropertyUseCase } from '../application/use-cases/list-units-by-property.use-case';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { PaginatedUnitsResponseDto } from './dto/paginated-units-response.dto';
import { UnitResponseDto } from './dto/unit-response.dto';

/**
 * UnitsController — thin HTTP adapter for Unit management endpoints.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT use PrismaService.
 * - MUST NOT parse JWT or read tenantId from request body/query/header.
 * - MUST NOT contain business logic — delegates entirely to use cases.
 * - MUST NOT read propertyId from the request body — from @Param only.
 * - tenantId is extracted from verified request context via @CurrentTenant().
 */
@ApiTags('Units')
@ApiBearerAuth()
@Controller('properties/:propertyId/units')
export class UnitsController {
  constructor(
    private readonly createUnit: CreateUnitUseCase,
    private readonly listUnitsByProperty: ListUnitsByPropertyUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'List all units under a property' })
  @ApiParam({ name: 'propertyId', description: 'Property unique identifier' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50, max: 100)',
  })
  @ApiOkResponse({
    description:
      'Unit list retrieved successfully. Returns empty array when property has no units.',
    type: PaginatedUnitsResponseDto,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description:
      'Property not found, belongs to a different tenant, or is archived. All three cases are indistinguishable.',
  })
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
    @Param('propertyId') propertyId: string,
    @Query() query: ListUnitsQueryDto,
  ): Promise<PaginatedUnitsResponseDto> {
    const result = await this.listUnitsByProperty.execute({
      tenantId,
      propertyId,
      page: query.page,
      limit: query.limit,
    });
    return PaginatedUnitsResponseDto.fromDomain(result, query.page, query.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Create a unit under a property' })
  @ApiParam({ name: 'propertyId', description: 'Property unique identifier' })
  @ApiCreatedResponse({
    description: 'Unit created successfully.',
    type: UnitResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error — missing or invalid request body fields.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description:
      'Property not found, belongs to a different tenant, or is archived. All three cases are indistinguishable.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description:
      'A unit with the same unit number already exists under this property.',
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
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateUnitDto,
  ): Promise<UnitResponseDto> {
    const unit = await this.createUnit.execute({
      tenantId,
      propertyId,
      unitNumber: dto.unitNumber,
      floorArea: dto.floorArea ?? null,
      bedrooms: dto.bedrooms ?? null,
      bathrooms: dto.bathrooms ?? null,
      monthlyRent: dto.monthlyRent ?? null,
      description: dto.description ?? null,
    });
    return UnitResponseDto.fromDomain(unit);
  }
}
