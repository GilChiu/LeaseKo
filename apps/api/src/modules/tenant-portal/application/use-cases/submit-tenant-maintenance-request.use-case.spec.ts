import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubmitTenantMaintenanceRequestUseCase } from './submit-tenant-maintenance-request.use-case';
import { LeaseRepository } from '../../../leases/application/repositories/lease.repository';
import { Lease } from '../../../leases/domain/entities/lease.entity';
import { MaintenanceRequestRepository } from '../../../maintenance/application/repositories/maintenance-request.repository';
import { MaintenanceRequest } from '../../../maintenance/domain/entities/maintenance-request.entity';

const activeLease: Lease = {
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

const createdRequest: MaintenanceRequest = {
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

describe('SubmitTenantMaintenanceRequestUseCase', () => {
  const leaseRepo: LeaseRepository = {
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

  const maintenanceRepo: MaintenanceRequestRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    findRecentByUnit: jest.fn(),
    countActiveByUnit: jest.fn(),
  };

  let useCase: SubmitTenantMaintenanceRequestUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SubmitTenantMaintenanceRequestUseCase(
      leaseRepo,
      maintenanceRepo,
    );
  });

  it('creates a request against the unit from the renter\'s active lease', async () => {
    (leaseRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(
      activeLease,
    );
    (maintenanceRepo.create as jest.Mock).mockResolvedValue(createdRequest);

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
      title: 'Leaking faucet',
      description: null,
      priority: 'MEDIUM',
    });

    expect(result).toEqual(createdRequest);
    // Security invariant: property/unit are taken from the lease, not the input.
    expect(maintenanceRepo.create).toHaveBeenCalledWith({
      tenantId: 'tenant_A',
      propertyId: 'prop_001',
      unitId: 'unit_001',
      title: 'Leaking faucet',
      description: null,
      status: 'OPEN',
      priority: 'MEDIUM',
      notes: null,
    });
  });

  it('resolves the lease scoped to the caller tenant and contact', async () => {
    (leaseRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(
      activeLease,
    );
    (maintenanceRepo.create as jest.Mock).mockResolvedValue(createdRequest);

    await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
      title: 'X',
      priority: 'LOW',
    });

    expect(leaseRepo.findActiveByTenantContact).toHaveBeenCalledWith(
      'tenant_A',
      'contact_001',
    );
  });

  it('throws ForbiddenException when the renter has no active lease', async () => {
    (leaseRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId: 'tenant_A',
        tenantContactId: 'contact_001',
        title: 'X',
        priority: 'LOW',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(maintenanceRepo.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the repository cannot resolve the unit', async () => {
    (leaseRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(
      activeLease,
    );
    (maintenanceRepo.create as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId: 'tenant_A',
        tenantContactId: 'contact_001',
        title: 'X',
        priority: 'LOW',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
