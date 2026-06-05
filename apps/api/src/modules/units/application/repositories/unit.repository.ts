import { Unit } from '../../domain/entities/unit.entity';
import {
  CreateUnitInput,
  FindManyByPropertyOptions,
  PagedUnits,
  UpdateUnitInput,
} from '../types/unit-repository.types';

/**
 * UnitRepository — application-layer interface for Unit data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This interface MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via UNIT_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaService or PrismaUnitRepository directly.
 *
 * Tenant-safety rules:
 * - Every method requires tenantId via CreateUnitInput.
 * - tenantId is supplied by application layer (use cases) from verified request context —
 *   NEVER from body/query/header. For create, tenantId is derived from the property.
 *
 * @see apps/api/src/modules/units/infrastructure/repositories/prisma-unit.repository.ts
 */
export const UNIT_REPOSITORY = Symbol('UNIT_REPOSITORY');

export interface UnitRepository {
  /**
   * Create a new Unit record linked to the given tenant and property.
   * tenantId in input MUST be derived from the property's tenantId by the use case —
   * never from client-supplied payload.
   */
  create(input: CreateUnitInput): Promise<Unit>;

  /**
   * Return a paginated list of Units for a property, scoped to a tenant.
   * Results are ordered by unitNumber ascending (lexicographic).
   * Returns { items: [], total: 0 } when no units exist — never throws for an empty result.
   *
   * IMPORTANT: The caller (use case) MUST verify property ownership via
   * PropertyRepository.findById() BEFORE calling this method. This method does
   * NOT check property existence — it queries units only.
   */
  findManyByProperty(
    propertyId: string,
    tenantId: string,
    options: FindManyByPropertyOptions,
  ): Promise<PagedUnits>;

  /**
   * Find a single Unit by its ID, scoped to a tenant.
   * Returns null if the record does not exist or belongs to a different tenant.
   * Both cases are intentionally indistinguishable.
   *
   * NOTE: Units have no deletedAt field — no soft-delete filter is applied.
   */
  findById(id: string, tenantId: string): Promise<Unit | null>;

  /**
   * Partially update a Unit by ID, scoped to a tenant.
   * Returns the updated Unit on success.
   * Returns null if the record does not exist OR belongs to a different tenant —
   * both cases are intentionally indistinguishable.
   *
   * NOTE: tenantId MUST NOT appear in input — it is immutable and used only for scoping the WHERE clause.
   */
  update(id: string, tenantId: string, input: UpdateUnitInput): Promise<Unit | null>;
}
