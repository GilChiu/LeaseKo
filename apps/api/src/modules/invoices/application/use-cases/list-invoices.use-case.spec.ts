import { ListInvoicesUseCase } from './list-invoices.use-case';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import { Invoice } from '../../domain/entities/invoice.entity';
import { PagedInvoices } from '../types/invoice-repository.types';

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

describe('ListInvoicesUseCase', () => {
  const mockRepo: InvoiceRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    existsByLeaseAndMonth: jest.fn(),
  };

  let useCase: ListInvoicesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListInvoicesUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path
    it('returns paged result from repository', async () => {
      const pagedResult: PagedInvoices = { items: [baseInvoice], total: 1 };
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce(pagedResult);

      const result = await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(pagedResult);
    });

    // TC2 — Argument forwarding
    it('forwards page, limit, and status to repository', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({
        tenantId: 'tenant_A',
        page: 3,
        limit: 50,
        status: 'PAID',
      });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', {
        page: 3,
        limit: 50,
        status: 'PAID',
      });
    });

    // TC3 — Empty workspace
    it('returns empty result when no invoices exist', async () => {
      const empty: PagedInvoices = { items: [], total: 0 };
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce(empty);

      const result = await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    // TC4 — Status filter forwarded
    it('passes status filter when provided', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
        status: 'OVERDUE',
      });

      const callArgs = (mockRepo.findPagedByTenant as jest.Mock).mock.calls[0];
      expect(callArgs[1].status).toBe('OVERDUE');
    });

    // TC5 — Single responsibility
    it('does not call unrelated repository methods', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 });

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    // TC6 — Error propagation
    it('propagates unexpected repository errors', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.findPagedByTenant as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 }),
      ).rejects.toBe(repoError);
    });
  });
});
