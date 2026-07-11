import { ListTenantPaymentsUseCase } from './list-tenant-payments.use-case';
import { PaymentRepository } from '../../../payments/application/repositories/payment.repository';
import { Payment } from '../../../payments/domain/entities/payment.entity';
import { PagedPayments } from '../../../payments/application/types/payment-repository.types';

const mockPayment: Payment = {
  id: 'pay_001',
  tenantId: 'tenant_A',
  invoiceId: 'inv_001',
  amount: 25000,
  method: 'BANK_TRANSFER',
  status: 'COMPLETED',
  recordedAt: new Date('2026-07-05'),
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ListTenantPaymentsUseCase', () => {
  const mockRepo: PaymentRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findPagedByTenantContact: jest.fn(),
    findById: jest.fn(),
    getTotalPaidByInvoice: jest.fn(),
  };

  let useCase: ListTenantPaymentsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListTenantPaymentsUseCase(mockRepo);
  });

  it('returns the renter\'s paginated payment history', async () => {
    const paged: PagedPayments = { items: [mockPayment], total: 1 };
    (mockRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue(paged);

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
      page: 1,
      limit: 20,
    });

    expect(result).toEqual(paged);
  });

  it('forwards tenant, contact and pagination to the repository', async () => {
    (mockRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
      page: 3,
      limit: 5,
    });

    expect(mockRepo.findPagedByTenantContact).toHaveBeenCalledWith(
      'tenant_A',
      'contact_001',
      { page: 3, limit: 5 },
    );
  });

  it('never calls the workspace-wide listing method', async () => {
    (mockRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
      page: 1,
      limit: 20,
    });

    expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    (mockRepo.findPagedByTenantContact as jest.Mock).mockRejectedValue(
      new Error('DB connection failed'),
    );

    await expect(
      useCase.execute({
        tenantId: 'tenant_A',
        tenantContactId: 'contact_001',
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow('DB connection failed');
  });
});
