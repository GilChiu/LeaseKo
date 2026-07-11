import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TenantPortal } from '../../../common/decorators/tenant-portal.decorator';
import { IRequestContext } from '../../../common/types/request-context.type';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { LeaseResponseDto } from '../../leases/presentation/dto/lease-response.dto';
import { ListInvoicesQueryDto } from '../../invoices/presentation/dto/list-invoices-query.dto';
import { PaginatedInvoicesResponseDto } from '../../invoices/presentation/dto/paginated-invoices-response.dto';
import { PaginatedPaymentsResponseDto } from '../../payments/presentation/dto/paginated-payments-response.dto';
import { MaintenanceRequestResponseDto } from '../../maintenance/presentation/dto/maintenance-request-response.dto';
import { GetTenantLeaseUseCase } from '../application/use-cases/get-tenant-lease.use-case';
import { ListTenantInvoicesUseCase } from '../application/use-cases/list-tenant-invoices.use-case';
import { ListTenantPaymentsUseCase } from '../application/use-cases/list-tenant-payments.use-case';
import { SubmitTenantMaintenanceRequestUseCase } from '../application/use-cases/submit-tenant-maintenance-request.use-case';
import { GetTenantDashboardUseCase } from '../application/use-cases/get-tenant-dashboard.use-case';
import { ListTenantPaymentsQueryDto } from './dto/list-tenant-payments-query.dto';
import { SubmitMaintenanceRequestDto } from './dto/submit-maintenance-request.dto';
import { TenantDashboardResponseDto } from './dto/tenant-dashboard-response.dto';

/**
 * TenantResourcesController — renter-facing read/write endpoints for the tenant
 * portal (Epic 24). Every route is gated by @TenantPortal(), so the caller is
 * guaranteed to be an ACTIVE renter with tenantId + tenantContactId resolved by
 * ClerkJwtGuard. Both values are taken from the verified request context only.
 */
@ApiTags('Tenant Portal')
@ApiBearerAuth()
@Controller('tenant')
export class TenantResourcesController {
  constructor(
    private readonly getTenantLease: GetTenantLeaseUseCase,
    private readonly listTenantInvoices: ListTenantInvoicesUseCase,
    private readonly listTenantPayments: ListTenantPaymentsUseCase,
    private readonly submitMaintenanceRequest: SubmitTenantMaintenanceRequestUseCase,
    private readonly getTenantDashboard: GetTenantDashboardUseCase,
  ) {}

  /**
   * Resolve the renter identity from verified context. @TenantPortal() already
   * guarantees these are present, but we narrow the nullable types safely here.
   */
  private resolveRenter(user: IRequestContext): {
    tenantId: string;
    tenantContactId: string;
  } {
    if (!user.tenantId || !user.tenantContactId) {
      throw new ForbiddenException();
    }
    return { tenantId: user.tenantId, tenantContactId: user.tenantContactId };
  }

  @Get('lease')
  @HttpCode(HttpStatus.OK)
  @TenantPortal()
  @ApiOperation({ summary: "Get the renter's current active lease" })
  @ApiOkResponse({ description: 'The active lease.', type: LeaseResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Not an active tenant portal account.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'No active lease found for this account.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async lease(@CurrentUser() user: IRequestContext): Promise<LeaseResponseDto> {
    const { tenantId, tenantContactId } = this.resolveRenter(user);
    const lease = await this.getTenantLease.execute({
      tenantId,
      tenantContactId,
    });
    return LeaseResponseDto.fromDomain(lease);
  }

  @Get('invoices')
  @HttpCode(HttpStatus.OK)
  @TenantPortal()
  @ApiOperation({ summary: "List the renter's own invoices" })
  @ApiOkResponse({
    description: 'Paginated invoice list.',
    type: PaginatedInvoicesResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'VOID'],
    description: 'Filter by invoice status',
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
    description: 'Not an active tenant portal account.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async invoices(
    @CurrentUser() user: IRequestContext,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<PaginatedInvoicesResponseDto> {
    const { tenantId, tenantContactId } = this.resolveRenter(user);
    const result = await this.listTenantInvoices.execute({
      tenantId,
      tenantContactId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    return PaginatedInvoicesResponseDto.fromDomain(
      result,
      query.page,
      query.limit,
    );
  }

  @Get('payments')
  @HttpCode(HttpStatus.OK)
  @TenantPortal()
  @ApiOperation({ summary: "List the renter's own payment history" })
  @ApiOkResponse({
    description: 'Paginated payment list.',
    type: PaginatedPaymentsResponseDto,
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
    description: 'Not an active tenant portal account.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async payments(
    @CurrentUser() user: IRequestContext,
    @Query() query: ListTenantPaymentsQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    const { tenantId, tenantContactId } = this.resolveRenter(user);
    const result = await this.listTenantPayments.execute({
      tenantId,
      tenantContactId,
      page: query.page,
      limit: query.limit,
    });
    return PaginatedPaymentsResponseDto.fromDomain(
      result,
      query.page,
      query.limit,
    );
  }

  @Post('maintenance')
  @HttpCode(HttpStatus.CREATED)
  @TenantPortal()
  @ApiOperation({
    summary: 'Submit a maintenance request for the assigned unit',
  })
  @ApiCreatedResponse({
    description: 'Maintenance request created.',
    type: MaintenanceRequestResponseDto,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation error.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Not an active tenant portal account, or no active lease.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'The unit associated with the lease was not found.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async maintenance(
    @CurrentUser() user: IRequestContext,
    @Body() dto: SubmitMaintenanceRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const { tenantId, tenantContactId } = this.resolveRenter(user);
    const request = await this.submitMaintenanceRequest.execute({
      tenantId,
      tenantContactId,
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
    });
    return MaintenanceRequestResponseDto.fromDomain(request);
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @TenantPortal()
  @ApiOperation({ summary: 'Get the renter dashboard summary' })
  @ApiOkResponse({
    description: 'Dashboard summary.',
    type: TenantDashboardResponseDto,
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid Bearer token.',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Not an active tenant portal account.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Unexpected server error.',
  })
  async dashboard(
    @CurrentUser() user: IRequestContext,
  ): Promise<TenantDashboardResponseDto> {
    const { tenantId, tenantContactId } = this.resolveRenter(user);
    const summary = await this.getTenantDashboard.execute({
      tenantId,
      tenantContactId,
    });
    return TenantDashboardResponseDto.fromDomain(summary);
  }
}
