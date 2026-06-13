import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';

export interface GetLeaseByIdUseCaseInput {
  id: string;
  tenantId: string;
}

/**
 * GetLeaseByIdUseCase — retrieves a single non-deleted lease by ID.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - Throws NotFoundException for all inaccessible cases (missing, cross-tenant,
 *   soft-deleted) — the repository returns null for all three, making them
 *   indistinguishable here and in the HTTP response.
 */
@Injectable()
export class GetLeaseByIdUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(input: GetLeaseByIdUseCaseInput): Promise<Lease> {
    const lease = await this.leases.findById(input.id, input.tenantId);
    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }
    return lease;
  }
}
