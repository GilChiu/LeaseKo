import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ExpireLeaseUseCase,
  ExpireLeaseUseCaseInput,
} from './expire-lease.use-case';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';

/**
 * Unit tests for ExpireLeaseUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - LeaseRepository is mocked entirely.
 *
 * State machine invariant:
 * - Only ACTIVE leases may be expired. Any other status throws BadRequestException.
 */

void LEASE_REPOSITORY;

const activeLease: Lease = {
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

const expiredLease: Lease = { ...activeLease, status: 'EXPIRED' };

const validInput: ExpireLeaseUseCaseInput = {
  id: 'lease_001',
  tenantId: 'tenant_A',
};

describe('ExpireLeaseUseCase', () => {
  const mockRepo: LeaseRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    activate: jest.fn(),
    expire: jest.fn(),
    terminate: jest.fn(),
    hasActiveLeaseForUnit: jest.fn(),
  };

  let useCase: ExpireLeaseUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ExpireLeaseUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: ACTIVE → EXPIRED
    it('returns the expired lease when lease is in ACTIVE status', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockRepo.expire as jest.Mock).mockResolvedValueOnce(expiredLease);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(expiredLease);
    });

    // TC2 — Not found: findById returns null
    it('throws NotFoundException when the lease does not exist', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(NotFoundException);
      expect(mockRepo.expire).not.toHaveBeenCalled();
    });

    // TC3 — Wrong status: DRAFT
    it('throws BadRequestException when lease status is DRAFT', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        status: 'DRAFT',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.expire).not.toHaveBeenCalled();
    });

    // TC4 — Wrong status: already EXPIRED
    it('throws BadRequestException when lease status is already EXPIRED', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        status: 'EXPIRED',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.expire).not.toHaveBeenCalled();
    });

    // TC5 — Wrong status: TERMINATED
    it('throws BadRequestException when lease status is TERMINATED', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        status: 'TERMINATED',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.expire).not.toHaveBeenCalled();
    });

    // TC6 — Argument forwarding
    it('calls findById and expire with exact id and tenantId', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockRepo.expire as jest.Mock).mockResolvedValueOnce(expiredLease);

      await useCase.execute(validInput);

      expect(mockRepo.findById).toHaveBeenCalledWith('lease_001', 'tenant_A');
      expect(mockRepo.expire).toHaveBeenCalledWith('lease_001', 'tenant_A');
      expect(mockRepo.expire).toHaveBeenCalledTimes(1);
    });

    // TC7 — Error propagation from expire
    it('propagates unexpected repository errors from expire without swallowing them', async () => {
      const dbError = new Error('DB connection failed');
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockRepo.expire as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });
});
