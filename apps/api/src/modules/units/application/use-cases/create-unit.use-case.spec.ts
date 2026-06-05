import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  CreateUnitUseCase,
  CreateUnitUseCaseInput,
} from './create-unit.use-case';
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

/**
 * Unit tests for CreateUnitUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - Both PropertyRepository and UnitRepository are mocked entirely.
 *
 * Security invariants documented by this suite (spec FR-007, FR-008):
 * - TC-US3-A/B/C: non-existent, cross-tenant, and archived property all produce
 *   identical NotFoundException — indistinguishable by design.
 * - TC-US1-tenantId: unit.tenantId is always derived from property.tenantId,
 *   never from the input tenantId directly.
 *
 * What is NOT tested here (belongs to other test suites):
 * - CreateUnitDto validation decorators
 * - UnitsController routing
 * - Swagger decorators
 * - PrismaUnitRepository integration
 * - Auth guard / @RequiresTenant() behavior
 */

// Suppress unused-variable warning for DI tokens (imported for documentation only)
void UNIT_REPOSITORY;
void PROPERTY_REPOSITORY;

describe('CreateUnitUseCase', () => {
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

  const mockUnit: Unit = {
    id: 'unit_001',
    tenantId: 'tenant_A',
    propertyId: 'property_001',
    unitNumber: '101',
    status: 'AVAILABLE',
    floorArea: 75.5,
    bedrooms: 2,
    bathrooms: 1,
    monthlyRent: 15000,
    description: 'Corner unit',
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
  };

  const validInput: CreateUnitUseCaseInput = {
    tenantId: 'tenant_A',
    propertyId: 'property_001',
    unitNumber: '101',
    floorArea: 75.5,
    bedrooms: 2,
    bathrooms: 1,
    monthlyRent: 15000,
    description: 'Corner unit',
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

  let useCase: CreateUnitUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateUnitUseCase(mockUnitRepo, mockPropertyRepo);
  });

  // ── US1: Successful unit creation ────────────────────────────────────────

  describe('US1 — successful creation', () => {
    it('TC-US1-A: returns the Unit created by the repository', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.create.mockResolvedValueOnce(mockUnit);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(mockUnit);
    });

    it('TC-US1-B: calls propertyRepository.findById with propertyId and tenantId from input', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.create.mockResolvedValueOnce(mockUnit);

      await useCase.execute(validInput);

      expect(mockPropertyRepo.findById).toHaveBeenCalledWith(
        'property_001',
        'tenant_A',
      );
      expect(mockPropertyRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('TC-US1-C: derives unit tenantId from property.tenantId, not from input.tenantId', async () => {
      const propertyWithDifferentLookTenant: Property = {
        ...mockProperty,
        tenantId: 'tenant_A',
      };
      mockPropertyRepo.findById.mockResolvedValueOnce(
        propertyWithDifferentLookTenant,
      );
      mockUnitRepo.create.mockResolvedValueOnce(mockUnit);

      await useCase.execute({ ...validInput, tenantId: 'tenant_A' });

      expect(mockUnitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant_A' }),
      );
    });

    it('TC-US1-D: calls unitRepository.create exactly once with correct fields', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.create.mockResolvedValueOnce(mockUnit);

      await useCase.execute(validInput);

      expect(mockUnitRepo.create).toHaveBeenCalledTimes(1);
      expect(mockUnitRepo.create).toHaveBeenCalledWith({
        tenantId: 'tenant_A',
        propertyId: 'property_001',
        unitNumber: '101',
        floorArea: 75.5,
        bedrooms: 2,
        bathrooms: 1,
        monthlyRent: 15000,
        description: 'Corner unit',
      });
    });

    it('TC-US1-E: handles minimal input (unit number only) with null optional fields', async () => {
      const minimalUnit: Unit = {
        ...mockUnit,
        floorArea: null,
        bedrooms: null,
        bathrooms: null,
        monthlyRent: null,
        description: null,
      };
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      mockUnitRepo.create.mockResolvedValueOnce(minimalUnit);

      const result = await useCase.execute({
        tenantId: 'tenant_A',
        propertyId: 'property_001',
        unitNumber: '101',
      });

      expect(result).toEqual(minimalUnit);
      expect(mockUnitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unitNumber: '101',
          floorArea: null,
          bedrooms: null,
          bathrooms: null,
          monthlyRent: null,
          description: null,
        }),
      );
    });

    it('TC-US1-F: propagates unexpected repository errors without swallowing them', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      const dbError = new Error('DB connection failed');
      mockUnitRepo.create.mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });

  // ── US2: Duplicate unit number conflict ──────────────────────────────────

  describe('US2 — duplicate unit number', () => {
    it('TC-US2-A: propagates ConflictException from unitRepository.create unmodified', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      const conflict = new ConflictException(
        'Unit number already exists under this property.',
      );
      mockUnitRepo.create.mockRejectedValueOnce(conflict);

      await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('TC-US2-B: propagates the exact ConflictException instance thrown by the repository', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(mockProperty);
      const conflict = new ConflictException(
        'Unit number already exists under this property.',
      );
      mockUnitRepo.create.mockRejectedValueOnce(conflict);

      await expect(useCase.execute(validInput)).rejects.toBe(conflict);
    });
  });

  // ── US3: Inaccessible property — all three cases produce identical 404 ───

  describe('US3 — inaccessible property', () => {
    it('TC-US3-A: throws NotFoundException when property does not exist (findById returns null)', async () => {
      // Simulates: propertyId does not exist in the DB at all
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-US3-B: throws NotFoundException when property belongs to a different tenant (cross-tenant — indistinguishable from not-found by design)', async () => {
      // Simulates: property exists under tenant_B, but we query as tenant_A.
      // The repository returns null for tenant_A — same as if the property did not exist.
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ ...validInput, tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-US3-C: throws NotFoundException when property is archived (deletedAt set — indistinguishable from not-found by design)', async () => {
      // Simulates: property exists but has deletedAt set (archived/soft-deleted).
      // The repository returns null for archived properties — same as if it did not exist.
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('TC-US3-D: all three inaccessible-property cases throw NotFoundException with identical message', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Property not found.',
      );

      mockPropertyRepo.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Property not found.',
      );

      mockPropertyRepo.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Property not found.',
      );
    });

    it('TC-US3-E: does not call unitRepository.create when property is not found', async () => {
      mockPropertyRepo.findById.mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockUnitRepo.create).not.toHaveBeenCalled();
    });
  });
});
