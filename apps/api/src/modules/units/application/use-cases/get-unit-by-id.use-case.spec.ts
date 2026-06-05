import { NotFoundException } from '@nestjs/common';
import { GetUnitByIdUseCase } from './get-unit-by-id.use-case';
import {
  UNIT_REPOSITORY,
  UnitRepository,
} from '../repositories/unit.repository';
import { Unit } from '../../domain/entities/unit.entity';

/**
 * Unit tests for GetUnitByIdUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - UnitRepository is mocked entirely.
 *
 * Security invariant (spec FR-003):
 * - TC-US2-A (non-existent) and TC-US2-B (cross-tenant) both mock findById → null.
 *   They are separate test cases to explicitly document that both conditions
 *   produce an identical NotFoundException (HTTP 404) — indistinguishable by design.
 */
void UNIT_REPOSITORY;

describe('GetUnitByIdUseCase', () => {
  const mockCreatedAt = new Date('2026-06-04T10:00:00.000Z');
  const mockUpdatedAt = new Date('2026-06-04T10:00:00.000Z');

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

  const mockRepo: jest.Mocked<UnitRepository> = {
    create: jest.fn(),
    findManyByProperty: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  let useCase: GetUnitByIdUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetUnitByIdUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC-US1-A — Happy path: unit found and returned
    it('returns the Unit when findById resolves a record', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockUnit);

      const result = await useCase.execute({
        id: 'unit_001',
        tenantId: 'tenant_A',
      });

      expect(result).toEqual(mockUnit);
    });

    // TC-US1-B — Input forwarded correctly
    it('calls findById with the exact id and tenantId from input', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockUnit);

      await useCase.execute({ id: 'unit_001', tenantId: 'tenant_A' });

      expect(mockRepo.findById).toHaveBeenCalledWith('unit_001', 'tenant_A');
      expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    });

    // TC-US1-C — Single responsibility
    it('does not call any other repository method', async () => {
      mockRepo.findById.mockResolvedValueOnce(mockUnit);

      await useCase.execute({ id: 'unit_001', tenantId: 'tenant_A' });

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findManyByProperty).not.toHaveBeenCalled();
    });

    // TC-US2-A — Not found: unit does not exist
    it('throws NotFoundException when findById returns null (not-found case)', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'non_existent', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-US2-B — Cross-tenant: unit exists but belongs to a different tenant
    // This test is explicitly separate from TC-US2-A to document the security invariant:
    // both "not found" and "wrong tenant" produce identical NotFoundException (HTTP 404).
    it('throws NotFoundException when findById returns null (cross-tenant case — indistinguishable from not-found by design)', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'unit_001', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC-US2-C — Consistent message
    it('throws NotFoundException with message "Unit not found." for all inaccessible cases', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'unit_001', tenantId: 'tenant_A' }),
      ).rejects.toThrow('Unit not found.');
    });

    // TC-US1-D — Error propagation
    it('propagates unexpected repository errors without swallowing them', async () => {
      const repoError = new Error('DB connection failed');
      mockRepo.findById.mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ id: 'unit_001', tenantId: 'tenant_A' }),
      ).rejects.toBe(repoError);
    });
  });
});
