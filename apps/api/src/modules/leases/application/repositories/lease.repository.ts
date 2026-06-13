import { Lease } from '../../domain/entities/lease.entity';
import {
  CreateLeaseInput,
  FindPagedByTenantOptions,
  PagedLeases,
} from '../types/lease-repository.types';

/**
 * LeaseRepository — application-layer interface for Lease data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via LEASE_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaLeaseRepository directly.
 *
 * Tenant-safety rules:
 * - Every method requires tenantId for workspace isolation.
 * - tenantId is supplied from verified request context — NEVER from body/query/header.
 */
export const LEASE_REPOSITORY = Symbol('LEASE_REPOSITORY');

export interface LeaseRepository {
  /**
   * Create a new Lease after verifying that unitId, propertyId, and tenantContactId
   * all belong to the given tenant (non-archived).
   * Returns null if any referenced entity is not found or belongs to a different tenant.
   */
  create(input: CreateLeaseInput): Promise<Lease | null>;

  /**
   * Return a paginated slice of non-deleted leases for a tenant, ordered by createdAt DESC.
   * Optionally filters by status. tenantId MUST come from verified request context.
   */
  findPagedByTenant(
    tenantId: string,
    options: FindPagedByTenantOptions,
  ): Promise<PagedLeases>;

  /**
   * Find a single non-deleted lease by ID within a workspace.
   * Returns null when: ID does not exist, belongs to a different tenant, or is soft-deleted.
   * All three cases are intentionally indistinguishable to prevent information leakage.
   */
  findById(id: string, tenantId: string): Promise<Lease | null>;

  /**
   * Atomically transition DRAFT → ACTIVE and mark the unit OCCUPIED.
   * Returns null if the lease is not found or belongs to a different tenant.
   * Status validation (must be DRAFT) is the caller's responsibility.
   */
  activate(id: string, tenantId: string): Promise<Lease | null>;

  /**
   * Atomically transition ACTIVE → EXPIRED and mark the unit AVAILABLE.
   * Returns null if the lease is not found or belongs to a different tenant.
   * Status validation (must be ACTIVE) is the caller's responsibility.
   */
  expire(id: string, tenantId: string): Promise<Lease | null>;

  /**
   * Atomically transition ACTIVE → TERMINATED and mark the unit AVAILABLE.
   * Returns null if the lease is not found or belongs to a different tenant.
   * Status validation (must be ACTIVE) is the caller's responsibility.
   */
  terminate(id: string, tenantId: string): Promise<Lease | null>;
}
