import { randomBytes } from 'crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

export interface InviteTenantUserUseCaseInput {
  tenantId: string;
  tenantContactId: string;
}

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class InviteTenantUserUseCase {
  constructor(
    @Inject(TENANT_USER_REPOSITORY)
    private readonly tenantUsers: TenantUserRepository,
  ) {}

  async execute(input: InviteTenantUserUseCaseInput): Promise<TenantUser> {
    const existing = await this.tenantUsers.findByContactId(
      input.tenantContactId,
      input.tenantId,
    );
    if (existing) {
      throw new ConflictException(
        'This contact already has a tenant portal account or pending invitation.',
      );
    }

    const invitationToken = randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(
      Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const invitation = await this.tenantUsers.createInvitation({
      tenantId: input.tenantId,
      tenantContactId: input.tenantContactId,
      invitationToken,
      invitationExpiresAt,
    });

    if (!invitation) {
      throw new NotFoundException('Tenant contact not found.');
    }

    return invitation;
  }
}
