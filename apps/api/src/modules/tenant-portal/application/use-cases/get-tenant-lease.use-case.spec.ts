import { NotFoundException } from '@nestjs/common';
import { GetTenantLeaseUseCase } from './get-tenant-lease.use-case';
import { LeaseRepository } from '../../../leases/application/repositories/lease.repository';
import { Lease } from '../../../leases/domain/entities/lease.entity';

const mockLease: Lease = {
  id: 'lease_001',
  tenantId: 'tenant_A',
  propertyId: 'prop_001',
  unitId: 'unit_001',
  tenantContactId: 'contact_001',
  status: 'ACTIVE',
  startDate: new Date('2026-07-01'),
  endDate: new Date('2027-06-30'),
  monthlyRent: 25000,
  depositAmount: null,
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GetTenantLeaseUseCase', () => {
  const mockRepo: LeaseRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    activate: jest.fn(),
    expire: jest.fn(),
    terminate: jest.fn(),
    hasActiveLeaseForUnit: jest.fn(),
    findActiveByTenant: jest.fn(),
    findActiveByTenantContact: jest.fn(),
  };

  let useCase: GetTenantLeaseUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetTenantLeaseUseCase(mockRepo);
  });

  it('returns the active lease for the renter', async () => {
    (mockRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(
      mockLease,
    );

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
    });

    expect(result).toEqual(mockLease);
  });

  it('scopes the lookup to the caller tenant and contact', async () => {
    (mockRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(
      mockLease,
    );

    await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
    });

    expect(mockRepo.findActiveByTenantContact).toHaveBeenCalledWith(
      'tenant_A',
      'contact_001',
    );
    expect(mockRepo.findActiveByTenantContact).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when the renter has no active lease', async () => {
    (mockRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ tenantId: 'tenant_A', tenantContactId: 'contact_x' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('propagates repository errors', async () => {
    (mockRepo.findActiveByTenantContact as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(
      useCase.execute({ tenantId: 'tenant_A', tenantContactId: 'contact_001' }),
    ).rejects.toThrow('DB connection failed');
  });
});
