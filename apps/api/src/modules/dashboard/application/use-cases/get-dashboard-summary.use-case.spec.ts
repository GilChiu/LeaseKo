import { GetDashboardSummaryUseCase } from './get-dashboard-summary.use-case';
import { GetOccupancyMetricsUseCase } from './get-occupancy-metrics.use-case';
import { GetRevenueMetricsUseCase } from './get-revenue-metrics.use-case';
import { OccupancyMetrics } from '../../domain/entities/occupancy-metrics.entity';
import { RevenueMetrics } from '../../domain/entities/revenue-metrics.entity';

const occupancy: OccupancyMetrics = {
  totalProperties: 5,
  totalUnits: 40,
  occupiedUnits: 32,
  vacantUnits: 6,
  occupancyPercentage: 80,
};

const revenue: RevenueMetrics = {
  year: 2026,
  month: 6,
  monthlyRevenue: 125000,
  collectedRent: 98000,
  outstandingAmount: 54000,
  outstandingCount: 12,
  overdueAmount: 21000,
  overdueCount: 4,
};

describe('GetDashboardSummaryUseCase', () => {
  const mockOccupancy = {
    execute: jest.fn(),
  } as unknown as GetOccupancyMetricsUseCase;
  const mockRevenue = {
    execute: jest.fn(),
  } as unknown as GetRevenueMetricsUseCase;

  let useCase: GetDashboardSummaryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetDashboardSummaryUseCase(mockOccupancy, mockRevenue);
    (mockOccupancy.execute as jest.Mock).mockResolvedValue(occupancy);
    (mockRevenue.execute as jest.Mock).mockResolvedValue(revenue);
  });

  it('should combine occupancy and revenue metrics', async () => {
    const result = await useCase.execute({ tenantId: 'tenant_A' });

    expect(result).toEqual({ occupancy, revenue });
  });

  it('should forward the tenantId to both sub-use-cases', async () => {
    await useCase.execute({ tenantId: 'tenant_XYZ' });

    expect(mockOccupancy.execute).toHaveBeenCalledWith({
      tenantId: 'tenant_XYZ',
    });
    expect(mockRevenue.execute).toHaveBeenCalledWith({
      tenantId: 'tenant_XYZ',
    });
  });

  it('should call each sub-use-case exactly once', async () => {
    await useCase.execute({ tenantId: 'tenant_A' });

    expect(mockOccupancy.execute).toHaveBeenCalledTimes(1);
    expect(mockRevenue.execute).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors from a sub-use-case', async () => {
    (mockRevenue.execute as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(useCase.execute({ tenantId: 'tenant_A' })).rejects.toThrow(
      'DB connection failed',
    );
  });

  describe('cross-tenant isolation', () => {
    // The caller's tenantId flows into both sub-use-cases unchanged.
    it('forwards the caller tenant to both sub-use-cases', async () => {
      await useCase.execute({ tenantId: 'tenant_B' });

      expect(mockOccupancy.execute).toHaveBeenCalledWith({
        tenantId: 'tenant_B',
      });
      expect(mockRevenue.execute).toHaveBeenCalledWith({
        tenantId: 'tenant_B',
      });
    });
  });
});
