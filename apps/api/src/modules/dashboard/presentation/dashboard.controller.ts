import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';
import { GetOccupancyMetricsUseCase } from '../application/use-cases/get-occupancy-metrics.use-case';
import { GetRevenueMetricsUseCase } from '../application/use-cases/get-revenue-metrics.use-case';
import { GetDashboardSummaryUseCase } from '../application/use-cases/get-dashboard-summary.use-case';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { OccupancyMetricsResponseDto } from './dto/occupancy-metrics-response.dto';
import { RevenueMetricsResponseDto } from './dto/revenue-metrics-response.dto';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getOccupancyMetrics: GetOccupancyMetricsUseCase,
    private readonly getRevenueMetrics: GetRevenueMetricsUseCase,
    private readonly getDashboardSummary: GetDashboardSummaryUseCase,
  ) {}

  @Get('occupancy')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({
    summary: 'Get occupancy metrics for the current workspace',
  })
  @ApiOkResponse({
    description: 'Occupancy metrics.',
    type: OccupancyMetricsResponseDto,
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
  async occupancy(
    @CurrentTenant() tenantId: string,
  ): Promise<OccupancyMetricsResponseDto> {
    const metrics = await this.getOccupancyMetrics.execute({ tenantId });
    return OccupancyMetricsResponseDto.fromDomain(metrics);
  }

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({
    summary: 'Get revenue metrics for a month (defaults to current month)',
  })
  @ApiOkResponse({
    description: 'Revenue metrics.',
    type: RevenueMetricsResponseDto,
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Reporting year (defaults to current year)',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description: 'Reporting month 1-12 (defaults to current month)',
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
  async revenue(
    @CurrentTenant() tenantId: string,
    @Query() query: RevenueQueryDto,
  ): Promise<RevenueMetricsResponseDto> {
    const metrics = await this.getRevenueMetrics.execute({
      tenantId,
      year: query.year,
      month: query.month,
    });
    return RevenueMetricsResponseDto.fromDomain(metrics);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @RequiresTenant()
  @ApiOperation({
    summary: 'Get combined occupancy and revenue summary',
  })
  @ApiOkResponse({
    description: 'Dashboard summary.',
    type: DashboardSummaryResponseDto,
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
  async summary(
    @CurrentTenant() tenantId: string,
  ): Promise<DashboardSummaryResponseDto> {
    const result = await this.getDashboardSummary.execute({ tenantId });
    return DashboardSummaryResponseDto.fromDomain(result);
  }
}
