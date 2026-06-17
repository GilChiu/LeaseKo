import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { ActivateLeaseUseCase } from '../application/use-cases/activate-lease.use-case';
import { CreateLeaseUseCase } from '../application/use-cases/create-lease.use-case';
import { ExpireLeaseUseCase } from '../application/use-cases/expire-lease.use-case';
import { GetLeaseByIdUseCase } from '../application/use-cases/get-lease-by-id.use-case';
import { ListLeasesUseCase } from '../application/use-cases/list-leases.use-case';
import { TerminateLeaseUseCase } from '../application/use-cases/terminate-lease.use-case';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { ListLeasesQueryDto } from './dto/list-leases-query.dto';
import { LeaseResponseDto } from './dto/lease-response.dto';
import { PaginatedLeasesResponseDto } from './dto/paginated-leases-response.dto';

/**
 * LeasesController — thin HTTP adapter for lease endpoints.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT use PrismaService.
 * - MUST NOT parse JWT or read tenantId from request body/query/header.
 * - MUST NOT contain business logic — delegates entirely to use cases.
 * - tenantId is extracted from verified request context via @CurrentTenant().
 */
@ApiTags('Leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
  constructor(
    private readonly createLease: CreateLeaseUseCase,
    private readonly listLeases: ListLeasesUseCase,
    private readonly getLeaseById: GetLeaseByIdUseCase,
    private readonly activateLease: ActivateLeaseUseCase,
    private readonly expireLease: ExpireLeaseUseCase,
    private readonly terminateLease: TerminateLeaseUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'List all leases for the current workspace' })
  @ApiOkResponse({
    description: 'Paginated lease list.',
    type: PaginatedLeasesResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'],
    description: 'Filter by lease status',
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
    @Query() query: ListLeasesQueryDto,
  ): Promise<PaginatedLeasesResponseDto> {
    const result = await this.listLeases.execute({
      tenantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    return PaginatedLeasesResponseDto.fromDomain(result, query.page, query.limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Get a lease by ID' })
  @ApiParam({ name: 'id', description: 'Lease unique identifier' })
  @ApiOkResponse({
    description: 'Lease found.',
    type: LeaseResponseDto,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Lease not found or not accessible.',
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
  ): Promise<LeaseResponseDto> {
    const lease = await this.getLeaseById.execute({ id, tenantId });
    return LeaseResponseDto.fromDomain(lease);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Create a lease for the current workspace' })
  @ApiCreatedResponse({
    description: 'Lease created successfully.',
    type: LeaseResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error or startDate is not before endDate.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'One or more referenced resources not found or not accessible.',
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
    @Body() dto: CreateLeaseDto,
  ): Promise<LeaseResponseDto> {
    const lease = await this.createLease.execute({
      tenantId,
      propertyId: dto.propertyId,
      unitId: dto.unitId,
      tenantContactId: dto.tenantContactId,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      monthlyRent: dto.monthlyRent,
      depositAmount: dto.depositAmount ?? null,
      notes: dto.notes ?? null,
    });
    return LeaseResponseDto.fromDomain(lease);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Activate a lease (DRAFT → ACTIVE, unit → OCCUPIED)' })
  @ApiParam({ name: 'id', description: 'Lease unique identifier' })
  @ApiOkResponse({
    description: 'Lease activated successfully.',
    type: LeaseResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Lease is not in DRAFT status.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Unit already has an active lease.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Lease not found or not accessible.',
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
  async activate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<LeaseResponseDto> {
    const lease = await this.activateLease.execute({ id, tenantId });
    return LeaseResponseDto.fromDomain(lease);
  }

  @Patch(':id/expire')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Expire a lease (ACTIVE → EXPIRED, unit → AVAILABLE)' })
  @ApiParam({ name: 'id', description: 'Lease unique identifier' })
  @ApiOkResponse({
    description: 'Lease expired successfully.',
    type: LeaseResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Lease is not in ACTIVE status.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Lease not found or not accessible.',
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
  async expire(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<LeaseResponseDto> {
    const lease = await this.expireLease.execute({ id, tenantId });
    return LeaseResponseDto.fromDomain(lease);
  }

  @Patch(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Terminate a lease (ACTIVE → TERMINATED, unit → AVAILABLE)' })
  @ApiParam({ name: 'id', description: 'Lease unique identifier' })
  @ApiOkResponse({
    description: 'Lease terminated successfully.',
    type: LeaseResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Lease is not in ACTIVE status.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Lease not found or not accessible.',
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
  async terminate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ): Promise<LeaseResponseDto> {
    const lease = await this.terminateLease.execute({ id, tenantId });
    return LeaseResponseDto.fromDomain(lease);
  }
}
