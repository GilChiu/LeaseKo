import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateInvoiceUseCase } from './create-invoice.use-case';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../../../leases/application/repositories/lease.repository';
import { Invoice } from '../../domain/entities/invoice.entity';
import { Lease } from '../../../leases/domain/entities/lease.entity';

void INVOICE_REPOSITORY;
void LEASE_REPOSITORY;

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
  depositAmount: 50000,
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseInvoice: Invoice = {
  id: 'inv_001',
  tenantId: 'tenant_A',
  leaseId: 'lease_001',
  tenantContactId: 'contact_001',
  invoiceNumber: 'INV-202607-A3K9',
  dueDate: new Date('2026-07-01'),
  amount: 25000,
  notes: null,
  status: 'DRAFT',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseInput = {
  tenantId: 'tenant_A',
  leaseId: 'lease_001',
  dueDate: new Date('2026-07-01'),
  amount: 25000,
  notes: null,
};

describe('CreateInvoiceUseCase', () => {
  const mockInvoiceRepo: InvoiceRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    existsByLeaseAndMonth: jest.fn(),
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
  };

  let useCase: CreateInvoiceUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateInvoiceUseCase(mockInvoiceRepo, mockLeaseRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path
    it('returns created invoice when lease is active and inputs are valid', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(baseInvoice);

      const result = await useCase.execute(baseInput);

      expect(result).toEqual(baseInvoice);
      expect(mockLeaseRepo.findById).toHaveBeenCalledWith('lease_001', 'tenant_A');
    });

    // TC2 — Lease not found
    it('throws NotFoundException when lease is not found', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundException);
      expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    });

    // TC3 — Lease not ACTIVE
    it('throws BadRequestException when lease is not active', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        status: 'DRAFT',
      });

      await expect(useCase.execute(baseInput)).rejects.toThrow(BadRequestException);
      expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    });

    // TC4 — Invoice repo returns null (FK validation failed)
    it('throws NotFoundException when invoice repository returns null', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundException);
    });

    // TC5 — tenantContactId copied from lease
    it('passes tenantContactId from the lease to invoice creation', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(baseInvoice);

      await useCase.execute(baseInput);

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.tenantContactId).toBe('contact_001');
    });

    // TC6 — invoiceNumber format
    it('generates invoiceNumber matching INV-YYYYMM-XXXX format', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(baseInvoice);

      await useCase.execute(baseInput);

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.invoiceNumber).toMatch(/^INV-202607-[A-Z0-9]{4}$/);
    });

    // TC7 — Undefined notes defaults to null
    it('converts undefined notes to null', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce(baseInvoice);

      await useCase.execute({ ...baseInput, notes: undefined });

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.notes).toBeNull();
    });

    // TC8 — Error propagation
    it('propagates unexpected repository errors', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      const repoError = new Error('DB connection failed');
      (mockInvoiceRepo.create as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(useCase.execute(baseInput)).rejects.toBe(repoError);
    });
  });

  describe('cross-tenant isolation', () => {
    // A tenant_B caller invoicing a tenant_A lease: the lease repo is queried
    // with tenant_B's id and finds nothing → NotFoundException, no invoice made.
    it('rejects invoicing another tenant\'s lease with NotFoundException', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ ...baseInput, tenantId: 'tenant_B' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockLeaseRepo.findById).toHaveBeenCalledWith('lease_001', 'tenant_B');
      expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    });

    it('creates the invoice under the caller tenant', async () => {
      (mockLeaseRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        tenantId: 'tenant_B',
      });
      (mockInvoiceRepo.create as jest.Mock).mockResolvedValueOnce({
        ...baseInvoice,
        tenantId: 'tenant_B',
      });

      await useCase.execute({ ...baseInput, tenantId: 'tenant_B' });

      const createArg = (mockInvoiceRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.tenantId).toBe('tenant_B');
    });
  });
});
