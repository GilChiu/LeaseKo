import { SetMetadata } from "@nestjs/common";

/**
 * Marks a route as tenant-portal-only: the request must come from an
 * authenticated renter with an ACTIVE TenantUser account (role 'tenant_user').
 * Enforced by ClerkJwtGuard.
 */
export const IS_TENANT_PORTAL_KEY = "isTenantPortal";
export const TenantPortal = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_TENANT_PORTAL_KEY, true);
