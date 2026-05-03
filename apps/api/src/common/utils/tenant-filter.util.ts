export interface TenantWhereClause {
  tenantId: string;
}

/**
 * Returns a Prisma-compatible where clause fragment that scopes any query to a tenant.
 *
 * Use this in every repository method that reads or mutates a tenant-scoped model:
 *
 *   await prisma.property.findMany({ where: { ...tenantFilter(tenantId) } })
 *   await prisma.property.updateMany({ where: { id, ...tenantFilter(tenantId) }, data })
 *   await prisma.property.deleteMany({ where: { id, ...tenantFilter(tenantId) } })
 *
 * @param tenantId - The verified tenant ID from IRequestContext. Must be non-empty.
 * @throws Error if tenantId is empty, whitespace-only, or null-like at runtime.
 *
 * @see docs/tenant-isolation.md
 */
export function tenantFilter(tenantId: string): TenantWhereClause {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error(
      'tenantId is required for tenant-scoped queries. ' +
        'Ensure the route is protected by @RequiresTenant() and tenantId is extracted from IRequestContext.',
    );
  }
  return { tenantId };
}
