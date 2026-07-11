import {
  TenantUser,
  TenantUserStatus,
} from '../../domain/entities/tenant-user.entity';

export interface CreateInvitationInput {
  tenantId: string;
  tenantContactId: string;
  invitationToken: string;
  invitationExpiresAt: Date;
}

export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
  status?: TenantUserStatus;
}

export interface PagedTenantUsers {
  items: TenantUser[];
  total: number;
}
