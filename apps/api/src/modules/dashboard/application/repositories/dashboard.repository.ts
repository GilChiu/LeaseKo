import {
  OccupancyCounts,
  RevenueAmounts,
  RevenueWindow,
} from '../types/dashboard-repository.types';

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export interface DashboardRepository {
  getOccupancyCounts(tenantId: string): Promise<OccupancyCounts>;

  getRevenueAmounts(
    tenantId: string,
    window: RevenueWindow,
  ): Promise<RevenueAmounts>;
}
