import { Inject, Injectable } from '@nestjs/common';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { PagedTenantContacts } from '../types/tenant-contact-repository.types';

export interface ListTenantContactsUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
}

/**
 * ListTenantContactsUseCase — returns a paginated list of active renter contacts.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - Delegates all persistence and filtering to the repository.
 */
@Injectable()
export class ListTenantContactsUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly contacts: TenantContactRepository,
  ) {}

  async execute(input: ListTenantContactsUseCaseInput): Promise<PagedTenantContacts> {
    return this.contacts.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
    });
  }
}
