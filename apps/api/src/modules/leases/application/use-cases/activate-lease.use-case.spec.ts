import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  ActivateLeaseUseCase,
  ActivateLeaseUseCaseInput,
} from './activate-lease.use-case';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';

/**
 * Unit tests for ActivateLeaseUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - LeaseRepository is mocked entirely.
 *
 * State machine invariant:
 * - Only DRAFT leases may be activated. Any other status throws BadRequestException.
 */

void LEASE_REPOSITORY;

const draftLease: Lease = {
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

const activatedLease: Lease = { ...draftLease, status: 'ACTIVE' };

const validInput: ActivateLeaseUseCaseInput = {
  id: 'lease_001',
  tenantId: 'tenant_A',
};

describe('ActivateLeaseUseCase', () => {
  const mockRepo: LeaseRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    activate: jest.fn(),
    expire: jest.fn(),
    terminate: jest.fn(),
    hasActiveLeaseForUnit: jest.fn(),
  };

  let useCase: ActivateLeaseUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ActivateLeaseUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path: DRAFT → ACTIVE
    it('returns the activated lease when lease is in DRAFT status', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(draftLease);
      (mockRepo.hasActiveLeaseForUnit as jest.Mock).mockResolvedValueOnce(false);
      (mockRepo.activate as jest.Mock).mockResolvedValueOnce(activatedLease);

      const result = await useCase.execute(validInput);

      expect(result).toEqual(activatedLease);
    });

    // TC2 — Not found: findById returns null
    it('throws NotFoundException when the lease does not exist', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(NotFoundException);
      expect(mockRepo.activate).not.toHaveBeenCalled();
    });

    // TC3 — Wrong status: ACTIVE
    it('throws BadRequestException when lease status is already ACTIVE', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...draftLease,
        status: 'ACTIVE',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.activate).not.toHaveBeenCalled();
    });

    // TC4 — Wrong status: EXPIRED
    it('throws BadRequestException when lease status is EXPIRED', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...draftLease,
        status: 'EXPIRED',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.activate).not.toHaveBeenCalled();
    });

    // TC5 — Wrong status: TERMINATED
    it('throws BadRequestException when lease status is TERMINATED', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce({
        ...draftLease,
        status: 'TERMINATED',
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(BadRequestException);
      expect(mockRepo.activate).not.toHaveBeenCalled();
    });

    // TC6 — Argument forwarding
    it('calls findById, hasActiveLeaseForUnit, and activate with correct args', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(draftLease);
      (mockRepo.hasActiveLeaseForUnit as jest.Mock).mockResolvedValueOnce(false);
      (mockRepo.activate as jest.Mock).mockResolvedValueOnce(activatedLease);

      await useCase.execute(validInput);

      expect(mockRepo.findById).toHaveBeenCalledWith('lease_001', 'tenant_A');
      expect(mockRepo.hasActiveLeaseForUnit).toHaveBeenCalledWith('unit_001', 'tenant_A');
      expect(mockRepo.activate).toHaveBeenCalledWith('lease_001', 'tenant_A');
      expect(mockRepo.activate).toHaveBeenCalledTimes(1);
    });

    // TC7 — Error propagation from activate
    it('propagates unexpected repository errors from activate without swallowing them', async () => {
      const dbError = new Error('DB connection failed');
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(draftLease);
      (mockRepo.hasActiveLeaseForUnit as jest.Mock).mockResolvedValueOnce(false);
      (mockRepo.activate as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(useCase.execute(validInput)).rejects.toBe(dbError);
    });

    // TC8 — Unit already occupied: ConflictException
    it('throws ConflictException when unit already has an active lease', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(draftLease);
      (mockRepo.hasActiveLeaseForUnit as jest.Mock).mockResolvedValueOnce(true);

      await expect(useCase.execute(validInput)).rejects.toThrow(ConflictException);
      expect(mockRepo.activate).not.toHaveBeenCalled();
    });

    // TC9 — Unit free: activation proceeds
    it('proceeds with activation when unit has no active lease', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValueOnce(draftLease);
      (mockRepo.hasActiveLeaseForUnit as jest.Mock).mockResolvedValueOnce(false);
      (mockRepo.activate as jest.Mock).mockResolvedValueOnce(activatedLease);

      const result = await useCase.execute(validInput);

      expect(mockRepo.hasActiveLeaseForUnit).toHaveBeenCalledWith('unit_001', 'tenant_A');
      expect(result).toEqual(activatedLease);
    });
  });
});
