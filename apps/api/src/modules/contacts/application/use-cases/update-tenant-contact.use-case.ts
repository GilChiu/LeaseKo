import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TENANT_CONTACT_REPOSITORY,
  TenantContactRepository,
} from '../repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';

export interface UpdateTenantContactUseCaseInput {
  id: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}

/**
 * UpdateTenantContactUseCase — partially updates an active renter contact.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId MUST come from verified request context (supplied by controller).
 * - email is normalised to lowercase here before uniqueness check and persistence.
 */
@Injectable()
export class UpdateTenantContactUseCase {
  constructor(
    @Inject(TENANT_CONTACT_REPOSITORY)
    private readonly contacts: TenantContactRepository,
  ) {}

  async execute(input: UpdateTenantContactUseCaseInput): Promise<TenantContact> {
    const { id, tenantId, firstName, lastName, email, phone, idNumber, notes } = input;

    const hasFields =
      firstName !== undefined ||
      lastName !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      idNumber !== undefined ||
      notes !== undefined;

    if (!hasFields) {
      throw new BadRequestException('At least one field must be provided.');
    }

    const existing = await this.contacts.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Contact not found.');
    }

    let normalizedEmail: string | undefined;
    if (email !== undefined) {
      normalizedEmail = email.toLowerCase().trim();
      const duplicate = await this.contacts.findByEmail(tenantId, normalizedEmail);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          'A contact with this email already exists in this workspace.',
        );
      }
    }

    const patchData = {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(normalizedEmail !== undefined && { email: normalizedEmail }),
      ...(phone !== undefined && { phone }),
      ...(idNumber !== undefined && { idNumber }),
      ...(notes !== undefined && { notes }),
    };

    const updated = await this.contacts.update(id, tenantId, patchData);
    if (!updated) {
      throw new NotFoundException('Contact not found.');
    }
    return updated;
  }
}
