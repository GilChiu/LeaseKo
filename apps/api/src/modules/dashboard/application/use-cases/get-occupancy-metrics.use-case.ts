import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  DashboardRepository,
} from '../repositories/dashboard.repository';
import { OccupancyMetrics } from '../../domain/entities/occupancy-metrics.entity';

export interface GetOccupancyMetricsUseCaseInput {
  tenantId: string;
}

@Injectable()
export class GetOccupancyMetricsUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboard: DashboardRepository,
  ) {}

  async execute(
    input: GetOccupancyMetricsUseCaseInput,
  ): Promise<OccupancyMetrics> {
    const counts = await this.dashboard.getOccupancyCounts(input.tenantId);

    const occupancyPercentage =
      counts.totalUnits > 0
        ? Math.round((counts.occupiedUnits / counts.totalUnits) * 100 * 100) /
          100
        : 0;

    return {
      totalProperties: counts.totalProperties,
      totalUnits: counts.totalUnits,
      occupiedUnits: counts.occupiedUnits,
      vacantUnits: counts.vacantUnits,
      occupancyPercentage,
    };
  }
}
