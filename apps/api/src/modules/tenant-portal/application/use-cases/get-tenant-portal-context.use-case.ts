import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';

export interface GetTenantPortalContextUseCaseInput {
  clerkUserId: string;
}

@Injectable()
export class GetTenantPortalContextUseCase {
  constructor(
    @Inject(TENANT_USER_REPOSITORY)
    private readonly tenantUsers: TenantUserRepository,
  ) {}

  async execute(
    input: GetTenantPortalContextUseCaseInput,
  ): Promise<TenantUser> {
    const account = await this.tenantUsers.findActiveByClerkUserId(
      input.clerkUserId,
    );
    if (!account) {
      throw new NotFoundException('Tenant portal account not found.');
    }
    return account;
  }
}
