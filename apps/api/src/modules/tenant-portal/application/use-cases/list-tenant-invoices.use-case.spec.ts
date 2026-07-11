import { ListTenantInvoicesUseCase } from './list-tenant-invoices.use-case';
import { InvoiceRepository } from '../../../invoices/application/repositories/invoice.repository';
import { Invoice } from '../../../invoices/domain/entities/invoice.entity';
import { PagedInvoices } from '../../../invoices/application/types/invoice-repository.types';

const mockInvoice: Invoice = {
  id: 'inv_001',
  tenantId: 'tenant_A',
  leaseId: 'lease_001',
  tenantContactId: 'contact_001',
  invoiceNumber: 'INV-202607-0001',
  dueDate: new Date('2026-07-01'),
  amount: 25000,
  notes: null,
  status: 'PENDING',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ListTenantInvoicesUseCase', () => {
  const mockRepo: InvoiceRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findPagedByTenantContact: jest.fn(),
    sumOutstandingByTenantContact: jest.fn(),
    findById: jest.fn(),
    existsByLeaseAndMonth: jest.fn(),
    updateStatus: jest.fn(),
  };

  let useCase: ListTenantInvoicesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListTenantInvoicesUseCase(mockRepo);
  });

  it('returns the renter\'s paginated invoices', async () => {
    const paged: PagedInvoices = { items: [mockInvoice], total: 1 };
    (mockRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue(paged);

    const result = await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
      page: 1,
      limit: 20,
    });

    expect(result).toEqual(paged);
  });

  it('forwards tenant, contact, pagination and status filter to the repository', async () => {
    (mockRepo.findPagedByTenantContact as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      tenantId: 'tenant_A',
      tenantContactId: 'contact_001',
      page: 2,
      limit: 10,
      status: 'OVERDUE',
    });

    expect(mockRepo.findPagedByTenantContact).toHaveBeenCalledWith(
      'tenant_A',
      'contact_001',
      { page: 2, limit: 10, status: 'OVERDUE' },
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
