import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  UNIT_REPOSITORY,
  UnitRepository,
} from '../repositories/unit.repository';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../../../properties/application/repositories/property.repository';
import { Unit } from '../../domain/entities/unit.entity';

export interface CreateUnitUseCaseInput {
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
 * CreateUnitUseCase — creates a new Unit under a property owned by the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on UnitRepository and PropertyRepository interfaces via DI tokens only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Security invariants:
 * - propertyRepository.findById returns null for non-existent, wrong-tenant, and archived
 *   properties — all three cases are intentionally indistinguishable (NotFoundException).
 * - The unit's tenantId is always derived from property.tenantId, not from input.tenantId
 *   directly — per spec FR-007.
 */
@Injectable()
export class CreateUnitUseCase {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly units: UnitRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: CreateUnitUseCaseInput): Promise<Unit> {
    const property = await this.properties.findById(
      input.propertyId,
      input.tenantId,
    );
    if (!property) {
      throw new NotFoundException('Property not found.');
    }

    return this.units.create({
      tenantId: property.tenantId,
      propertyId: input.propertyId,
      unitNumber: input.unitNumber,
      floorArea: input.floorArea ?? null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      monthlyRent: input.monthlyRent ?? null,
      description: input.description ?? null,
    });
  }
}
