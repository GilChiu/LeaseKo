import { GetTenantDashboardUseCase } from './get-tenant-dashboard.use-case';
import { LeaseRepository } from '../../../leases/application/repositories/lease.repository';
import { Lease } from '../../../leases/domain/entities/lease.entity';
import { InvoiceRepository } from '../../../invoices/application/repositories/invoice.repository';
import { PaymentRepository } from '../../../payments/application/repositories/payment.repository';
import { Payment } from '../../../payments/domain/entities/payment.entity';
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

const payment: Payment = {
  id: 'pay_001',
  tenantId: 'tenant_A',
  invoiceId: 'inv_001',
  amount: 25000,
  method: 'GCASH',
  status: 'COMPLETED',
  recordedAt: new Date('2026-07-05'),
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const maintenance: MaintenanceRequest = {
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

describe('GetTenantDashboardUseCase', () => {
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
  const invoiceRepo: InvoiceRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findPagedByTenantContact: jest.fn(),
    sumOutstandingByTenantContact: jest.fn(),
    findById: jest.fn(),
    existsByLeaseAndMonth: jest.fn(),
    updateStatus: jest.fn(),
  };
  const paymentRepo: PaymentRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findPagedByTenantContact: jest.fn(),
    findById: jest.fn(),
    getTotalPaidByInvoice: jest.fn(),
  };
  const maintenanceRepo: MaintenanceRequestRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    findRecentByUnit: jest.fn(),
    countActiveByUnit: jest.fn(),
  };

  let useCase: GetTenantDashboardUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetTenantDashboardUseCase(
      leaseRepo,
      invoiceRepo,
      paymentRepo,
      maintenanceRepo,
    );
  });

  it('assembles the dashboard, scoping maintenance to the active lease unit', async () => {
    (leaseRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(
      activeLease,
    );
    (invoiceRepo.sumOutstandingByTenantContact as jest.Mock).mockResolvedValue(
      25000,
    );
    (paymentRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue({
      items: [payment],
      total: 1,
    });
    (maintenanceRepo.countActiveByUnit as jest.Mock).mockResolvedValue(1);
    (maintenanceRepo.findRecentByUnit as jest.Mock).mockResolvedValue([
      maintenance,
    ]);

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
    });

    expect(result).toEqual({
      currentLease: activeLease,
      outstandingBalance: 25000,
      recentPayments: [payment],
      openMaintenanceCount: 1,
      recentMaintenance: [maintenance],
    });
    expect(maintenanceRepo.countActiveByUnit).toHaveBeenCalledWith(
      'tenant_A',
      'unit_001',
    );
    expect(maintenanceRepo.findRecentByUnit).toHaveBeenCalledWith(
      'tenant_A',
      'unit_001',
      5,
    );
  });

  it('skips maintenance lookups when the renter has no active lease', async () => {
    (leaseRepo.findActiveByTenantContact as jest.Mock).mockResolvedValue(null);
    (invoiceRepo.sumOutstandingByTenantContact as jest.Mock).mockResolvedValue(
      0,
    );
    (paymentRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
    });

    expect(result.currentLease).toBeNull();
    expect(result.openMaintenanceCount).toBe(0);
    expect(result.recentMaintenance).toEqual([]);
    expect(maintenanceRepo.countActiveByUnit).not.toHaveBeenCalled();
    expect(maintenanceRepo.findRecentByUnit).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    (leaseRepo.findActiveByTenantContact as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );
    (invoiceRepo.sumOutstandingByTenantContact as jest.Mock).mockResolvedValue(
      0,
    );
    (paymentRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await expect(
      useCase.execute({ tenantId: 'tenant_A', tenantContactId: 'contact_001' }),
    ).rejects.toThrow('DB connection failed');
  });
});
