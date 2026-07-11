import { ListLeasesUseCase, ListLeasesUseCaseInput } from './list-leases.use-case';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';
import { PagedLeases } from '../types/lease-repository.types';

/**
 * Unit tests for ListLeasesUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - LeaseRepository is mocked entirely.
 */

void LEASE_REPOSITORY;

const baseLease: Lease = {
  id: 'lease_001',
  tenantId: 'tenant_A',
  propertyId: 'prop_001',
  unitId: 'unit_001',
  tenantContactId: 'contact_001',
  status: 'DRAFT',
  startDate: new Date('2026-07-01'),
  endDate: new Date('2027-06-30'),
  monthlyRent: 25000,
  depositAmount: null,
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validInput: ListLeasesUseCaseInput = {
  tenantId: 'tenant_A',
  page: 1,
  limit: 20,
};

describe('ListLeasesUseCase', () => {
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

  let useCase: ListLeasesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListLeasesUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: returns paged result from repository
    it('returns the paged result from the repository', async () => {
      const pagedResult: PagedLeases = { items: [baseLease], total: 1 };
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce(pagedResult);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(pagedResult);
    });

    // TC2 — Argument forwarding with pagination
    it('calls findPagedByTenant with tenantId and pagination options', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute({ tenantId: 'tenant_A', page: 2, limit: 10 });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', {
        page: 2,
        limit: 10,
        status: undefined,
      });
      expect(mockRepo.findPagedByTenant).toHaveBeenCalledTimes(1);
    });

    // TC3 — Argument forwarding with status filter
    it('passes status filter through to the repository', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute({ ...validInput, status: 'ACTIVE' });

      expect(mockRepo.findPagedByTenant).toHaveBeenCalledWith('tenant_A', {
        page: 1,
        limit: 20,
        status: 'ACTIVE',
      });
    });

    // TC4 — Empty workspace
    it('returns empty items and zero total for an empty workspace', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      const result = await useCase.execute(validInput);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    // TC5 — Single responsibility: no unrelated methods called
    it('does not call create or findById', async () => {
      (mockRepo.findPagedByTenant as jest.Mock).mockResolvedValueOnce({ items: [], total: 0 });

      await useCase.execute(validInput);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    // TC6 — Error propagation
    it('propagates repository errors without swallowing them', async () => {
      const dbError = new Error('DB connection failed');
      (mockRepo.findPagedByTenant as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });
});
