/**
 * TenantRepository — application-layer interface for Tenant data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This interface MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via TENANT_REPOSITORY token.
 * - Tenant is a global identity model — it does NOT carry a tenantId filter.
 *
 * @see apps/api/src/modules/tenants/infrastructure/repositories/prisma-tenant.repository.ts
 * @see docs/data-layer.md
 */
export const TENANT_REPOSITORY = Symbol("TENANT_REPOSITORY");

// ─────────────────────────────────────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantRecord {
  id: string;
  clerkOrgId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateTenantInput {
  clerkOrgId: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository interface
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantRepository {
  /**
   * Find a tenant by their internal UUID.
   * Returns null if no tenant with that ID exists.
   */
  findById(id: string): Promise<TenantRecord | null>;

  /**
   * Find a tenant by their Clerk organization ID (e.g. "org_2abc123").
   * Returns null if no matching tenant exists.
   * Primary lookup used for Clerk org sync and JWT guard tenant resolution.
   */
  findByClerkOrgId(clerkOrgId: string): Promise<TenantRecord | null>;

  /**
   * Create a new tenant record from Clerk organization data.
   * Throws if a tenant with the same clerkOrgId already exists (P2002).
   */
  create(input: CreateTenantInput): Promise<TenantRecord>;

  /**
   * Update a tenant's display name.
   * Returns null if no tenant with the given ID exists.
   */
  updateName(id: string, name: string): Promise<TenantRecord | null>;
}
