import { NotFoundException } from '@nestjs/common';
import { GetInvoiceByIdUseCase } from './get-invoice-by-id.use-case';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import { Invoice } from '../../domain/entities/invoice.entity';

void INVOICE_REPOSITORY;

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

describe('GetInvoiceByIdUseCase', () => {
  const mockRepo: InvoiceRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    existsByLeaseAndMonth: jest.fn(),
  };

  let useCase: GetInvoiceByIdUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetInvoiceByIdUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path
    it('returns invoice when found', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(baseInvoice);

      const result = await useCase.execute({ id: 'inv_001', tenantId: 'tenant_A' });

      expect(result).toEqual(baseInvoice);
    });

    // TC2 — Argument forwarding
    it('passes exact id and tenantId to repository', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(baseInvoice);

      await useCase.execute({ id: 'inv_001', tenantId: 'tenant_A' });

      expect(mockRepo.findById).toHaveBeenCalledWith('inv_001', 'tenant_A');
    });

    // TC3 — Not found
    it('throws NotFoundException when invoice is not found', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'inv_999', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC4 — Cross-tenant (indistinguishable from not found)
    it('throws NotFoundException for cross-tenant access', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'inv_001', tenantId: 'tenant_B' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC5 — Soft-deleted (indistinguishable from not found)
    it('throws NotFoundException for soft-deleted invoice', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'inv_deleted', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC6 — Single responsibility
    it('does not call unrelated repository methods', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(baseInvoice);

      await useCase.execute({ id: 'inv_001', tenantId: 'tenant_A' });

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
    });

    // TC7 — Error propagation
    it('propagates unexpected repository errors', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.findById as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ id: 'inv_001', tenantId: 'tenant_A' }),
      ).rejects.toBe(repoError);
    });
  });
});
