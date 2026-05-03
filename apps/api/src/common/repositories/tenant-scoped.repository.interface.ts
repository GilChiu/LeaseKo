/**
 * ITenantScopedRepository<T>
 *
 * Base interface for all Prisma repository implementations of tenant-scoped models.
 *
 * Architecture rules enforced by this interface:
 * - Every read method requires `tenantId` — no unscoped queries are possible.
 * - Every mutation method requires both `id` and `tenantId` — no id-only mutations.
 * - No method accepts an Express Request, NestJS ExecutionContext, or JWT token.
 *   Repositories are infrastructure — they know nothing about HTTP.
 *
 * Prisma implementation pattern:
 *   findMany  → prisma.model.findMany({ where: { ...tenantFilter(tenantId), ...filters } })
 *   findById  → prisma.model.findFirst({ where: { id, ...tenantFilter(tenantId) } })
 *   create    → prisma.model.create({ data: { ...data, tenantId } })
 *   update    → prisma.model.updateMany({ where: { id, ...tenantFilter(tenantId) }, data }) + count check
 *   delete    → prisma.model.deleteMany({ where: { id, ...tenantFilter(tenantId) } }) + count check
 *
 * @see docs/tenant-isolation.md for full architecture documentation
 * @see specs/011-tenant-safe-queries/contracts/ITenantScopedRepository.md for the contract specification
 */
export interface ITenantScopedRepository<T> {
  /**
   * Return all records belonging to a tenant, with optional additional filters.
   */
  findMany(tenantId: string, filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Find a single record by its ID, scoped to a tenant.
   * Returns null if the record does not exist OR belongs to a different tenant.
   * These two cases are intentionally indistinguishable to callers.
   */
  findById(id: string, tenantId: string): Promise<T | null>;

  /**
   * Create a new record for a tenant.
   * tenantId is injected by the repository from this parameter —
   * it MUST NOT come from the caller's data payload.
   */
  create(tenantId: string, data: Record<string, unknown>): Promise<T>;

  /**
   * Update a record by id, scoped to a tenant.
   * Returns null if the record does not exist OR belongs to a different tenant.
   * Implementation must use an atomic compound where clause: { id, tenantId }.
   */
  update(id: string, tenantId: string, data: Record<string, unknown>): Promise<T | null>;

  /**
   * Delete a record by id, scoped to a tenant.
   * Returns false if the record does not exist OR belongs to a different tenant.
   * Implementation must use an atomic compound where clause: { id, tenantId }.
   */
  delete(id: string, tenantId: string): Promise<boolean>;
}
