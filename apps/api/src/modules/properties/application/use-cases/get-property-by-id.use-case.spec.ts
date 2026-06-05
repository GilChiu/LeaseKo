import { NotFoundException } from '@nestjs/common';
import { GetPropertyByIdUseCase } from './get-property-by-id.use-case';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';
import { Property } from '../../domain/entities/property.entity';

/**
 * Unit tests for GetPropertyByIdUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - PropertyRepository is mocked entirely.
 *
 * Security invariant (constitution rule VI + FR-004):
 * - TC2 (not found) and TC3 (cross-tenant) both result in NotFoundException.
 * - They are separate test cases to explicitly document that both conditions
 *   produce an identical HTTP 404 — the caller cannot distinguish between them.
 * - This is by design; the repository already merges both cases into null.
 */

// Suppress unused-variable warning for PROPERTY_REPOSITORY (imported for documentation only)
void PROPERTY_REPOSITORY;

const mockProperty: Property = {
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
  updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  deletedAt: null,
};

describe('GetPropertyByIdUseCase', () => {
  const mockRepo: PropertyRepository = {
    create: jest.fn(),
    findManyByTenant: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: GetPropertyByIdUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetPropertyByIdUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: property found and returned
    it('returns the Property when findById resolves a record', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(mockProperty);

      const result = await useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' });

      expect(result).toEqual(mockProperty);
    });

    // TC2 — Not found: repository returns null (record does not exist)
    it('throws NotFoundException when findById returns null (not-found case)', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'non_existent_id', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC3 — Cross-tenant: repository returns null (record belongs to a different tenant)
    // This test case is explicitly separate from TC2 to document the security invariant:
    // both "not found" and "wrong tenant" produce identical NotFoundException (HTTP 404).
    it('throws NotFoundException when findById returns null (cross-tenant case — indistinguishable from not-found by design)', async () => {
      // Simulate: prop_001 exists under tenant_B, but we query as tenant_A
      // The repository correctly returns null for tenant_A — same as if prop_001 didn't exist
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC4 — Input forwarded unchanged (constitution: tenantId from context only)
    it('calls findById with the exact id and tenantId from input', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(mockProperty);

      await useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' });

      expect(mockRepo.findById).toHaveBeenCalledWith('prop_001', 'tenant_A');
      expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    });

    // TC5 — Single responsibility: no other repository methods called
    it('does not call any other repository method', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(mockProperty);

      await useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' });

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findManyByTenant).not.toHaveBeenCalled();
      expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    // TC6 — Error propagation
    it('propagates unexpected repository errors without swallowing them', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.findById as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' }),
      ).rejects.toBe(repoError);
    });
  });
});
