/**
 * Property — core domain entity for the Properties bounded context.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import from @prisma/client or PrismaService.
 * - MUST NOT import NestJS decorators.
 * - MUST NOT depend on HTTP request objects.
 * - MUST NOT contain persistence logic.
 *
 * @see apps/api/src/modules/properties/application/repositories/property.repository.ts
 */
export interface Property {
  id: string;
  tenantId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  propertyType: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
