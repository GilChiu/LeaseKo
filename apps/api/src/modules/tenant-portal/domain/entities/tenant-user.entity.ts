export type TenantUserStatus = 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface TenantUser {
  id: string;
  tenantId: string;
  tenantContactId: string;
  email: string;
  clerkUserId: string | null;
  status: TenantUserStatus;
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  activatedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
