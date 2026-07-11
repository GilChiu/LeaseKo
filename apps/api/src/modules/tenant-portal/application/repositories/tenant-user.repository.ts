import { TenantUser } from '../../domain/entities/tenant-user.entity';
import {
  CreateInvitationInput,
  FindPagedByTenantOptions,
  PagedTenantUsers,
} from '../types/tenant-user-repository.types';

export const TENANT_USER_REPOSITORY = Symbol('TENANT_USER_REPOSITORY');

export interface TenantUserRepository {
  /**
   * Creates a PENDING invitation for a tenant contact. FK-validates that the
   * contact belongs to the tenant (and is not soft-deleted) and that no
   * TenantUser already exists for it. Returns null on FK/duplicate failure.
   */
  createInvitation(input: CreateInvitationInput): Promise<TenantUser | null>;

  /** Resolves the active portal account for a Clerk identity (guard path). */
  findActiveByClerkUserId(clerkUserId: string): Promise<TenantUser | null>;

  /** Looks up an invitation by its secret token (activation path, cross-tenant). */
  findByInvitationToken(token: string): Promise<TenantUser | null>;

  /** Binds a Clerk identity to a pending invitation and activates it. */
  activate(id: string, clerkUserId: string): Promise<TenantUser | null>;

  findByContactId(
    tenantContactId: string,
    tenantId: string,
  ): Promise<TenantUser | null>;

  findById(id: string, tenantId: string): Promise<TenantUser | null>;

  findPagedByTenant(
    tenantId: string,
    options: FindPagedByTenantOptions,
  ): Promise<PagedTenantUsers>;

  revoke(id: string, tenantId: string): Promise<TenantUser | null>;
}
