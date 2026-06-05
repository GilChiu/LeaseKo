import { Property } from '../../domain/entities/property.entity';

/**
 * Input types for PropertyRepository methods.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import from @prisma/client.
 * - CreatePropertyInput includes tenantId — it MUST come from verified request context,
 *   never from a client-supplied body/query/header.
 * - UpdatePropertyInput MUST NOT include tenantId — tenant ownership is immutable.
 */

export interface CreatePropertyInput {
  tenantId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  propertyType: string;
  description?: string | null;
}

export interface UpdatePropertyInput {
  name?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  propertyType?: string;
  description?: string | null;
}

export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
}

export interface PagedProperties {
  items: Property[];
  total: number;
}
