import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../../../leases/application/repositories/lease.repository';
import { Lease } from '../../../leases/domain/entities/lease.entity';

export interface GetTenantLeaseUseCaseInput {
  tenantId: string;
  tenantContactId: string;
}

/**
 * GetTenantLeaseUseCase — returns the current ACTIVE lease for the signed-in
 * renter (tenant portal). US 24.1.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId AND tenantContactId come from verified request context only.
 */
@Injectable()
export class GetTenantLeaseUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(input: GetTenantLeaseUseCaseInput): Promise<Lease> {
    const lease = await this.leases.findActiveByTenantContact(
      input.tenantId,
      input.tenantContactId,
    );
    if (!lease) {
      throw new NotFoundException('No active lease found for your account.');
    }
    return lease;
  }
}
