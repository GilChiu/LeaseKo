import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  UNIT_REPOSITORY,
  UnitRepository,
} from '../repositories/unit.repository';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../../../properties/application/repositories/property.repository';
import { PagedUnits } from '../types/unit-repository.types';

/**
 * ListUnitsByPropertyUseCase — returns a paginated list of Units under a property
 * owned by the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on UnitRepository and PropertyRepository interfaces via DI tokens only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Security invariants:
 * - propertyRepository.findById() is called FIRST — before any unit query.
 *   This is mandatory: an accessible empty property and an inaccessible property
 *   would both return an empty unit list if the unit query ran first.
 * - All three inaccessible cases (non-existent, cross-tenant, archived) produce
 *   identical NotFoundException — indistinguishable by design.
 */
@Injectable()
export class ListUnitsByPropertyUseCase {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly units: UnitRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: {
    tenantId: string;
    propertyId: string;
    page: number;
    limit: number;
  }): Promise<PagedUnits> {
    const property = await this.properties.findById(
      input.propertyId,
      input.tenantId,
    );
    if (!property) {
      throw new NotFoundException('Property not found.');
    }

    return this.units.findManyByProperty(input.propertyId, input.tenantId, {
      page: input.page,
      limit: input.limit,
    });
  }
}
