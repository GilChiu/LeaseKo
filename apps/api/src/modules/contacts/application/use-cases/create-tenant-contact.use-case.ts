import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

export interface CreateTenantContactUseCaseInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}

/**
 * CreateTenantContactUseCase — creates a new renter contact under the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - email is normalised to lowercase here — the repository stores the normalised value.
 */
@Injectable()
export class CreateTenantContactUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly contacts: TenantContactRepository,
  ) {}

  async execute(input: CreateTenantContactUseCaseInput): Promise<TenantContact> {
    const normalizedEmail = input.email.toLowerCase().trim();

    const existing = await this.contacts.findByEmail(
      input.tenantId,
      normalizedEmail,
    );
    if (existing) {
      throw new ConflictException(
        'A contact with this email already exists in this workspace.',
      );
    }

    return this.contacts.create({
      tenantId: input.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: input.phone ?? null,
      idNumber: input.idNumber ?? null,
      notes: input.notes ?? null,
    });
  }
}
