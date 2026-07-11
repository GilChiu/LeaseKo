import { Inject, Injectable } from '@nestjs/common';
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from '../repositories/tenant-user.repository';
import { TenantUserStatus } from '../../domain/entities/tenant-user.entity';
import { PagedTenantUsers } from '../types/tenant-user-repository.types';

export interface ListTenantUsersUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: TenantUserStatus;
}

@Injectable()
export class ListTenantUsersUseCase {
  constructor(
    @Inject(TENANT_USER_REPOSITORY)
    private readonly tenantUsers: TenantUserRepository,
  ) {}

  async execute(input: ListTenantUsersUseCaseInput): Promise<PagedTenantUsers> {
    return this.tenantUsers.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
      status: input.status,
    });
  }
}
