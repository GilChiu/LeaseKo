import { GenerateRecurringInvoicesUseCase } from './generate-recurring-invoices.use-case';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../../../leases/application/repositories/lease.repository';
import { Lease } from '../../../leases/domain/entities/lease.entity';
import { Invoice } from '../../domain/entities/invoice.entity';

void INVOICE_REPOSITORY;
void LEASE_REPOSITORY;

function makeLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 'lease_001',
    tenantId: 'tenant_A',
    propertyId: 'prop_001',
    unitId: 'unit_001',
    tenantContactId: 'contact_001',
    status: 'ACTIVE',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    monthlyRent: 25000,
    depositAmount: 50000,
    notes: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv_001',
    tenantId: 'tenant_A',
    leaseId: 'lease_001',
    tenantContactId: 'contact_001',
    invoiceNumber: 'INV-202607-A3K9',
    dueDate: new Date('2026-07-01'),
    amount: 25000,
    notes: null,
    status: 'PENDING',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const baseInput = {
  tenantId: 'tenant_A',
  billingMonth: 7,
  billingYear: 2026,
};

describe('GenerateRecurringInvoicesUseCase', () => {
  const mockInvoiceRepo: InvoiceRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    existsByLeaseAndMonth: jest.fn(),
    findPagedByTenantContact: jest.fn(),
    sumOutstandingByTenantContact: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockLeaseRepo: LeaseRepository = {
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

  let useCase: GenerateRecurringInvoicesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GenerateRecurringInvoicesUseCase(mockInvoiceRepo, mockLeaseRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: all leases generate invoices
    it('generates invoices for all active leases when none exist', async () => {
      const leases = [
        makeLease({ id: 'lease_001' }),
        makeLease({ id: 'lease_002', tenantContactId: 'contact_002', monthlyRent: 30000 }),
        makeLease({ id: 'lease_003', tenantContactId: 'contact_003', monthlyRent: 15000 }),
      ];
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce(leases);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock).mockResolvedValue(false);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValue(makeInvoice());

      const result = await useCase.execute(baseInput);

      expect(result).toEqual({ generated: 3, skipped: 0 });
      expect(mockInvoiceRepo.create).toHaveBeenCalledTimes(3);
    });

    // TC2 — All leases already have invoices
    it('skips all leases when invoices already exist for the month', async () => {
      const leases = [
        makeLease({ id: 'lease_001' }),
        makeLease({ id: 'lease_002' }),
        makeLease({ id: 'lease_003' }),
      ];
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce(leases);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock).mockResolvedValue(true);

      const result = await useCase.execute(baseInput);

      expect(result).toEqual({ generated: 0, skipped: 3 });
      expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    });

    // TC3 — Mixed: some new, some existing
    it('generates for new and skips existing', async () => {
      const leases = [
        makeLease({ id: 'lease_001' }),
        makeLease({ id: 'lease_002' }),
        makeLease({ id: 'lease_003' }),
      ];
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce(leases);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValue(makeInvoice());

      const result = await useCase.execute(baseInput);

      expect(result).toEqual({ generated: 2, skipped: 1 });
      expect(mockInvoiceRepo.create).toHaveBeenCalledTimes(2);
    });

    // TC4 — No active leases
    it('returns zero counts when no active leases exist', async () => {
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce([]);

      const result = await useCase.execute(baseInput);

      expect(result).toEqual({ generated: 0, skipped: 0 });
      expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    });

    // TC5 — Status is PENDING
    it('creates invoices with status PENDING', async () => {
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce([
        makeLease(),
      ]);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock).mockResolvedValueOnce(false);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(makeInvoice());

      await useCase.execute(baseInput);

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.status).toBe('PENDING');
    });

    // TC6 — dueDate is 1st of billing month
    it('sets dueDate to the 1st of the billing month', async () => {
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce([
        makeLease(),
      ]);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock).mockResolvedValueOnce(false);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(makeInvoice());

      await useCase.execute(baseInput);

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      const expectedDate = new Date(2026, 6, 1); // July 1, 2026
      expect(createArg.dueDate.getTime()).toBe(expectedDate.getTime());
    });

    // TC7 — Amount equals lease monthlyRent
    it('uses lease monthlyRent as invoice amount', async () => {
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce([
        makeLease({ monthlyRent: 42000 }),
      ]);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock).mockResolvedValueOnce(false);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(makeInvoice());

      await useCase.execute(baseInput);

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.amount).toBe(42000);
    });

    // TC8 — tenantContactId from lease
    it('uses tenantContactId from each lease', async () => {
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce([
        makeLease({ tenantContactId: 'contact_XYZ' }),
      ]);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock).mockResolvedValueOnce(false);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(makeInvoice());

      await useCase.execute(baseInput);

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.tenantContactId).toBe('contact_XYZ');
    });

    // TC9 — Error from invoice creation propagates
    it('propagates errors from invoice creation', async () => {
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockResolvedValueOnce([
        makeLease(),
      ]);
      (mockInvoiceRepo.existsByLeaseAndMonth as jest.Mock).mockResolvedValueOnce(false);
      const dbError = new Error('DB write failed');
      (mockInvoiceRepo.create as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(useCase.execute(baseInput)).rejects.toBe(dbError);
    });

    // TC10 — Error from lease fetch propagates
    it('propagates errors from lease fetching', async () => {
      const dbError = new Error('DB read failed');
      (mockLeaseRepo.findActiveByTenant as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(useCase.execute(baseInput)).rejects.toBe(dbError);
    });
  });
});
