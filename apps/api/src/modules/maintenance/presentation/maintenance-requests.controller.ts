import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CreateMaintenanceRequestUseCase } from '../application/use-cases/create-maintenance-request.use-case';
import { UpdateMaintenanceStatusUseCase } from '../application/use-cases/update-maintenance-status.use-case';
import { ListMaintenanceRequestsUseCase } from '../application/use-cases/list-maintenance-requests.use-case';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { ListMaintenanceRequestsQueryDto } from './dto/list-maintenance-requests-query.dto';
import { MaintenanceRequestResponseDto } from './dto/maintenance-request-response.dto';
import { PaginatedMaintenanceRequestsResponseDto } from './dto/paginated-maintenance-requests-response.dto';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceRequestsController {
  constructor(
    private readonly createMaintenanceRequest: CreateMaintenanceRequestUseCase,
    private readonly updateMaintenanceStatus: UpdateMaintenanceStatusUseCase,
    private readonly listMaintenanceRequests: ListMaintenanceRequestsUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({
    summary: 'List maintenance requests for the current workspace',
  })
  @ApiOkResponse({
    description: 'Paginated maintenance request list.',
    type: PaginatedMaintenanceRequestsResponseDto,
  })
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
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    description: 'Filter by priority',
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
    @Query() query: ListMaintenanceRequestsQueryDto,
  ): Promise<PaginatedMaintenanceRequestsResponseDto> {
    const result = await this.listMaintenanceRequests.execute({
      tenantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      priority: query.priority,
    });
    return PaginatedMaintenanceRequestsResponseDto.fromDomain(
      result,
      query.page,
      query.limit,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresTenant()
  @ApiOperation({ summary: 'Create a maintenance request' })
  @ApiCreatedResponse({
    description: 'Maintenance request created successfully.',
    type: MaintenanceRequestResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Property or unit not found or not accessible.',
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
    @Body() dto: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.createMaintenanceRequest.execute({
      tenantId,
      propertyId: dto.propertyId,
      unitId: dto.unitId,
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
      notes: dto.notes ?? null,
    });
    return MaintenanceRequestResponseDto.fromDomain(request);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({ summary: 'Update maintenance request status' })
  @ApiParam({ name: 'id', description: 'Maintenance request UUID' })
  @ApiOkResponse({
    description: 'Status updated successfully.',
    type: MaintenanceRequestResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid status value.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Maintenance request not found or not accessible.',
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
  async patchStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.updateMaintenanceStatus.execute({
      id,
      tenantId,
      status: dto.status,
    });
    return MaintenanceRequestResponseDto.fromDomain(request);
  }
}
