import { Inject, Injectable } from '@nestjs/common';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';
import {
  PagedProperties,
} from '../types/property-repository.types';

/**
 * ListPropertiesUseCase — returns a paginated list of Properties for the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on PropertyRepository interface via PROPERTY_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 */
@Injectable()
export class ListPropertiesUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: {
    tenantId: string;
    page: number;
    limit: number;
  }): Promise<PagedProperties> {
    return this.properties.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
    });
  }
}
