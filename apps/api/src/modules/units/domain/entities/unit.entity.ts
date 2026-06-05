/**
 * Unit — core domain entity for the Units bounded context.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import from @prisma/client or PrismaService.
 * - MUST NOT import NestJS decorators.
 * - MUST NOT depend on HTTP request objects.
 * - MUST NOT contain persistence logic.
 *
 * @see apps/api/src/modules/units/application/repositories/unit.repository.ts
 */
export type UnitStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';

export interface Unit {
  id: string;
  tenantId: string;
  propertyId: string;
  unitNumber: string;
  status: UnitStatus;
  floorArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthlyRent: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
