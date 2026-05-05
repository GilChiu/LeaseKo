/**
 * TenantMembershipRepository — application-layer interface for TenantMembership data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This interface MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via TENANT_MEMBERSHIP_REPOSITORY token.
 *
 * NOTE: TenantMembership is a global identity model. The userId and tenantId
 * parameters in these methods are composite lookup keys — not tenant isolation
 * filters in the ITenantScopedRepository sense. Future tenant-owned business
 * models (Property, Unit, etc.) will use tenantFilter() for isolation.
 *
 * @see apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant-membership.repository.ts
 * @see apps/api/src/common/repositories/tenant-scoped.repository.interface.ts
 * @see docs/data-layer.md
 */
export const TENANT_MEMBERSHIP_REPOSITORY = Symbol("TENANT_MEMBERSHIP_REPOSITORY");

// ─────────────────────────────────────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantMembershipRecord {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateTenantMembershipInput {
  userId: string;
  tenantId: string;
  /** Defaults to "member" if not provided. */
  role?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository interface
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantMembershipRepository {
  /**
   * Find the membership record for a specific user-tenant pair.
   * Returns null if no membership exists.
   * Uses the composite unique index [userId, tenantId].
   */
  findMembership(
    userId: string,
    tenantId: string,
  ): Promise<TenantMembershipRecord | null>;

  /**
   * Create a new user-tenant membership.
   * Throws if the [userId, tenantId] pair already exists (P2002).
   * Defaults role to "member" if not provided.
   */
  create(input: CreateTenantMembershipInput): Promise<TenantMembershipRecord>;

  /**
   * Return all tenant memberships for a given user (across all tenants).
   * Returns empty array if the user has no memberships.
   */
  findUserTenants(userId: string): Promise<TenantMembershipRecord[]>;

  /**
   * Return all user memberships for a given tenant.
   * Returns empty array if the tenant has no members.
   */
  findTenantUsers(tenantId: string): Promise<TenantMembershipRecord[]>;
}
