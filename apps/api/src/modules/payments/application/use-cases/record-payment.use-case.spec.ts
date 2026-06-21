import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecordPaymentUseCase } from './record-payment.use-case';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
} from '../repositories/payment.repository';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../../../invoices/application/repositories/invoice.repository';
import { Payment } from '../../domain/entities/payment.entity';
import { Invoice } from '../../../invoices/domain/entities/invoice.entity';

void PAYMENT_REPOSITORY;
void INVOICE_REPOSITORY;

const pendingInvoice: Invoice = {
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
};

const completedPayment: Payment = {
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

const baseInput = {
  tenantId: 'tenant_A',
  invoiceId: 'inv_001',
  amount: 25000,
  method: 'BANK_TRANSFER' as const,
  recordedAt: new Date('2026-07-15'),
  notes: null,
};

describe('RecordPaymentUseCase', () => {
  const mockPaymentRepo: PaymentRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    getTotalPaidByInvoice: jest.fn(),
  };

  const mockInvoiceRepo: InvoiceRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    existsByLeaseAndMonth: jest.fn(),
    updateStatus: jest.fn(),
  };

  let useCase: RecordPaymentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RecordPaymentUseCase(mockPaymentRepo, mockInvoiceRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path
    it('records payment when invoice is pending and amount is valid', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(0);
      (mockPaymentRepo.create as jest.Mock).mockResolvedValueOnce(completedPayment);

      const result = await useCase.execute(baseInput);

      expect(result).toEqual(completedPayment);
      expect(mockInvoiceRepo.findById).toHaveBeenCalledWith('inv_001', 'tenant_A');
      expect(mockPaymentRepo.getTotalPaidByInvoice).toHaveBeenCalledWith('inv_001', 'tenant_A');
    });

    // TC2 — Invoice not found
    it('throws NotFoundException when invoice is not found', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundException);
      expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });

    // TC3 — Invoice already PAID
    it('throws BadRequestException when invoice is already paid', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...pendingInvoice,
        status: 'PAID',
      });

      await expect(useCase.execute(baseInput)).rejects.toThrow(BadRequestException);
      expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });

    // TC4 — Invoice is VOID
    it('throws BadRequestException when invoice is void', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...pendingInvoice,
        status: 'VOID',
      });

      await expect(useCase.execute(baseInput)).rejects.toThrow(BadRequestException);
      expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });

    // TC5 — Overpayment
    it('throws BadRequestException when payment exceeds remaining balance', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(20000);

      await expect(
        useCase.execute({ ...baseInput, amount: 10000 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });

    // TC6 — Auto-updates invoice to PAID when fully paid
    it('updates invoice status to PAID when fully paid', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(0);
      (mockPaymentRepo.create as jest.Mock).mockResolvedValueOnce(completedPayment);

      await useCase.execute(baseInput);

      expect(mockInvoiceRepo.updateStatus).toHaveBeenCalledWith(
        'inv_001',
        'tenant_A',
        'PAID',
      );
    });

    // TC7 — Does NOT update invoice when partially paid
    it('does not update invoice status when partially paid', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(0);
      (mockPaymentRepo.create as jest.Mock).mockResolvedValueOnce({
        ...completedPayment,
        amount: 10000,
      });

      await useCase.execute({ ...baseInput, amount: 10000 });

      expect(mockInvoiceRepo.updateStatus).not.toHaveBeenCalled();
    });

    // TC8 — Exact remaining amount succeeds
    it('succeeds when payment amount equals remaining balance exactly', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(20000);
      (mockPaymentRepo.create as jest.Mock).mockResolvedValueOnce({
        ...completedPayment,
        amount: 5000,
      });

      const result = await useCase.execute({ ...baseInput, amount: 5000 });

      expect(result.amount).toBe(5000);
      expect(mockInvoiceRepo.updateStatus).toHaveBeenCalledWith(
        'inv_001',
        'tenant_A',
        'PAID',
      );
    });

    // TC9 — Payment status is always COMPLETED
    it('creates payment with status COMPLETED', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(0);
      (mockPaymentRepo.create as jest.Mock).mockResolvedValueOnce(completedPayment);

      await useCase.execute(baseInput);

      const createArg = (mockPaymentRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.status).toBe('COMPLETED');
    });

    // TC10 — Undefined notes defaults to null
    it('converts undefined notes to null', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(0);
      (mockPaymentRepo.create as jest.Mock).mockResolvedValueOnce(completedPayment);

      await useCase.execute({ ...baseInput, notes: undefined });

      const createArg = (mockPaymentRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.notes).toBeNull();
    });

    // TC11 — Payment repo returns null
    it('throws NotFoundException when payment repository returns null', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockResolvedValueOnce(0);
      (mockPaymentRepo.create as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundException);
    });

    // TC12 — Error propagation
    it('propagates unexpected repository errors', async () => {
      (mockInvoiceRepo.findById as jest.Mock).mockResolvedValueOnce(pendingInvoice);
      const repoError = new Error('DB connection failed');
      (mockPaymentRepo.getTotalPaidByInvoice as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(useCase.execute(baseInput)).rejects.toBe(repoError);
    });
  });
});
