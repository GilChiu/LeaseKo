import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';

export interface CreateLeaseUseCaseInput {
  tenantId: string;
  propertyId: string;
  unitId: string;
  tenantContactId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount?: number | null;
  notes?: string | null;
}

/**
 * CreateLeaseUseCase — creates a Lease for the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on LeaseRepository interface via LEASE_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Validation:
 * - startDate must be strictly before endDate.
 * - Cross-entity ownership (unit, property, contact belong to tenant) is enforced
 *   by the repository returning null, which this use case converts to NotFoundException.
 */
@Injectable()
export class CreateLeaseUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(input: CreateLeaseUseCaseInput): Promise<Lease> {
    if (input.startDate >= input.endDate) {
      throw new BadRequestException('startDate must be before endDate.');
    }

    const lease = await this.leases.create({
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      tenantContactId: input.tenantContactId,
      startDate: input.startDate,
      endDate: input.endDate,
      monthlyRent: input.monthlyRent,
      depositAmount: input.depositAmount ?? null,
      notes: input.notes ?? null,
    });

    if (!lease) {
      throw new NotFoundException(
        'One or more referenced resources were not found.',
      );
    }

    return lease;
  }
}
