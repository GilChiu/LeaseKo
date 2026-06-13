import { ConflictException } from '@nestjs/common';
import {
  CreateTenantContactUseCase,
  CreateTenantContactUseCaseInput,
} from './create-tenant-contact.use-case';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

/**
 * Unit tests for CreateTenantContactUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - TenantContactRepository is mocked entirely.
 *
 * What is NOT tested here (belongs to other test suites):
 * - CreateTenantContactDto validation decorators
 * - ContactsController routing
 * - Swagger decorators
 * - PrismaTenantContactRepository integration
 * - Auth guard / @RequiresTenant() behavior
 */

void TENANT_CONTACT_REPOSITORY;

describe('CreateTenantContactUseCase', () => {
  const mockCreatedAt = new Date('2026-06-05T12:00:00.000Z');
  const mockUpdatedAt = new Date('2026-06-05T12:00:00.000Z');

  const mockContact: TenantContact = {
    id: 'contact_001',
    tenantId: 'tenant_A',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    phone: '+63 912 345 6789',
    idNumber: 'P-12345678A',
    notes: 'Prefers August move-in.',
    deletedAt: null,
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
  };

  const validInput: CreateTenantContactUseCaseInput = {
    tenantId: 'tenant_A',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    phone: '+63 912 345 6789',
    idNumber: 'P-12345678A',
    notes: 'Prefers August move-in.',
  };

  const mockRepo: jest.Mocked<TenantContactRepository> = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findPagedByTenant: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: CreateTenantContactUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateTenantContactUseCase(mockRepo);
  });

  // ── US1: Successful creation ──────────────────────────────────────────────

  describe('TC-US1 — successful creation', () => {
    it('TC-US1-A: returns the TenantContact created by the repository', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      mockRepo.create.mockResolvedValueOnce(mockContact);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(mockContact);
    });

    it('TC-US1-B: calls findByEmail with the normalized (lowercased) email', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      mockRepo.create.mockResolvedValueOnce(mockContact);

      await useCase.execute({ ...validInput, email: 'Alice@Example.COM' });

      expect(mockRepo.findByEmail).toHaveBeenCalledWith(
        'tenant_A',
        'alice@example.com',
      );
    });

    it('TC-US1-C: calls create with the normalized (lowercased) email', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      mockRepo.create.mockResolvedValueOnce(mockContact);

      await useCase.execute({ ...validInput, email: 'Alice@Example.COM' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'alice@example.com' }),
      );
    });

    it('TC-US1-D: calls create with null for omitted optional fields', async () => {
      const minimalInput: CreateTenantContactUseCaseInput = {
        tenantId: 'tenant_A',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
      };
      const minimalContact: TenantContact = {
        ...mockContact,
        phone: null,
        idNumber: null,
        notes: null,
      };
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      mockRepo.create.mockResolvedValueOnce(minimalContact);

      await useCase.execute(minimalInput);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: null,
          idNumber: null,
          notes: null,
        }),
      );
    });

    it('TC-US1-E: passes tenantId from input to create — never derived internally', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      mockRepo.create.mockResolvedValueOnce(mockContact);

      await useCase.execute(validInput);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant_A' }),
      );
    });

    it('TC-US1-F: propagates unexpected repository errors without swallowing them', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(null);
      const dbError = new Error('DB connection failed');
      mockRepo.create.mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });

  // ── US3: Duplicate email conflict ─────────────────────────────────────────

  describe('TC-US3 — duplicate email', () => {
    it('TC-US3-A: throws ConflictException when findByEmail returns an existing contact', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(mockContact);

      await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('TC-US3-B: throws ConflictException with the expected message', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(mockContact);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'A contact with this email already exists in this workspace.',
      );
    });

    it('TC-US3-C: does not call create when a duplicate is found', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(mockContact);

      await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('TC-US3-D: detects case-insensitive duplicate — uppercase input matches lowercase stored email', async () => {
      mockRepo.findByEmail.mockResolvedValueOnce(mockContact);

      await expect(
        useCase.execute({ ...validInput, email: 'ALICE@EXAMPLE.COM' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(mockRepo.findByEmail).toHaveBeenCalledWith(
        'tenant_A',
        'alice@example.com',
      );
    });
  });
});
