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

export interface TerminateLeaseUseCaseInput {
  id: string;
  tenantId: string;
}

/**
 * TerminateLeaseUseCase — transitions an ACTIVE lease to TERMINATED and marks the unit AVAILABLE.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - Business rule validation (status must be ACTIVE) lives here; the atomic DB
 *   operation (lease + unit update) is delegated to the repository.
 */
@Injectable()
export class TerminateLeaseUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(input: TerminateLeaseUseCaseInput): Promise<Lease> {
    const lease = await this.leases.findById(input.id, input.tenantId);
    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }
    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Lease cannot be terminated from status '${lease.status}'.`,
      );
    }
    const updated = await this.leases.terminate(input.id, input.tenantId);
    if (!updated) {
      throw new NotFoundException('Lease not found.');
    }
    return updated;
  }
}
