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
   * The tenant the request is scoped to (Clerk organization ID).
   * Populated from the JWT `org_id` claim (Feature 009).
   * null until tenant extraction is implemented.
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
