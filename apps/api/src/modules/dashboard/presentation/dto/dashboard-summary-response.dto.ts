import { ApiProperty } from '@nestjs/swagger';
import { DashboardSummary } from '../../domain/entities/dashboard-summary.entity';
import { OccupancyMetricsResponseDto } from './occupancy-metrics-response.dto';
import { RevenueMetricsResponseDto } from './revenue-metrics-response.dto';

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: OccupancyMetricsResponseDto })
  occupancy!: OccupancyMetricsResponseDto;

  @ApiProperty({ type: RevenueMetricsResponseDto })
  revenue!: RevenueMetricsResponseDto;

  static fromDomain(
    summary: DashboardSummary,
  ): DashboardSummaryResponseDto {
    const dto = new DashboardSummaryResponseDto();
    dto.occupancy = OccupancyMetricsResponseDto.fromDomain(summary.occupancy);
    dto.revenue = RevenueMetricsResponseDto.fromDomain(summary.revenue);
    return dto;
  }
}
