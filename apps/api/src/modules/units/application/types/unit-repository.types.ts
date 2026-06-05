import { Unit } from '../../domain/entities/unit.entity';
import { UnitStatus } from '../../domain/entities/unit.entity';

/**
 * Input types for UnitRepository methods.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import from @prisma/client.
 * - CreateUnitInput.tenantId MUST always be set to the property's tenantId by the use case —
 *   it MUST NOT come from a client-supplied body/query/header.
 * - CreateUnitInput does not include `status` — units always start as AVAILABLE (DB default).
 */

export interface CreateUnitInput {
  tenantId: string;
  propertyId: string;
  unitNumber: string;
  floorArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  monthlyRent?: number | null;
  description?: string | null;
}

/**
 * UpdateUnitInput — partial update payload for UnitRepository.update().
 *
 * - All fields are optional (partial update semantics).
 * - Clearable fields are typed as `T | null`: passing null explicitly clears the field.
 * - MUST NOT include id, tenantId, or propertyId — those are immutable.
 * - UnitStatus imported from domain to avoid @prisma/client dependency.
 */
export interface UpdateUnitInput {
  unitNumber?: string;
  floorArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  monthlyRent?: number | null;
  description?: string | null;
  status?: UnitStatus;
}

export interface FindManyByPropertyOptions {
  page: number;
  limit: number;
}

export interface PagedUnits {
  items: Unit[];
  total: number;
}
