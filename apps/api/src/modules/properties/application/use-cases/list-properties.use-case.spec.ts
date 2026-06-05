import { ListPropertiesUseCase } from './list-properties.use-case';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';
import { PagedProperties } from '../types/property-repository.types';
import { Property } from '../../domain/entities/property.entity';

/**
 * Unit tests for ListPropertiesUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - PropertyRepository is mocked entirely.
 *
 * Tenant isolation guarantee (constitution rule VI):
 * - The use case must pass tenantId through to the repository unchanged.
 * - It must not merge, override, or ignore tenantId.
 * - The cross-tenant test (TC5) verifies that properties from a different
 *   tenant are never included in the result.
 */

// Suppress unused-variable warning for PROPERTY_REPOSITORY (imported for documentation only)
void PROPERTY_REPOSITORY;

const makeProperty = (overrides: Partial<Property> = {}): Property => ({
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
  ...overrides,
});

describe('ListPropertiesUseCase', () => {
  const mockRepo: PropertyRepository = {
    create: jest.fn(),
    findManyByTenant: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: ListPropertiesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListPropertiesUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: items and total are forwarded from repository
    it('returns the paged result from the repository', async () => {
      const pagedResult: PagedProperties = {
        items: [makeProperty()],
        total: 1,
      };
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce(pagedResult);

      const result = await useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 });

      expect(result).toEqual(pagedResult);
    });

    // TC2 — tenantId forwarded unchanged (constitution: from context only)
    it('calls findPagedByTenant with the exact tenantId from input', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith(
        'tenant_A',
        expect.anything(),
      );
    });

    // TC3 — page and limit forwarded unchanged
    it('calls findPagedByTenant with the exact page and limit from input', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute({ tenantId: 'tenant_A', page: 3, limit: 10 });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', { page: 3, limit: 10 });
    });

    // TC4 — single responsibility: no other repository methods called
    it('does not call any other repository method', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 });

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findManyByTenant).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    // TC5 — tenant isolation (FR-002, US3): properties from a different tenant never appear
    it('does not return properties belonging to a different tenant', async () => {
      const tenantAProperty = makeProperty({ id: 'prop_A', tenantId: 'tenant_A' });
      const tenantBProperty = makeProperty({ id: 'prop_B', tenantId: 'tenant_B' });

      // Repository correctly scopes to tenant_A — tenant_B property is never in the result
      (mockRepo.findPagedByTenant as jest.Mock).mockImplementation(
        (tenantId: string) => {
          if (tenantId === 'tenant_A') {
            return Promise.resolve({ items: [tenantAProperty], total: 1 });
          }
          return Promise.resolve({ items: [tenantBProperty], total: 1 });
        },
      );

      const result = await useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tenantId).toBe('tenant_A');
      expect(result.items.some((p) => p.tenantId === 'tenant_B')).toBe(false);
    });

    // TC6 — empty state (US2): empty list not an error
    it('returns items: [] and total: 0 when the tenant has no properties', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      const result = await useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    // TC7 — error propagation
    it('propagates repository errors without swallowing them', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.findPagedByTenant as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ tenantId: 'tenant_A', page: 1, limit: 20 }),
      ).rejects.toBe(repoError);
    });
  });
});
