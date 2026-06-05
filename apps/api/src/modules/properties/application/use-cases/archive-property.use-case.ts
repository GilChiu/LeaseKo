import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../repositories/property.repository';

/**
 * ArchivePropertyUseCase — soft-archives a Property owned by the current tenant.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - MUST NOT read HTTP request objects or parse JWTs.
 * - Depends on PropertyRepository interface via PROPERTY_REPOSITORY token only.
 * - tenantId MUST come from verified request context (supplied by controller).
 *
 * Idempotency guarantee:
 * - softDelete() returns true for both active and already-archived properties.
 *   Both cases return void — the caller cannot distinguish them.
 *
 * Security invariant:
 * - softDelete() returns false for both non-existent records and records
 *   belonging to a different tenant. Both cases throw NotFoundException (HTTP 404).
 * - The caller cannot determine which condition caused the 404 (FR-006, FR-007).
 */
@Injectable()
export class ArchivePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly properties: PropertyRepository,
  ) {}

  async execute(input: { id: string; tenantId: string }): Promise<void> {
    const archived = await this.properties.softDelete(input.id, input.tenantId);
    if (!archived) {
      throw new NotFoundException('Property not found.');
    }
  }
}
