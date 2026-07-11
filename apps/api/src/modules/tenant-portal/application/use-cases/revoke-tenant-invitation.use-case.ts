import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

export interface RevokeTenantInvitationUseCaseInput {
  id: string;
  tenantId: string;
}

@Injectable()
export class RevokeTenantInvitationUseCase {
  constructor(
    @Inject(TENANT_USER_REPOSITORY)
    private readonly tenantUsers: TenantUserRepository,
  ) {}

  async execute(
    input: RevokeTenantInvitationUseCaseInput,
  ): Promise<TenantUser> {
    const revoked = await this.tenantUsers.revoke(input.id, input.tenantId);
    if (!revoked) {
      throw new NotFoundException('Tenant portal account not found.');
    }
    return revoked;
  }
}
