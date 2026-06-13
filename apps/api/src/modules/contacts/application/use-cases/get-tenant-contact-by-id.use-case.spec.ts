import { NotFoundException } from '@nestjs/common';
import {
  GetTenantContactByIdUseCase,
  GetTenantContactByIdUseCaseInput,
} from './get-tenant-contact-by-id.use-case';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

void TENANT_CONTACT_REPOSITORY;

describe('GetTenantContactByIdUseCase', () => {
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
    createdAt: new Date('2026-06-05T12:00:00.000Z'),
    updatedAt: new Date('2026-06-05T12:00:00.000Z'),
  };

  const validInput: GetTenantContactByIdUseCaseInput = {
    id: 'contact_001',
    tenantId: 'tenant_A',
  };

  const mockRepo: jest.Mocked<TenantContactRepository> = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findPagedByTenant: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: GetTenantContactByIdUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetTenantContactByIdUseCase(mockRepo);
  });

  describe('TC-US1 — contact found', () => {
    it('TC-US1-A: returns the contact when findById resolves a record', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockContact);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(mockContact);
    });

    it('TC-US1-B: calls findById with correct id and tenantId', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockContact);

      await useCase.execute(validInput);

      expect(mockRepo.findById).toHaveBeenCalledWith('contact_001', 'tenant_A');
      expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('TC-US1-C: does not call any other repository method', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockContact);

      await useCase.execute(validInput);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findByEmail).not.toHaveBeenCalled();
      expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
    });
  });

  describe('TC-US2 — contact not found', () => {
    it('TC-US2-A: throws NotFoundException when findById returns null', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('TC-US2-B: throws NotFoundException with the expected message', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Contact not found.',
      );
    });

    it('TC-US2-C: null from repo covers all three inaccessible cases (missing, cross-tenant, archived) — same exception', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute({ id: 'missing', tenantId: 'tenant_A' })).rejects.toThrow(NotFoundException);

      mockRepo.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute({ id: 'cross-tenant-id', tenantId: 'tenant_A' })).rejects.toThrow(NotFoundException);

      mockRepo.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute({ id: 'archived-id', tenantId: 'tenant_A' })).rejects.toThrow(NotFoundException);
    });

    it('TC-US2-D: propagates unexpected repository errors without swallowing them', async () => {
      const dbError = new Error('DB connection failed');
      mockRepo.findById.mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });
});
