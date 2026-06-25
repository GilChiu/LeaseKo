import { GetRevenueMetricsUseCase } from './get-revenue-metrics.use-case';
import {
  DASHBOARD_REPOSITORY,
  DashboardRepository,
} from '../repositories/dashboard.repository';
import { RevenueAmounts } from '../types/dashboard-repository.types';

void DASHBOARD_REPOSITORY;

const baseAmounts: RevenueAmounts = {
  monthlyRevenue: 125000,
  collectedRent: 98000,
  outstandingAmount: 54000,
  outstandingCount: 12,
  overdueAmount: 21000,
  overdueCount: 4,
};

describe('GetRevenueMetricsUseCase', () => {
  const mockRepo: DashboardRepository = {
    getOccupancyCounts: jest.fn(),
    getRevenueAmounts: jest.fn(),
  };

  let useCase: GetRevenueMetricsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetRevenueMetricsUseCase(mockRepo);
    (mockRepo.getRevenueAmounts as jest.Mock).mockResolvedValue(baseAmounts);
  });

  it('should return revenue metrics with the resolved year and month', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant_A',
      year: 2026,
      month: 6,
    });

    expect(result).toEqual({ year: 2026, month: 6, ...baseAmounts });
  });

  it('should default to the current UTC month when no params are given', async () => {
    const now = new Date();
    const expectedYear = now.getUTCFullYear();
    const expectedMonth = now.getUTCMonth() + 1;

    const result = await useCase.execute({ tenantId: 'tenant_A' });

    expect(result.year).toBe(expectedYear);
    expect(result.month).toBe(expectedMonth);
  });

  it('should compute UTC window boundaries for the given month', async () => {
    await useCase.execute({ tenantId: 'tenant_A', year: 2026, month: 6 });

    expect(mockRepo.getRevenueAmounts).toHaveBeenCalledWith('tenant_A', {
      start: new Date(Date.UTC(2026, 5, 1)),
      end: new Date(Date.UTC(2026, 6, 1)),
    });
  });

  it('should roll over to the next year for December windows', async () => {
    await useCase.execute({ tenantId: 'tenant_A', year: 2026, month: 12 });

    expect(mockRepo.getRevenueAmounts).toHaveBeenCalledWith('tenant_A', {
      start: new Date(Date.UTC(2026, 11, 1)),
      end: new Date(Date.UTC(2027, 0, 1)),
    });
  });

  it('should forward the tenantId to the repository', async () => {
    await useCase.execute({ tenantId: 'tenant_XYZ', year: 2026, month: 1 });

    expect(mockRepo.getRevenueAmounts).toHaveBeenCalledWith(
      'tenant_XYZ',
      expect.anything(),
    );
  });

  it('should propagate repository errors', async () => {
    (mockRepo.getRevenueAmounts as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(
      useCase.execute({ tenantId: 'tenant_A', year: 2026, month: 6 }),
    ).rejects.toThrow('DB connection failed');
  });

  describe('cross-tenant isolation', () => {
    // Revenue aggregation is always scoped to the caller's tenantId.
    it('scopes the aggregation to the caller tenant', async () => {
      await useCase.execute({ tenantId: 'tenant_B', year: 2026, month: 6 });

      expect(mockRepo.getRevenueAmounts).toHaveBeenCalledWith(
        'tenant_B',
        expect.anything(),
      );
    });
  });
});
