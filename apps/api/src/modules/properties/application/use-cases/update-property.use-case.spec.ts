import { NotFoundException } from '@nestjs/common';
import { UpdatePropertyUseCase } from './update-property.use-case';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';
import { UpdatePropertyInput } from '../types/property-repository.types';
import { Property } from '../../domain/entities/property.entity';

/**
 * Unit tests for UpdatePropertyUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - PropertyRepository is mocked entirely.
 *
 * Security invariant (constitution rule VI + FR-004, FR-005):
 * - TC2 (not found) and TC3 (cross-tenant) are separate test cases to document
 *   that both conditions produce identical NotFoundException (HTTP 404).
 * - The repository already merges both cases into null — the use case must not
 *   introduce any distinguishing logic.
 *
 * Note: Empty payload rejection (FR-003) is enforced at the DTO/ValidationPipe
 * level, not in the use case. It is not tested here.
 */

// Suppress unused-variable warning for PROPERTY_REPOSITORY (imported for documentation only)
void PROPERTY_REPOSITORY;

const baseProperty: Property = {
  id: 'prop_001',
  tenantId: 'tenant_A',
  name: 'Sunset Apartments',
  addressLine1: '123 Main Street',
  addressLine2: null,
  city: 'Iloilo City',
  state: 'Iloilo',
  postalCode: '5000',
  country: 'Philippines',
  propertyType: 'APARTMENT',
  description: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-06-04T10:00:00.000Z'),
  deletedAt: null,
};

const updateInput: UpdatePropertyInput = { name: 'Renamed Apartments' };

describe('UpdatePropertyUseCase', () => {
  const mockRepo: PropertyRepository = {
    create: jest.fn(),
    findManyByTenant: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: UpdatePropertyUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdatePropertyUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: updated Property returned
    it('returns the updated Property when update() resolves a record', async () => {
      const updatedProperty: Property = { ...baseProperty, name: 'Renamed Apartments' };
      (mockRepo.update as jest.Mock).mockResolvedValueOnce(updatedProperty);

      const result = await useCase.execute({
        id: 'prop_001',
        tenantId: 'tenant_A',
        data: updateInput,
      });

      expect(result).toEqual(updatedProperty);
    });

    // TC2 — Not found: repository returns null
    it('throws NotFoundException when update() returns null (not-found case)', async () => {
      (mockRepo.update as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'non_existent', tenantId: 'tenant_A', data: updateInput }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC3 — Cross-tenant: repository returns null (same code path as not-found — documented separately)
    // Both cases produce identical NotFoundException (HTTP 404). This is by design (FR-004, FR-005).
    it('throws NotFoundException when update() returns null (cross-tenant case — indistinguishable from not-found by design)', async () => {
      (mockRepo.update as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A', data: updateInput }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC4 — Input forwarded unchanged (constitution: tenantId from context only)
    it('calls update() with the exact id, tenantId, and data from input', async () => {
      const updatedProperty: Property = { ...baseProperty, name: 'Renamed Apartments' };
      (mockRepo.update as jest.Mock).mockResolvedValueOnce(updatedProperty);

      await useCase.execute({ id: 'prop_001', tenantId: 'tenant_A', data: updateInput });

      expect(mockRepo.update).toHaveBeenCalledWith('prop_001', 'tenant_A', updateInput);
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });

    // TC5 — Single responsibility: no other repository methods called
    it('does not call any other repository method', async () => {
      const updatedProperty: Property = { ...baseProperty, name: 'Renamed Apartments' };
      (mockRepo.update as jest.Mock).mockResolvedValueOnce(updatedProperty);

      await useCase.execute({ id: 'prop_001', tenantId: 'tenant_A', data: updateInput });

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findManyByTenant).not.toHaveBeenCalled();
      expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    // TC6 — Error propagation
    it('propagates unexpected repository errors without swallowing them', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.update as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A', data: updateInput }),
      ).rejects.toBe(repoError);
    });
  });
});
