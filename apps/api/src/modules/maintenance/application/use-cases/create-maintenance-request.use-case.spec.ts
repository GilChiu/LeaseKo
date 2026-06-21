import { NotFoundException } from '@nestjs/common';
import { CreateMaintenanceRequestUseCase } from './create-maintenance-request.use-case';
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
  description: 'The kitchen faucet has been dripping for 2 days.',
  status: 'OPEN',
  priority: 'MEDIUM',
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CreateMaintenanceRequestUseCase', () => {
  const mockRepo: MaintenanceRequestRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  let useCase: CreateMaintenanceRequestUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateMaintenanceRequestUseCase(mockRepo);
  });

  it('should create a maintenance request with status OPEN', async () => {
    (mockRepo.create as jest.Mock).mockResolvedValue(baseRequest);

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      propertyId: 'prop_001',
      unitId: 'unit_001',
      title: 'Leaking faucet in kitchen',
      description: 'The kitchen faucet has been dripping for 2 days.',
      priority: 'MEDIUM',
    });

    expect(result).toEqual(baseRequest);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN' }),
    );
  });

  it('should throw NotFoundException when repository returns null', async () => {
    (mockRepo.create as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId: 'tenant_A',
        propertyId: 'nonexistent',
        unitId: 'unit_001',
        title: 'Test',
        priority: 'LOW',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should always set status to OPEN', async () => {
    (mockRepo.create as jest.Mock).mockResolvedValue(baseRequest);

    await useCase.execute({
      tenantId: 'tenant_A',
      propertyId: 'prop_001',
      unitId: 'unit_001',
      title: 'Test',
      priority: 'HIGH',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN' }),
    );
  });

  it('should default undefined description and notes to null', async () => {
    (mockRepo.create as jest.Mock).mockResolvedValue(baseRequest);

    await useCase.execute({
      tenantId: 'tenant_A',
      propertyId: 'prop_001',
      unitId: 'unit_001',
      title: 'Test',
      priority: 'LOW',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: null, notes: null }),
    );
  });

  it('should forward all arguments to the repository', async () => {
    (mockRepo.create as jest.Mock).mockResolvedValue(baseRequest);

    await useCase.execute({
      tenantId: 'tenant_A',
      propertyId: 'prop_001',
      unitId: 'unit_001',
      title: 'Broken window',
      description: 'Window in bedroom is cracked.',
      priority: 'URGENT',
      notes: 'Tenant reports cold air coming in.',
    });

    expect(mockRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant_A',
      propertyId: 'prop_001',
      unitId: 'unit_001',
      title: 'Broken window',
      description: 'Window in bedroom is cracked.',
      status: 'OPEN',
      priority: 'URGENT',
      notes: 'Tenant reports cold air coming in.',
    });
  });

  it('should propagate repository errors', async () => {
    (mockRepo.create as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant_A',
        propertyId: 'prop_001',
        unitId: 'unit_001',
        title: 'Test',
        priority: 'LOW',
      }),
    ).rejects.toThrow('DB connection failed');
  });
});
