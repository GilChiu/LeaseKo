import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

export interface GetTenantContactByIdUseCaseInput {
  id: string;
  tenantId: string;
}

/**
 * GetTenantContactByIdUseCase — retrieves a single active renter contact by ID.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - Throws NotFoundException for all inaccessible cases (missing, cross-tenant,
 *   archived) — the repository returns null for all three, making them
 *   indistinguishable here and in the HTTP response.
 */
@Injectable()
export class GetTenantContactByIdUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly contacts: TenantContactRepository,
  ) {}

  async execute(input: GetTenantContactByIdUseCaseInput): Promise<TenantContact> {
    const contact = await this.contacts.findById(input.id, input.tenantId);
    if (!contact) {
      throw new NotFoundException('Contact not found.');
    }
    return contact;
  }
}
