import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';

export interface ArchiveTenantContactUseCaseInput {
  id: string;
  tenantId: string;
}

/**
 * ArchiveTenantContactUseCase — soft-archives a TenantContact owned by the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on TenantContactRepository interface via TENANT_CONTACT_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Security invariant:
 * - softDelete() returns false for both non-existent records and records
 *   belonging to a different tenant. Both cases throw NotFoundException (HTTP 404).
 *   The caller cannot determine which condition caused the 404.
 */
@Injectable()
export class ArchiveTenantContactUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly repo: TenantContactRepository,
  ) {}

  async execute(input: ArchiveTenantContactUseCaseInput): Promise<void> {
    const archived = await this.repo.softDelete(input.id, input.tenantId);
    if (!archived) {
      throw new NotFoundException('Contact not found.');
    }
  }
}
