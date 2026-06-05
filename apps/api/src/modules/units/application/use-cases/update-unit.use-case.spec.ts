import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UpdateUnitUseCase } from './update-unit.use-case';
import {
  UNIT_REPOSITORY,
  UnitRepository,
} from '../repositories/unit.repository';
import { Unit } from '../../domain/entities/unit.entity';

/**
 * Unit tests for UpdateUnitUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - UnitRepository is mocked entirely (all four methods).
 *
 * Security invariant:
 * - TC-US4-A (non-existent) and TC-US4-B (cross-tenant) both mock update → null.
 *   Separate test cases document that both conditions produce an identical
 *   NotFoundException (HTTP 404) — indistinguishable by design.
 */
void UNIT_REPOSITORY;

describe('UpdateUnitUseCase', () => {
  const mockCreatedAt = new Date('2026-06-04T10:00:00.000Z');
  const mockUpdatedAt = new Date('2026-06-04T12:00:00.000Z');

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

  let useCase: UpdateUnitUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateUnitUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC-US1-A — Happy path: update resolves Unit → use case returns it
    it('returns the updated Unit when update resolves a record', async () => {
      mockRepo.update.mockResolvedValueOnce(mockUnit);

      const result = await useCase.execute({
        id: 'unit_001',
        tenantId: 'tenant_A',
        data: { monthlyRent: 20000 },
      });

      expect(result).toEqual(mockUnit);
    });

    // TC-US1-B — Input forwarded correctly
    it('calls update with the exact id, tenantId, and data from input', async () => {
      mockRepo.update.mockResolvedValueOnce(mockUnit);
      const data = { monthlyRent: 20000, description: 'Updated' };

      await useCase.execute({ id: 'unit_001', tenantId: 'tenant_A', data });

      expect(mockRepo.update).toHaveBeenCalledWith('unit_001', 'tenant_A', data);
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });

    // TC-US1-C — Null-clearing propagated
    it('passes null through unchanged for clearable fields (floorArea: null)', async () => {
      const updatedUnit: Unit = { ...mockUnit, floorArea: null };
      mockRepo.update.mockResolvedValueOnce(updatedUnit);
      const data = { floorArea: null };

      const result = await useCase.execute({
        id: 'unit_001',
        tenantId: 'tenant_A',
        data,
      });

      expect(mockRepo.update).toHaveBeenCalledWith('unit_001', 'tenant_A', { floorArea: null });
      expect(result.floorArea).toBeNull();
    });

    // TC-US2 — ConflictException propagates unchanged
    it('propagates ConflictException from the repository without swallowing it', async () => {
      const conflict = new ConflictException(
        'Unit number already exists under this property.',
      );
      mockRepo.update.mockRejectedValueOnce(conflict);

      await expect(
        useCase.execute({
          id: 'unit_001',
          tenantId: 'tenant_A',
          data: { unitNumber: 'DUPLICATE' },
        }),
      ).rejects.toThrow(ConflictException);
    });

    // TC-US4-A — Non-existent unit: update returns null → NotFoundException
    it('throws NotFoundException when update returns null (unit does not exist)', async () => {
      mockRepo.update.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({
          id: 'non_existent',
          tenantId: 'tenant_A',
          data: { monthlyRent: 20000 },
        }),
      ).rejects.toThrow(new NotFoundException('Unit not found.'));
    });

    // TC-US4-B — Cross-tenant unit: update returns null → same NotFoundException
    // Explicitly separate from TC-US4-A to document the security invariant:
    // both "not found" and "wrong tenant" produce identical NotFoundException (HTTP 404).
    it('throws NotFoundException when update returns null (cross-tenant — indistinguishable from not-found by design)', async () => {
      mockRepo.update.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({
          id: 'unit_001',
          tenantId: 'tenant_B',
          data: { monthlyRent: 20000 },
        }),
      ).rejects.toThrow(new NotFoundException('Unit not found.'));
    });

    // ── Status transition guard ───────────────────────────────────────────────

    // TC-GUARD-1 — Valid transition: AVAILABLE → OCCUPIED
    it('returns updated unit when status transition is permitted (AVAILABLE → OCCUPIED)', async () => {
      const currentUnit: Unit = { ...mockUnit, status: 'AVAILABLE' };
      const updatedUnit: Unit = { ...mockUnit, status: 'OCCUPIED' };
      mockRepo.findById.mockResolvedValueOnce(currentUnit);
      mockRepo.update.mockResolvedValueOnce(updatedUnit);

      const result = await useCase.execute({
        id: 'unit_001',
        tenantId: 'tenant_A',
        data: { status: 'OCCUPIED' },
      });

      expect(result.status).toBe('OCCUPIED');
      expect(mockRepo.findById).toHaveBeenCalledWith('unit_001', 'tenant_A');
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });

    // TC-GUARD-2 — Same-status no-op: AVAILABLE → AVAILABLE
    it('returns current unit without calling update when status is unchanged (no-op)', async () => {
      const currentUnit: Unit = { ...mockUnit, status: 'AVAILABLE' };
      mockRepo.findById.mockResolvedValueOnce(currentUnit);

      const result = await useCase.execute({
        id: 'unit_001',
        tenantId: 'tenant_A',
        data: { status: 'AVAILABLE' },
      });

      expect(result).toEqual(currentUnit);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    // TC-GUARD-6 — No status in input: guard skips entirely
    it('calls update directly without calling findById when no status is in the input', async () => {
      mockRepo.update.mockResolvedValueOnce(mockUnit);

      await useCase.execute({
        id: 'unit_001',
        tenantId: 'tenant_A',
        data: { floorArea: 80 },
      });

      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledTimes(1);
    });

    // TC-GUARD-7 — Valid transition combined with other field changes
    it('updates both status and other fields when transition is valid (combined update)', async () => {
      const currentUnit: Unit = { ...mockUnit, status: 'MAINTENANCE' };
      const updatedUnit: Unit = {
        ...mockUnit,
        status: 'AVAILABLE',
        monthlyRent: 18000,
      };
      mockRepo.findById.mockResolvedValueOnce(currentUnit);
      mockRepo.update.mockResolvedValueOnce(updatedUnit);

      const result = await useCase.execute({
        id: 'unit_001',
        tenantId: 'tenant_A',
        data: { status: 'AVAILABLE', monthlyRent: 18000 },
      });

      expect(result.status).toBe('AVAILABLE');
      expect(result.monthlyRent).toBe(18000);
      expect(mockRepo.update).toHaveBeenCalledWith(
        'unit_001',
        'tenant_A',
        { status: 'AVAILABLE', monthlyRent: 18000 },
      );
    });

    // TC-GUARD-3 — Invalid transition: OCCUPIED → INACTIVE (not in allowed list)
    it('throws UnprocessableEntityException for a disallowed status transition (OCCUPIED → INACTIVE)', async () => {
      const currentUnit: Unit = { ...mockUnit, status: 'OCCUPIED' };
      mockRepo.findById.mockResolvedValueOnce(currentUnit);

      await expect(
        useCase.execute({
          id: 'unit_001',
          tenantId: 'tenant_A',
          data: { status: 'INACTIVE' },
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    // TC-GUARD-4 — INACTIVE terminal state: any status change rejected
    // ALLOWED_TRANSITIONS[INACTIVE] is empty — no transitions out of INACTIVE.
    it('throws UnprocessableEntityException when attempting to change status from INACTIVE (terminal state)', async () => {
      const inactiveUnit: Unit = { ...mockUnit, status: 'INACTIVE' };
      mockRepo.findById.mockResolvedValueOnce(inactiveUnit);

      await expect(
        useCase.execute({
          id: 'unit_001',
          tenantId: 'tenant_A',
          data: { status: 'AVAILABLE' },
        }),
      ).rejects.toThrow(
        new UnprocessableEntityException(
          'Unit status cannot transition from INACTIVE to AVAILABLE.',
        ),
      );

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    // TC-GUARD-8 — Invalid transition combined with other field changes: entire request rejected
    it('rejects the entire request when transition is invalid, even if other fields are valid (no partial write)', async () => {
      const currentUnit: Unit = { ...mockUnit, status: 'OCCUPIED' };
      mockRepo.findById.mockResolvedValueOnce(currentUnit);

      await expect(
        useCase.execute({
          id: 'unit_001',
          tenantId: 'tenant_A',
          data: { status: 'INACTIVE', monthlyRent: 18000 },
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    // TC-GUARD-5 — findById returns null when status is present in input → NotFoundException
    // Two explicitly separate sub-cases to document the security invariant:
    // non-existent and cross-tenant both produce identical NotFoundException (HTTP 404).

    // TC-GUARD-5-A — Non-existent unit (findById null, status in input)
    it('throws NotFoundException when findById returns null for a non-existent unit (status guard path)', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({
          id: 'non_existent',
          tenantId: 'tenant_A',
          data: { status: 'OCCUPIED' },
        }),
      ).rejects.toThrow(new NotFoundException('Unit not found.'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    // TC-GUARD-5-B — Cross-tenant unit (findById null because tenantId filter, status in input)
    // Indistinguishable from TC-GUARD-5-A by design — same NotFoundException for both cases.
    it('throws NotFoundException when findById returns null for a cross-tenant unit (status guard path — indistinguishable from not-found by design)', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(
        useCase.execute({
          id: 'unit_001',
          tenantId: 'tenant_B',
          data: { status: 'OCCUPIED' },
        }),
      ).rejects.toThrow(new NotFoundException('Unit not found.'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });
});
