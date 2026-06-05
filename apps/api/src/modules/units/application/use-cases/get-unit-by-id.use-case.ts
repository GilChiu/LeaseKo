import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  UNIT_REPOSITORY,
  UnitRepository,
} from '../repositories/unit.repository';
import { Unit } from '../../domain/entities/unit.entity';

/**
 * GetUnitByIdUseCase — retrieves a single Unit by ID, scoped to the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on UnitRepository interface via UNIT_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Security invariant:
 * - findById() returns null for both non-existent records and records belonging
 *   to a different tenant. Both cases throw NotFoundException — identical HTTP 404.
 * - The caller cannot determine which condition caused the 404.
 */
@Injectable()
export class GetUnitByIdUseCase {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly units: UnitRepository,
  ) {}

  async execute(input: { id: string; tenantId: string }): Promise<Unit> {
    const unit = await this.units.findById(input.id, input.tenantId);
    if (!unit) {
      throw new NotFoundException('Unit not found.');
    }
    return unit;
  }
}
