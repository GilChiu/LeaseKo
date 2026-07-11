import { NotFoundException } from '@nestjs/common';
import {
  GetLeaseByIdUseCase,
  GetLeaseByIdUseCaseInput,
} from './get-lease-by-id.use-case';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';

/**
 * Unit tests for GetLeaseByIdUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - LeaseRepository is mocked entirely.
 *
 * Security invariant:
 * - The repository returns null for missing, cross-tenant, and soft-deleted leases.
 *   All three cases produce the same NotFoundException (HTTP 404) — indistinguishable by design.
 */

void LEASE_REPOSITORY;

const mockLease: Lease = {
  id: 'lease_001',
  tenantId: 'tenant_A',
  propertyId: 'prop_001',
  unitId: 'unit_001',
  tenantContactId: 'contact_001',
  status: 'ACTIVE',
  startDate: new Date('2026-07-01'),
  endDate: new Date('2027-06-30'),
  monthlyRent: 25000,
  depositAmount: null,
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validInput: GetLeaseByIdUseCaseInput = {
  id: 'lease_001',
  tenantId: 'tenant_A',
};

describe('GetLeaseByIdUseCase', () => {
  const mockRepo: LeaseRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    activate: jest.fn(),
    expire: jest.fn(),
    terminate: jest.fn(),
    hasActiveLeaseForUnit: jest.fn(),
    findActiveByTenant: jest.fn(),
    findActiveByTenantContact: jest.fn(),
  };

  let useCase: GetLeaseByIdUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetLeaseByIdUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: lease found
    it('returns the lease when findById resolves a record', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(mockLease);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(mockLease);
    });

    // TC2 — Argument forwarding
    it('calls findById with exact id and tenantId', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(mockLease);

      await useCase.execute(validInput);

      expect(mockRepo.findById).toHaveBeenCalledWith('lease_001', 'tenant_A');
      expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    });

    // TC3 — Single responsibility
    it('does not call any other repository method', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(mockLease);

      await useCase.execute(validInput);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findPagedByTenant).not.toHaveBeenCalled();
    });

    // TC4 — Not found
    it('throws NotFoundException when findById returns null (not-found case)', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute({ id: 'missing', tenantId: 'tenant_A' })).rejects.toThrow(
        NotFoundException,
      );
    });

    // TC5 — Cross-tenant (same code path as TC4 — documented separately)
    it('throws NotFoundException when findById returns null (cross-tenant case — indistinguishable from not-found by design)', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ id: 'lease_001', tenantId: 'tenant_B' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TC6 — Soft-deleted (same code path as TC4 — documented separately)
    it('throws NotFoundException when findById returns null (soft-deleted case — indistinguishable from not-found by design)', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(NotFoundException);
    });

    // TC7 — Error propagation
    it('propagates unexpected repository errors without swallowing them', async () => {
      const dbError = new Error('DB connection failed');
      (mockRepo.findById as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });
});
