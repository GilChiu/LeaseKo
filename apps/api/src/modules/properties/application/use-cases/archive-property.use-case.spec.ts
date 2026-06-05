import { NotFoundException } from '@nestjs/common';
import { ArchivePropertyUseCase } from './archive-property.use-case';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';

/**
 * Unit tests for ArchivePropertyUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - PropertyRepository is mocked entirely.
 *
 * Idempotency guarantee (FR-008):
 * - TC1 (active property) and TC2 (already-archived) both mock softDelete → true.
 *   They are separate test cases to explicitly document that both conditions
 *   produce void (success) — the caller cannot distinguish them.
 *
 * Security invariant (FR-006, FR-007):
 * - TC3 (not-found) and TC4 (cross-tenant) both mock softDelete → false.
 *   They are separate test cases to explicitly document that both conditions
 *   produce identical NotFoundException (HTTP 404).
 */

// Suppress unused-variable warning for PROPERTY_REPOSITORY (imported for documentation only)
void PROPERTY_REPOSITORY;

describe('ArchivePropertyUseCase', () => {
  const mockRepo: PropertyRepository = {
    create: jest.fn(),
    findManyByTenant: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: ArchivePropertyUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ArchivePropertyUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: active property archived successfully
    it('returns void when softDelete returns true (active property)', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' }),
      ).resolves.toBeUndefined();
    });

    // TC2 — Idempotent re-archive: already-archived property — same success as TC1
    // Both TC1 and TC2 use the same mock (true), documented separately to prove
    // the idempotency guarantee: the use case cannot and must not distinguish them.
    it('returns void when softDelete returns true (already-archived property — idempotent)', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' }),
      ).resolves.toBeUndefined();
    });

    // TC3 — Not found: softDelete returns false
    it('throws NotFoundException when softDelete returns false (not-found case)', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        useCase.execute({ id: 'non_existent', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC4 — Cross-tenant: softDelete returns false (same code path as TC3 — documented separately)
    // Both TC3 and TC4 use the same mock (false), documented separately to prove the
    // security invariant: cross-tenant archive is indistinguishable from not-found.
    it('throws NotFoundException when softDelete returns false (cross-tenant case — indistinguishable from not-found by design)', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC5 — Argument forwarding + single responsibility
    it('calls softDelete with exact id and tenantId and no other repository method', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(true);

      await useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' });

      expect(mockRepo.softDelete).toHaveBeenCalledWith('prop_001', 'tenant_A');
      expect(mockRepo.softDelete).toHaveBeenCalledTimes(1);
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findManyByTenant).not.toHaveBeenCalled();
      expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    // TC6 — Error propagation
    it('propagates unexpected repository errors without swallowing them', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.softDelete as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ id: 'prop_001', tenantId: 'tenant_A' }),
      ).rejects.toBe(repoError);
    });
  });
});
