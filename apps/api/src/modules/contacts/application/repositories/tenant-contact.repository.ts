import { TenantContact } from '../../domain/entities/tenant-contact.entity';
import {
  CreateTenantContactInput,
  FindPagedByTenantOptions,
  PagedTenantContacts,
  UpdateTenantContactInput,
} from '../types/tenant-contact-repository.types';

/**
 * TenantContactRepository — application-layer interface for TenantContact data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This interface MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via TENANT_CONTACT_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaService or PrismaTenantContactRepository directly.
 *
 * Tenant-safety rules:
 * - Every read and mutation method requires tenantId.
 * - tenantId is supplied from verified request context — NEVER from body/query/header.
 */
export const TENANT_CONTACT_REPOSITORY = Symbol('TENANT_CONTACT_REPOSITORY');

export interface TenantContactRepository {
  /**
   * Create a new TenantContact linked to the given tenant.
   * email MUST be pre-normalised to lowercase by the caller (use case).
   */
  create(input: CreateTenantContactInput): Promise<TenantContact>;

  /**
   * Find an active (non-archived) contact by email within a workspace.
   * email MUST be pre-normalised to lowercase by the caller.
   * Returns null when no active contact matches.
   */
  findByEmail(tenantId: string, email: string): Promise<TenantContact | null>;

  /**
   * Find a single active (non-archived) contact by ID within a workspace.
   * Returns null when: ID does not exist, belongs to a different tenant,
   * or the contact has been archived. All three cases are intentionally
   * indistinguishable to prevent information leakage.
   */
  findById(id: string, tenantId: string): Promise<TenantContact | null>;

  /**
   * Partially update an active contact by ID, scoped to a tenant.
   * Only provided fields are changed; omitted fields are left unchanged.
   * Returns null when: ID not found, belongs to different tenant, or archived.
   * email MUST be pre-normalised to lowercase by the caller (use case).
   */
  update(
    id: string,
    tenantId: string,
    data: UpdateTenantContactInput,
  ): Promise<TenantContact | null>;

  /**
   * Return a paginated slice of active (non-archived) contacts for a tenant,
   * ordered by createdAt DESC. Archived contacts are excluded from both items and total.
   * tenantId MUST come from verified request context — never from client payload.
   */
  findPagedByTenant(
    tenantId: string,
    options: FindPagedByTenantOptions,
  ): Promise<PagedTenantContacts>;

  /**
   * Soft-delete a contact by setting deletedAt to the current timestamp.
   * Returns true if the record was found and archived.
   * Returns false if the record does not exist or belongs to a different tenant.
   * Both cases are intentionally indistinguishable to prevent information leakage.
   */
  softDelete(id: string, tenantId: string): Promise<boolean>;
}
