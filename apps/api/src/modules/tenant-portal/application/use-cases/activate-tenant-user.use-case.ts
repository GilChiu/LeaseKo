import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

export interface ActivateTenantUserUseCaseInput {
  clerkUserId: string;
  token: string;
}

@Injectable()
export class ActivateTenantUserUseCase {
  constructor(
    @Inject(TENANT_USER_REPOSITORY)
    private readonly tenantUsers: TenantUserRepository,
  ) {}

  async execute(input: ActivateTenantUserUseCaseInput): Promise<TenantUser> {
    const invitation = await this.tenantUsers.findByInvitationToken(
      input.token,
    );

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid or expired invitation.');
    }

    if (
      invitation.invitationExpiresAt &&
      invitation.invitationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired invitation.');
    }

    // One Clerk identity may be bound to only one tenant portal account.
    const alreadyBound = await this.tenantUsers.findActiveByClerkUserId(
      input.clerkUserId,
    );
    if (alreadyBound) {
      throw new ConflictException(
        'This account is already linked to a tenant portal.',
      );
    }

    const activated = await this.tenantUsers.activate(
      invitation.id,
      input.clerkUserId,
    );

    if (!activated) {
      throw new BadRequestException('Invalid or expired invitation.');
    }

    return activated;
  }
}
