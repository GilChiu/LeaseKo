import { Module } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from './application/repositories/dashboard.repository';
import { PrismaDashboardRepository } from './infrastructure/repositories/prisma-dashboard.repository';
import { GetOccupancyMetricsUseCase } from './application/use-cases/get-occupancy-metrics.use-case';
import { GetRevenueMetricsUseCase } from './application/use-cases/get-revenue-metrics.use-case';
import { GetDashboardSummaryUseCase } from './application/use-cases/get-dashboard-summary.use-case';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  controllers: [DashboardController],
  providers: [
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: PrismaDashboardRepository,
    },
    GetOccupancyMetricsUseCase,
    GetRevenueMetricsUseCase,
    GetDashboardSummaryUseCase,
  ],
})
export class DashboardModule {}
