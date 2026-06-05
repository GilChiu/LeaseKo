import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';
import { Property } from '../../domain/entities/property.entity';

/**
 * GetPropertyByIdUseCase — retrieves a single Property by ID, scoped to the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on PropertyRepository interface via PROPERTY_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Security invariant:
 * - findById returns null for both non-existent records and records belonging to
 *   a different tenant. Both cases throw NotFoundException — identical HTTP 404.
 * - The caller cannot determine which condition caused the 404 (FR-004).
 */
@Injectable()
export class GetPropertyByIdUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: { id: string; tenantId: string }): Promise<Property> {
    const property = await this.properties.findById(input.id, input.tenantId);
    if (!property) {
      throw new NotFoundException('Property not found.');
    }
    return property;
  }
}
