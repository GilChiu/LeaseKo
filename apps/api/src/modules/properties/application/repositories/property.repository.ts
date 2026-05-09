import { Property } from '../../domain/entities/property.entity';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
} from '../types/property-repository.types';

/**
 * PropertyRepository — application-layer interface for Property data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This interface MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via PROPERTY_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaService or PrismaPropertyRepository directly.
 *
 * Tenant-safety rules:
 * - Every read and mutation method requires tenantId.
 * - No method returns or modifies a Property without confirming tenant ownership.
 * - tenantId is supplied by application layer (use cases) from verified request context —
 *   NEVER from body/query/header.
 *
 * @see apps/api/src/modules/properties/infrastructure/repositories/prisma-property.repository.ts
 * @see docs/tenant-isolation.md
 */
export const PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY');

export interface PropertyRepository {
  /**
   * Create a new Property record linked to the given tenant.
   * tenantId is taken from input — it MUST come from verified request context,
   * not from any client-supplied payload.
   */
  create(input: CreatePropertyInput): Promise<Property>;

  /**
   * Return all active (non-deleted) Properties belonging to a tenant.
   * Records with deletedAt set are excluded automatically.
   */
  findManyByTenant(tenantId: string): Promise<Property[]>;

  /**
   * Find a single active Property by its ID, scoped to a tenant.
   * Returns null if the record does not exist, belongs to a different tenant,
   * or has been soft-deleted. These cases are intentionally indistinguishable.
   */
  findById(id: string, tenantId: string): Promise<Property | null>;

  /**
   * Update a Property's mutable fields, scoped to a tenant.
   * Returns null if the record does not exist or belongs to a different tenant.
   * tenantId MUST NOT be mutated.
   */
  update(
    id: string,
    tenantId: string,
    input: UpdatePropertyInput,
  ): Promise<Property | null>;

  /**
   * Soft-delete a Property by setting deletedAt to the current timestamp.
   * Returns true if the record was found and archived.
   * Returns false if no matching record exists for the given id + tenantId.
   */
  softDelete(id: string, tenantId: string): Promise<boolean>;
}
