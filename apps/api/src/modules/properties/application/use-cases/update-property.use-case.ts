import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';
import { UpdatePropertyInput } from '../types/property-repository.types';
import { Property } from '../../domain/entities/property.entity';

/**
 * UpdatePropertyUseCase — applies a partial update to a Property owned by the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on PropertyRepository interface via PROPERTY_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Security invariant:
 * - update() returns null for both non-existent records and records belonging to
 *   a different tenant. Both cases throw NotFoundException — identical HTTP 404.
 * - The caller cannot determine which condition caused the 404 (FR-004, FR-005).
 */
@Injectable()
export class UpdatePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: {
    id: string;
    tenantId: string;
    data: UpdatePropertyInput;
  }): Promise<Property> {
    const updated = await this.properties.update(input.id, input.tenantId, input.data);
    if (!updated) {
      throw new NotFoundException('Property not found.');
    }
    return updated;
  }
}
