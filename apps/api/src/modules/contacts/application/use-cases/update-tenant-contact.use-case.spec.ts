import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  UpdateTenantContactUseCase,
  UpdateTenantContactUseCaseInput,
} from './update-tenant-contact.use-case';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

void TENANT_CONTACT_REPOSITORY;

describe('UpdateTenantContactUseCase', () => {
  const now = new Date('2026-06-05T12:00:00.000Z');
  const later = new Date('2026-06-05T13:00:00.000Z');

  const existingContact: TenantContact = {
    id: 'contact_001',
    tenantId: 'tenant_A',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    phone: null,
    idNumber: null,
    notes: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const updatedContact: TenantContact = {
    ...existingContact,
    firstName: 'Alicia',
    updatedAt: later,
  };

  const validInput: UpdateTenantContactUseCaseInput = {
    id: 'contact_001',
    tenantId: 'tenant_A',
    firstName: 'Alicia',
  };

  const mockRepo: jest.Mocked<TenantContactRepository> = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findPagedByTenant: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: UpdateTenantContactUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateTenantContactUseCase(mockRepo);
  });

  describe('TC-US1 — partial update', () => {
    it('TC-US1-A: returns the updated contact on success', async () => {
      mockRepo.findById.mockResolvedValueOnce(existingContact);
      mockRepo.update.mockResolvedValueOnce(updatedContact);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(updatedContact);
    });

    it('TC-US1-B: calls update with only the provided field', async () => {
      mockRepo.findById.mockResolvedValueOnce(existingContact);
      mockRepo.update.mockResolvedValueOnce(updatedContact);

      await useCase.execute({ id: 'contact_001', tenantId: 'tenant_A', firstName: 'Alicia' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'contact_001',
        'tenant_A',
        { firstName: 'Alicia' },
      );
    });

    it('TC-US1-C: calls update with all provided fields when all are supplied', async () => {
      mockRepo.findById.mockResolvedValueOnce(existingContact);
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      mockRepo.update.mockResolvedValueOnce({ ...existingContact, firstName: 'Bob', email: 'bob@example.com' });

      await useCase.execute({
        id: 'contact_001',
        tenantId: 'tenant_A',
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'Bob@Example.COM',
        phone: '123',
        idNumber: 'ID-1',
        notes: 'note',
      });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'contact_001',
        'tenant_A',
        expect.objectContaining({
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          phone: '123',
          idNumber: 'ID-1',
          notes: 'note',
        }),
      );
    });
  });

  describe('TC-US1-empty — empty body', () => {
    it('TC-US1-D: throws BadRequestException when no fields are provided', async () => {
      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('TC-US1-E: throws BadRequestException with the expected message', async () => {
      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A' }),
      ).rejects.toThrow('At least one field must be provided.');
    });

    it('TC-US1-F: does not call findById or update when body is empty', async () => {
      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('TC-US2 — not found', () => {
    it('TC-US2-A: throws NotFoundException when findById returns null', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('TC-US2-B: does not call update when contact not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('TC-US2 — email uniqueness', () => {
    it('TC-US2-C: allows self-email match (same email, same contact)', async () => {
      mockRepo.findById.mockResolvedValueOnce(existingContact);
      mockRepo.findByEmail.mockResolvedValueOnce(existingContact);
      mockRepo.update.mockResolvedValueOnce(existingContact);

      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A', email: 'alice@example.com' }),
      ).resolves.toBeDefined();
    });

    it('TC-US2-D: allows self-email match with different casing', async () => {
      mockRepo.findById.mockResolvedValueOnce(existingContact);
      mockRepo.findByEmail.mockResolvedValueOnce(existingContact);
      mockRepo.update.mockResolvedValueOnce(existingContact);

      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A', email: 'Alice@Example.COM' }),
      ).resolves.toBeDefined();

      expect(mockRepo.findByEmail).toHaveBeenCalledWith('tenant_A', 'alice@example.com');
    });

    it('TC-US2-E: throws ConflictException when email belongs to a different active contact', async () => {
      const otherContact: TenantContact = { ...existingContact, id: 'contact_002' };
      mockRepo.findById.mockResolvedValueOnce(existingContact);
      mockRepo.findByEmail.mockResolvedValueOnce(otherContact);

      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A', email: 'other@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('TC-US2-F: normalizes email to lowercase before update', async () => {
      mockRepo.findById.mockResolvedValueOnce(existingContact);
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      mockRepo.update.mockResolvedValueOnce({ ...existingContact, email: 'new@example.com' });

      await useCase.execute({ id: 'contact_001', tenantId: 'tenant_A', email: 'NEW@EXAMPLE.COM' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'contact_001',
        'tenant_A',
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });
  });
});
