import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  UNIT_REPOSITORY,
  UnitRepository,
} from '../repositories/unit.repository';
import { UpdateUnitInput } from '../types/unit-repository.types';
import { Unit } from '../../domain/entities/unit.entity';
import { ALLOWED_TRANSITIONS } from '../../domain/unit-status-transitions';

/**
 * UpdateUnitUseCase — partially updates a Unit by ID, scoped to the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on UnitRepository interface via UNIT_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Security invariant:
 * - update() returns null for both non-existent records and records belonging
 *   to a different tenant. Both cases throw NotFoundException — identical HTTP 404.
 * - ConflictException from the repository propagates unchanged (HTTP 409).
 *
 * Status transition guard:
 * - Only runs when input.data.status is defined.
 * - Reads current status via findById before evaluating the transition table.
 * - findById null → NotFoundException (covers not-found and cross-tenant).
 * - Same-status update → returns current unit as a no-op (no write, updatedAt unchanged).
 * - Invalid transition → UnprocessableEntityException (HTTP 422).
 * - INACTIVE is a terminal state — ALLOWED_TRANSITIONS[INACTIVE] is empty.
 */
@Injectable()
export class UpdateUnitUseCase {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly units: UnitRepository,
  ) {}

  async execute(input: {
    id: string;
    tenantId: string;
    data: UpdateUnitInput;
  }): Promise<Unit> {
    if (input.data.status !== undefined) {
      const current = await this.units.findById(input.id, input.tenantId);
      if (!current) {
        throw new NotFoundException('Unit not found.');
      }

      if (current.status === input.data.status) {
        return current;
      }

      const allowedNext = ALLOWED_TRANSITIONS[current.status];
      if (!allowedNext.includes(input.data.status)) {
        throw new UnprocessableEntityException(
          `Unit status cannot transition from ${current.status} to ${input.data.status}.`,
        );
      }
    }

    const unit = await this.units.update(input.id, input.tenantId, input.data);
    if (!unit) {
      throw new NotFoundException('Unit not found.');
    }
    return unit;
  }
}
