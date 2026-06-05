import { NotFoundException } from '@nestjs/common';
import { ListUnitsByPropertyUseCase } from './list-units-by-property.use-case';
import {
  UNIT_REPOSITORY,
  UnitRepository,
} from '../repositories/unit.repository';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../../../properties/application/repositories/property.repository';
import { Unit } from '../../domain/entities/unit.entity';
import { Property } from '../../../properties/domain/entities/property.entity';
import { PagedUnits } from '../types/unit-repository.types';

/**
 * Unit tests for ListUnitsByPropertyUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - Both PropertyRepository and UnitRepository are mocked entirely.
 *
 * Security invariants documented by this suite:
 * - TC-US3-A/B/C: non-existent, cross-tenant, and archived property all produce
 *   identical NotFoundException — indistinguishable by design.
 * - TC-US3-E: unitRepository.findManyByProperty is NEVER called when the property
 *   check fails — the two-step ordering is enforced.
 * - TC-US2-A: an accessible property with no units returns { items: [], total: 0 },
 *   NOT a NotFoundException — the empty state is valid.
 */

void UNIT_REPOSITORY;
void PROPERTY_REPOSITORY;

describe('ListUnitsByPropertyUseCase', () => {
  const mockCreatedAt = new Date('2026-06-04T10:00:00.000Z');
  const mockUpdatedAt = new Date('2026-06-04T10:00:00.000Z');

  const mockProperty: Property = {
    id: 'property_001',
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
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
    deletedAt: null,
  };

  const mockUnit101: Unit = {
    id: 'unit_001',
    tenantId: 'tenant_A',
    propertyId: 'property_001',
    unitNumber: '101',
    status: 'AVAILABLE',
    floorArea: 75.5,
    bedrooms: 2,
    bathrooms: 1,
    monthlyRent: 15000,
    description: null,
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
  };

  const mockUnit102: Unit = {
    id: 'unit_002',
    tenantId: 'tenant_A',
    propertyId: 'property_001',
    unitNumber: '102',
    status: 'OCCUPIED',
    floorArea: null,
    bedrooms: 1,
    bathrooms: 1,
    monthlyRent: 12000,
    description: null,
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
  };

  const validInput = {
    tenantId: 'tenant_A',
    propertyId: 'property_001',
    page: 1,
    limit: 50,
  };

  const mockPropertyRepo: jest.Mocked<PropertyRepository> = {
    create: jest.fn(),
    findManyByTenant: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockUnitRepo: jest.Mocked<UnitRepository> = {
    create: jest.fn(),
    findManyByProperty: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  let useCase: ListUnitsByPropertyUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListUnitsByPropertyUseCase(mockUnitRepo, mockPropertyRepo);
  });

  // ── US1: Successful paginated listing ────────────────────────────────────

  describe('US1 — successful paginated listing', () => {
    it('TC-US1-A: returns PagedUnits from unitRepository when property is found', async () => {
      const pagedResult: PagedUnits = {
        items: [mockUnit101, mockUnit102],
        total: 2,
      };
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.findManyByProperty.mockResolvedValueOnce(pagedResult);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(pagedResult);
    });

    it('TC-US1-B: calls propertyRepository.findById with propertyId and tenantId from input', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.findManyByProperty.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await useCase.execute(validInput);

      expect(mockPropertyRepo.findById).toHaveBeenCalledWith(
        'property_001',
        'tenant_A',
      );
      expect(mockPropertyRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('TC-US1-C: calls unitRepository.findManyByProperty with correct propertyId, tenantId, page, and limit', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.findManyByProperty.mockResolvedValueOnce({
        items: [mockUnit101],
        total: 1,
      });

      await useCase.execute({ tenantId: 'tenant_A', propertyId: 'property_001', page: 2, limit: 10 });

      expect(mockUnitRepo.findManyByProperty).toHaveBeenCalledWith(
        'property_001',
        'tenant_A',
        { page: 2, limit: 10 },
      );
      expect(mockUnitRepo.findManyByProperty).toHaveBeenCalledTimes(1);
    });

    it('TC-US1-D: propagates unexpected repository errors without swallowing them', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      const dbError = new Error('DB connection failed');
      mockUnitRepo.findManyByProperty.mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });

  // ── US2: Empty unit list — accessible property with no units ─────────────

  describe('US2 — empty unit list (accessible property, no units)', () => {
    it('TC-US2-A: returns { items: [], total: 0 } when property exists but has no units — NOT a NotFoundException', async () => {
      const emptyResult: PagedUnits = { items: [], total: 0 };
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.findManyByProperty.mockResolvedValueOnce(emptyResult);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(emptyResult);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('TC-US2-B: does NOT throw when unitRepository returns an empty items array', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.findManyByProperty.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await expect(useCase.execute(validInput)).resolves.not.toThrow();
    });
  });

  // ── US3: Inaccessible property — all three cases produce identical 404 ───

  describe('US3 — inaccessible property', () => {
    it('TC-US3-A: throws NotFoundException when property does not exist (findById returns null)', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-US3-B: throws NotFoundException when property belongs to a different tenant (cross-tenant — indistinguishable from not-found by design)', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-US3-C: throws NotFoundException when property is archived (deletedAt set — indistinguishable from not-found by design)', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-US3-D: all three inaccessible-property cases throw NotFoundException with identical message', async () => {
      for (let i = 0; i < 3; i++) {
        mockPropertyRepo.findById.mockResolvedValueOnce(null);
        await expect(useCase.execute(validInput)).rejects.toThrow(
          'Property not found.',
        );
      }
    });

    it('TC-US3-E: does NOT call unitRepository.findManyByProperty when property is not found', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockUnitRepo.findManyByProperty).not.toHaveBeenCalled();
    });
  });
});
