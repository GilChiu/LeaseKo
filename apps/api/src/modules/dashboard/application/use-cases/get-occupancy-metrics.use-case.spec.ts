import { GetOccupancyMetricsUseCase } from './get-occupancy-metrics.use-case';
import {
  DASHBOARD_REPOSITORY,
  DashboardRepository,
} from '../repositories/dashboard.repository';

void DASHBOARD_REPOSITORY;

describe('GetOccupancyMetricsUseCase', () => {
  const mockRepo: DashboardRepository = {
    getOccupancyCounts: jest.fn(),
    getRevenueAmounts: jest.fn(),
  };

  let useCase: GetOccupancyMetricsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetOccupancyMetricsUseCase(mockRepo);
  });

  it('should compute occupancy percentage from counts', async () => {
    (mockRepo.getOccupancyCounts as jest.Mock).mockResolvedValue({
      totalProperties: 5,
      totalUnits: 40,
      occupiedUnits: 32,
      vacantUnits: 6,
    });

    const result = await useCase.execute({ tenantId: 'tenant_A' });

    expect(result).toEqual({
      totalProperties: 5,
      totalUnits: 40,
      occupiedUnits: 32,
      vacantUnits: 6,
      occupancyPercentage: 80,
    });
  });

  it('should return 0% when there are no units', async () => {
    (mockRepo.getOccupancyCounts as jest.Mock).mockResolvedValue({
      totalProperties: 2,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
    });

    const result = await useCase.execute({ tenantId: 'tenant_A' });

    expect(result.occupancyPercentage).toBe(0);
  });

  it('should round occupancy percentage to two decimal places', async () => {
    (mockRepo.getOccupancyCounts as jest.Mock).mockResolvedValue({
      totalProperties: 1,
      totalUnits: 3,
      occupiedUnits: 1,
      vacantUnits: 2,
    });

    const result = await useCase.execute({ tenantId: 'tenant_A' });

    expect(result.occupancyPercentage).toBe(33.33);
  });

  it('should forward the tenantId to the repository', async () => {
    (mockRepo.getOccupancyCounts as jest.Mock).mockResolvedValue({
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
    });

    await useCase.execute({ tenantId: 'tenant_XYZ' });

    expect(mockRepo.getOccupancyCounts).toHaveBeenCalledWith('tenant_XYZ');
  });

  it('should propagate repository errors', async () => {
    (mockRepo.getOccupancyCounts as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(useCase.execute({ tenantId: 'tenant_A' })).rejects.toThrow(
      'DB connection failed',
    );
  });

  describe('cross-tenant isolation', () => {
    // Occupancy counts are always scoped to the caller's tenantId.
    it('scopes the counts to the caller tenant', async () => {
      (mockRepo.getOccupancyCounts as jest.Mock).mockResolvedValue({
        totalProperties: 0,
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
      });

      await useCase.execute({ tenantId: 'tenant_B' });

      expect(mockRepo.getOccupancyCounts).toHaveBeenCalledWith('tenant_B');
    });
  });
});
