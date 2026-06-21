import { Injectable } from '@nestjs/common';
import { GetOccupancyMetricsUseCase } from './get-occupancy-metrics.use-case';
import { GetRevenueMetricsUseCase } from './get-revenue-metrics.use-case';
import { DashboardSummary } from '../../domain/entities/dashboard-summary.entity';

export interface GetDashboardSummaryUseCaseInput {
  tenantId: string;
}

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    private readonly getOccupancyMetrics: GetOccupancyMetricsUseCase,
    private readonly getRevenueMetrics: GetRevenueMetricsUseCase,
  ) {}

  async execute(
    input: GetDashboardSummaryUseCaseInput,
  ): Promise<DashboardSummary> {
    const [occupancy, revenue] = await Promise.all([
      this.getOccupancyMetrics.execute({ tenantId: input.tenantId }),
      this.getRevenueMetrics.execute({ tenantId: input.tenantId }),
    ]);

    return { occupancy, revenue };
  }
}
