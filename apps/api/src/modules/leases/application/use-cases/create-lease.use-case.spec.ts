import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateLeaseUseCase } from './create-lease.use-case';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';

/**
 * Unit tests for CreateLeaseUseCase.
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
  depositAmount: 50000,
  notes: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseInput = {
  tenantId: 'tenant_A',
  propertyId: 'prop_001',
  unitId: 'unit_001',
  tenantContactId: 'contact_001',
  startDate: new Date('2026-07-01'),
  endDate: new Date('2027-06-30'),
  monthlyRent: 25000,
  depositAmount: 50000,
  notes: null,
};

describe('CreateLeaseUseCase', () => {
  const mockRepo: LeaseRepository = {
    create: jest.fn(),
    findPagedByTenant: jest.fn(),
    findById: jest.fn(),
    activate: jest.fn(),
    expire: jest.fn(),
    terminate: jest.fn(),
    hasActiveLeaseForUnit: jest.fn(),
  };

  let useCase: CreateLeaseUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateLeaseUseCase(mockRepo);
  });

  describe('execute', () => {
    // TC1 — Happy path
    it('returns created lease when all inputs are valid', async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(baseLease);

      const result = await useCase.execute(baseInput);

      expect(result).toEqual(baseLease);
    });

    // TC2 — startDate equals endDate
    it('throws BadRequestException when startDate equals endDate', async () => {
      const date = new Date('2026-07-01');
      await expect(
        useCase.execute({ ...baseInput, startDate: date, endDate: date }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    // TC3 — startDate after endDate
    it('throws BadRequestException when startDate is after endDate', async () => {
      await expect(
        useCase.execute({
          ...baseInput,
          startDate: new Date('2027-01-01'),
          endDate: new Date('2026-01-01'),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    // TC4 — Repository returns null (cross-tenant or not-found)
    it('throws NotFoundException when repository returns null', async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(baseInput)).rejects.toThrow(NotFoundException);
    });

    // TC5 — Argument forwarding
    it('passes exact input to repository (including optional fields)', async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(baseLease);

      await useCase.execute({ ...baseInput, notes: 'Test note' });

      expect(mockRepo.create).toHaveBeenCalledWith({
        tenantId: 'tenant_A',
        propertyId: 'prop_001',
        unitId: 'unit_001',
        tenantContactId: 'contact_001',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2027-06-30'),
        monthlyRent: 25000,
        depositAmount: 50000,
        notes: 'Test note',
      });
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
    });

    // TC6 — Undefined optionals default to null
    it('converts undefined depositAmount and notes to null before passing to repository', async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(baseLease);

      await useCase.execute({
        ...baseInput,
        depositAmount: undefined,
        notes: undefined,
      });

      const call = (mockRepo.create as jest.Mock).mock.calls[0][0];
      expect(call.depositAmount).toBeNull();
      expect(call.notes).toBeNull();
    });

    // TC7 — Error propagation
    it('propagates unexpected repository errors without swallowing them', async () => {
      const repoError = new Error('DB connection failed');
      (mockRepo.create as jest.Mock).mockRejectedValueOnce(repoError);

      await expect(useCase.execute(baseInput)).rejects.toBe(repoError);
    });
  });
});
