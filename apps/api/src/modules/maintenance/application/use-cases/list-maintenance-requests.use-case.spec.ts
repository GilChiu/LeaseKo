import { ListMaintenanceRequestsUseCase } from './list-maintenance-requests.use-case';
import {
  MAINTENANCE_REQUEST_REPOSITORY,
  MaintenanceRequestRepository,
} from '../repositories/maintenance-request.repository';
import { MaintenanceRequest } from '../../domain/entities/maintenance-request.entity';
import { PagedMaintenanceRequests } from '../types/maintenance-request-repository.types';

void MAINTENANCE_REQUEST_REPOSITORY;

const baseRequest: MaintenanceRequest = {
  id: 'mr_001',
  tenantId: 'tenant_A',
  propertyId: 'prop_001',
  unitId: 'unit_001',
  title: 'Leaking faucet',
  description: null,
  status: 'OPEN',
  priority: 'MEDIUM',
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ListMaintenanceRequestsUseCase', () => {
  const mockRepo: MaintenanceRequestRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  let useCase: ListMaintenanceRequestsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListMaintenanceRequestsUseCase(mockRepo);
  });

  it('should return paginated maintenance requests', async () => {
    const pagedResult: PagedMaintenanceRequests = {
      items: [baseRequest],
      total: 1,
    };
    (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue(pagedResult);

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      page: 1,
      limit: 20,
    });

    expect(result).toEqual(pagedResult);
  });

  it('should forward all arguments to the repository', async () => {
    (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      tenantId: 'tenant_A',
      page: 2,
      limit: 10,
      status: 'OPEN',
      priority: 'HIGH',
    });

    expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', {
      page: 2,
      limit: 10,
      status: 'OPEN',
      priority: 'HIGH',
    });
  });

  it('should return empty list for workspace with no requests', async () => {
    (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await useCase.execute({
      tenantId: 'tenant_EMPTY',
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should forward status filter to the repository', async () => {
    (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      tenantId: 'tenant_A',
      page: 1,
      limit: 20,
      status: 'RESOLVED',
    });

    expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith(
      'tenant_A',
      expect.objectContaining({ status: 'RESOLVED' }),
    );
  });

  it('should forward priority filter to the repository', async () => {
    (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      tenantId: 'tenant_A',
      page: 1,
      limit: 20,
      priority: 'URGENT',
    });

    expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith(
      'tenant_A',
      expect.objectContaining({ priority: 'URGENT' }),
    );
  });

  it('should only call findPagedByTenant on the repository', async () => {
    (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      tenantId: 'tenant_A',
      page: 1,
      limit: 20,
    });

    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockRepo.findById).not.toHaveBeenCalled();
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('should propagate repository errors', async () => {
    (mockRepo.findPagedByTenant as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow('DB connection failed');
  });

  describe('cross-tenant isolation', () => {
    // The listing is always scoped to the caller's tenantId.
    it('scopes the query to the caller tenant', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      await useCase.execute({ tenantId: 'tenant_B', page: 1, limit: 20 });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith(
        'tenant_B',
        expect.anything(),
      );
    });
  });
});
