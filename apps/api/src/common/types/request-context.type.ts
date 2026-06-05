/**
 * IRequestContext
 *
 * Represents the authenticated request context extracted from the JWT payload.
 * This type is attached to `request.user` by the auth guard (Epic 2 —
 * ClerkJwtGuard will replace StubBearerGuard and populate this from the Clerk JWT).
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - `tenantId` is the single source of truth for data isolation.
 *   Every repository query MUST include a `tenant_id` filter derived from this context.
 * - `tenantId` MUST never be sourced from the HTTP request body or query params.
 * - Use `@CurrentUser()` parameter decorator (Epic 2) to inject IRequestContext
 *   into controller methods instead of accessing `req.user` directly.
 */
export interface IRequestContext {
  /**
   * The authenticated user's unique identifier (Clerk user ID).
   * Populated by ClerkJwtGuard from the verified JWT `sub` claim (Feature 008).
   */
  userId: string;

  /**
   * The raw Clerk organization ID from the JWT `o.id` claim.
   * Required for tenant sync operations that need to upsert a Tenant record.
   * null when no active organization session.
   */
  clerkOrgId: string | null;

  /**
   * The internal Tenant.id (UUID) resolved from clerkOrgId via TenantRepository.
   * This is the FK value used for all tenant-scoped data isolation queries.
   * null when no active org session or when the org has no Tenant row yet.
   */
  tenantId: string | null;

  /**
   * The user's role within the tenant.
   * Values: 'owner' | 'manager' | 'tenant_user'.
   * Populated via database lookup (Feature 010+).
   * null until role resolution is implemented.
   */
  role: string | null;
}
