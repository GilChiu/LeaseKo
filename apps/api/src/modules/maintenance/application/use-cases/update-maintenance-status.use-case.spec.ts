import { NotFoundException } from '@nestjs/common';
import { UpdateMaintenanceStatusUseCase } from './update-maintenance-status.use-case';
import {
  MAINTENANCE_REQUEST_REPOSITORY,
  MaintenanceRequestRepository,
} from '../repositories/maintenance-request.repository';
import { MaintenanceRequest } from '../../domain/entities/maintenance-request.entity';

void MAINTENANCE_REQUEST_REPOSITORY;

const baseRequest: MaintenanceRequest = {
  id: 'mr_001',
  tenantId: 'tenant_A',
  propertyId: 'prop_001',
  unitId: 'unit_001',
  title: 'Leaking faucet in kitchen',
  description: null,
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UpdateMaintenanceStatusUseCase', () => {
  const mockRepo: MaintenanceRequestRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  let useCase: UpdateMaintenanceStatusUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateMaintenanceStatusUseCase(mockRepo);
  });

  it('should return the updated maintenance request', async () => {
    (mockRepo.updateStatus as jest.Mock).mockResolvedValue(baseRequest);

    const result = await useCase.execute({
      id: 'mr_001',
      tenantId: 'tenant_A',
      status: 'IN_PROGRESS',
    });

    expect(result).toEqual(baseRequest);
  });

  it('should throw NotFoundException when request not found', async () => {
    (mockRepo.updateStatus as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'nonexistent',
        tenantId: 'tenant_A',
        status: 'CLOSED',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should forward id, tenantId, and status to the repository', async () => {
    (mockRepo.updateStatus as jest.Mock).mockResolvedValue(baseRequest);

    await useCase.execute({
      id: 'mr_001',
      tenantId: 'tenant_A',
      status: 'RESOLVED',
    });

    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'mr_001',
      'tenant_A',
      'RESOLVED',
    );
  });

  it('should throw NotFoundException for cross-tenant access', async () => {
    (mockRepo.updateStatus as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'mr_001',
        tenantId: 'tenant_B',
        status: 'CLOSED',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should only call updateStatus on the repository', async () => {
    (mockRepo.updateStatus as jest.Mock).mockResolvedValue(baseRequest);

    await useCase.execute({
      id: 'mr_001',
      tenantId: 'tenant_A',
      status: 'IN_PROGRESS',
    });

    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it('should propagate repository errors', async () => {
    (mockRepo.updateStatus as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(
      useCase.execute({
        id: 'mr_001',
        tenantId: 'tenant_A',
        status: 'CLOSED',
      }),
    ).rejects.toThrow('DB connection failed');
  });
});
