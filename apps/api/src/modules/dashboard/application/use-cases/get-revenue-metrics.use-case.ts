import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  DashboardRepository,
} from '../repositories/dashboard.repository';
import { RevenueMetrics } from '../../domain/entities/revenue-metrics.entity';

export interface GetRevenueMetricsUseCaseInput {
  tenantId: string;
  year?: number;
  month?: number;
}

@Injectable()
export class GetRevenueMetricsUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboard: DashboardRepository,
  ) {}

  async execute(
    input: GetRevenueMetricsUseCaseInput,
  ): Promise<RevenueMetrics> {
    const now = new Date();
    const year = input.year ?? now.getUTCFullYear();
    const month = input.month ?? now.getUTCMonth() + 1;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const amounts = await this.dashboard.getRevenueAmounts(input.tenantId, {
      start,
      end,
    });

    return {
      year,
      month,
      monthlyRevenue: amounts.monthlyRevenue,
      collectedRent: amounts.collectedRent,
      outstandingAmount: amounts.outstandingAmount,
      outstandingCount: amounts.outstandingCount,
      overdueAmount: amounts.overdueAmount,
      overdueCount: amounts.overdueCount,
    };
  }
}
