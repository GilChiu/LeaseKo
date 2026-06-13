import { NotFoundException } from '@nestjs/common';
import { ArchiveTenantContactUseCase } from './archive-tenant-contact.use-case';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';

/**
 * Unit tests for ArchiveTenantContactUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - TenantContactRepository is mocked entirely.
 *
 * Security invariant:
 * - TC3 (not-found) and TC4 (cross-tenant) both mock softDelete → false.
 *   They are separate test cases to explicitly document that both conditions
 *   produce identical NotFoundException (HTTP 404).
 */

// Suppress unused-variable warning for TENANT_CONTACT_REPOSITORY (imported for documentation only)
void TENANT_CONTACT_REPOSITORY;

describe('ArchiveTenantContactUseCase', () => {
  const mockRepo: TenantContactRepository = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findPagedByTenant: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: ArchiveTenantContactUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ArchiveTenantContactUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: active contact archived successfully
    it('returns void when softDelete returns true (active contact)', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A' }),
      ).resolves.toBeUndefined();
    });

    // TC2 — Not found: softDelete returns false
    it('throws NotFoundException when softDelete returns false (not-found case)', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        useCase.execute({ id: 'non_existent', tenantId: 'tenant_A' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC3 — Cross-tenant: softDelete returns false (same code path as TC2 — documented separately)
    // Both TC2 and TC3 use the same mock (false), documented separately to prove the
    // security invariant: cross-tenant archive is indistinguishable from not-found.
    it('throws NotFoundException when softDelete returns false (cross-tenant case — indistinguishable from not-found by design)', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_B' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC4 — Argument forwarding + single responsibility
    it('calls softDelete with exact id and tenantId and no other repository method', async () => {
      (mockRepo.softDelete as jest.Mock).mockResolvedValueOnce(true);

      await useCase.execute({ id: 'contact_001', tenantId: 'tenant_A' });

      expect(mockRepo.softDelete).toHaveBeenCalledWith('contact_001', 'tenant_A');
      expect(mockRepo.softDelete).toHaveBeenCalledTimes(1);
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findByEmail).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
    });

    // TC5 — Error propagation
    it('propagates unexpected repository errors without swallowing them', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.softDelete as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(
        useCase.execute({ id: 'contact_001', tenantId: 'tenant_A' }),
      ).rejects.toBe(repoError);
    });
  });
});
