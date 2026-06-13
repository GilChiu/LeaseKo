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

export interface ActivateLeaseUseCaseInput {
  id: string;
  tenantId: string;
}

/**
 * ActivateLeaseUseCase — transitions a DRAFT lease to ACTIVE and marks the unit OCCUPIED.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - Business rule validation (status must be DRAFT) lives here; the atomic DB
 *   operation (lease + unit update) is delegated to the repository.
 */
@Injectable()
export class ActivateLeaseUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(input: ActivateLeaseUseCaseInput): Promise<Lease> {
    const lease = await this.leases.findById(input.id, input.tenantId);
    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }
    if (lease.status !== 'DRAFT') {
      throw new BadRequestException(
        `Lease cannot be activated from status '${lease.status}'.`,
      );
    }
    const updated = await this.leases.activate(input.id, input.tenantId);
    if (!updated) {
      throw new NotFoundException('Lease not found.');
    }
    return updated;
  }
}
