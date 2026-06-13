import { Inject, Injectable } from '@nestjs/common';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../repositories/lease.repository';
import { LeaseStatus } from '../../domain/entities/lease.entity';
import { PagedLeases } from '../types/lease-repository.types';

export interface ListLeasesUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: LeaseStatus;
}

/**
 * ListLeasesUseCase — returns a paginated list of non-deleted leases for the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - Delegates all persistence and filtering to the repository.
 */
@Injectable()
export class ListLeasesUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(input: ListLeasesUseCaseInput): Promise<PagedLeases> {
    return this.leases.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
      status: input.status,
    });
  }
}
