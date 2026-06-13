import {
  ListTenantContactsUseCase,
  ListTenantContactsUseCaseInput,
} from './list-tenant-contacts.use-case';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';
import { PagedTenantContacts } from '../types/tenant-contact-repository.types';

/**
 * Unit tests for ListTenantContactsUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - TenantContactRepository is mocked entirely.
 */

void TENANT_CONTACT_REPOSITORY;

describe('ListTenantContactsUseCase', () => {
  const mockCreatedAt = new Date('2026-06-05T12:00:00.000Z');
  const mockUpdatedAt = new Date('2026-06-05T12:00:00.000Z');

  const mockContact: TenantContact = {
    id: 'contact_001',
    tenantId: 'tenant_A',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    phone: null,
    idNumber: null,
    notes: null,
    deletedAt: null,
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
  };

  const validInput: ListTenantContactsUseCaseInput = {
    tenantId: 'tenant_A',
    page: 1,
    limit: 20,
  };

  const mockRepo: jest.Mocked<TenantContactRepository> = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findPagedByTenant: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: ListTenantContactsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListTenantContactsUseCase(mockRepo);
  });

  describe('TC-US1 — successful list', () => {
    it('TC-US1-A: returns the paged result from the repository', async () => {
      const pagedResult: PagedTenantContacts = { items: [mockContact], total: 1 };
      mockRepo.findPagedByTenant.mockResolvedValueOnce(pagedResult);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(pagedResult);
    });

    it('TC-US1-B: calls findPagedByTenant with tenantId and pagination options', async () => {
      mockRepo.findPagedByTenant.mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute({ tenantId: 'tenant_A', page: 2, limit: 10 });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', {
        page: 2,
        limit: 10,
      });
      expect(mockRepo.findPagedByTenant).toHaveBeenCalledTimes(1);
    });

    it('TC-US1-C: returns empty items and zero total for an empty workspace', async () => {
      mockRepo.findPagedByTenant.mockResolvedValueOnce({ items: [], total: 0 });

      const result = await useCase.execute(validInput);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('TC-US1-D: does not call create or findByEmail', async () => {
      mockRepo.findPagedByTenant.mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute(validInput);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findByEmail).not.toHaveBeenCalled();
    });

    it('TC-US1-E: propagates repository errors without swallowing them', async () => {
      const dbError = new Error('DB connection failed');
      mockRepo.findPagedByTenant.mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });
});
