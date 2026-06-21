import { OccupancyMetrics } from './occupancy-metrics.entity';
import { RevenueMetrics } from './revenue-metrics.entity';

export interface DashboardSummary {
  occupancy: OccupancyMetrics;
  revenue: RevenueMetrics;
}
