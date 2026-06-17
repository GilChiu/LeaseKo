import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  TerminateLeaseUseCase,
  TerminateLeaseUseCaseInput,
} from './terminate-lease.use-case';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';

/**
 * Unit tests for TerminateLeaseUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - LeaseRepository is mocked entirely.
 *
 * State machine invariant:
 * - Only ACTIVE leases may be terminated. Any other status throws BadRequestException.
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

const terminatedLease: Lease = { ...activeLease, status: 'TERMINATED' };

const validInput: TerminateLeaseUseCaseInput = {
  id: 'lease_001',
  tenantId: 'tenant_A',
};

describe('TerminateLeaseUseCase', () => {
  const mockRepo: LeaseRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    activate: jest.fn(),
    expire: jest.fn(),
    terminate: jest.fn(),
    hasActiveLeaseForUnit: jest.fn(),
  };

  let useCase: TerminateLeaseUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new TerminateLeaseUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: ACTIVE → TERMINATED
    it('returns the terminated lease when lease is in ACTIVE status', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockRepo.terminate as jest.Mock).mockResolvedValueOnce(terminatedLease);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(terminatedLease);
    });

    // TC2 — Not found: findById returns null
    it('throws NotFoundException when the lease does not exist', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(NotFoundException);
      expect(mockRepo.terminate).not.toHaveBeenCalled();
    });

    // TC3 — Wrong status: DRAFT
    it('throws BadRequestException when lease status is DRAFT', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        status: 'DRAFT',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.terminate).not.toHaveBeenCalled();
    });

    // TC4 — Wrong status: EXPIRED
    it('throws BadRequestException when lease status is EXPIRED', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        status: 'EXPIRED',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.terminate).not.toHaveBeenCalled();
    });

    // TC5 — Wrong status: already TERMINATED
    it('throws BadRequestException when lease status is already TERMINATED', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...activeLease,
        status: 'TERMINATED',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.terminate).not.toHaveBeenCalled();
    });

    // TC6 — Argument forwarding
    it('calls findById and terminate with exact id and tenantId', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockRepo.terminate as jest.Mock).mockResolvedValueOnce(terminatedLease);

      await useCase.execute(validInput);

      expect(mockRepo.findById).toHaveBeenCalledWith('lease_001', 'tenant_A');
      expect(mockRepo.terminate).toHaveBeenCalledWith('lease_001', 'tenant_A');
      expect(mockRepo.terminate).toHaveBeenCalledTimes(1);
    });

    // TC7 — Error propagation from terminate
    it('propagates unexpected repository errors from terminate without swallowing them', async () => {
      const dbError = new Error('DB connection failed');
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(activeLease);
      (mockRepo.terminate as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });
  });
});
