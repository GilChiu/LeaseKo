import { ListPaymentsUseCase } from './list-payments.use-case';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
} from '../repositories/payment.repository';
import { Payment } from '../../domain/entities/payment.entity';
import { PagedPayments } from '../types/payment-repository.types';

void PAYMENT_REPOSITORY;

const basePayment: Payment = {
  id: 'pay_001',
  tenantId: 'tenant_A',
  invoiceId: 'inv_001',
  amount: 25000,
  method: 'BANK_TRANSFER',
  status: 'COMPLETED',
  recordedAt: new Date('2026-07-15'),
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ListPaymentsUseCase', () => {
  const mockRepo: PaymentRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    getTotalPaidByInvoice: jest.fn(),
  };

  let useCase: ListPaymentsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListPaymentsUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path
    it('returns paged result from repository', async () => {
      const pagedResult: PagedPayments = { items: [basePayment], total: 1 };
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce(pagedResult);

      const result = await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(pagedResult);
    });

    // TC2 — Argument forwarding
    it('forwards all parameters to repository', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({
        tenantId: 'tenant_A',
        page: 3,
        limit: 50,
        invoiceId: 'inv_001',
        method: 'GCASH',
        status: 'COMPLETED',
      });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', {
        page: 3,
        limit: 50,
        invoiceId: 'inv_001',
        method: 'GCASH',
        status: 'COMPLETED',
      });
    });

    // TC3 — Empty workspace
    it('returns empty result when no payments exist', async () => {
      const empty: PagedPayments = { items: [], total: 0 };
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce(empty);

      const result = await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    // TC4 — invoiceId filter forwarded
    it('passes invoiceId filter when provided', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
        invoiceId: 'inv_999',
      });

      const callArgs = (mockRepo.findPagedByTenant as jest.Mock).mock.calls[0];
      expect(callArgs[1].invoiceId).toBe('inv_999');
    });

    // TC5 — method filter forwarded
    it('passes method filter when provided', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
        method: 'CASH',
      });

      const callArgs = (mockRepo.findPagedByTenant as jest.Mock).mock.calls[0];
      expect(callArgs[1].method).toBe('CASH');
    });

    // TC6 — status filter forwarded
    it('passes status filter when provided', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({
        tenantId: 'tenant_A',
        page: 1,
        limit: 20,
        status: 'REFUNDED',
      });

      const callArgs = (mockRepo.findPagedByTenant as jest.Mock).mock.calls[0];
      expect(callArgs[1].status).toBe('REFUNDED');
    });

    // TC7 — Single responsibility
    it('does not call unrelated repository methods', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 });

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.getTotalPaidByInvoice).not.toHaveBeenCalled();
    });

    // TC8 — Error propagation
    it('propagates unexpected repository errors', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.findPagedByTenant as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 }),
      ).rejects.toBe(repoError);
    });
  });
});
