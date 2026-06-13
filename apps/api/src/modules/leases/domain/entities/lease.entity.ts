/**
 * LeaseStatus — mirrors the Prisma LeaseStatus enum.
 * Using a string union here keeps the domain layer free of Prisma imports.
 */
export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

/**
 * Lease — domain entity for a lease agreement.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST be a plain TypeScript interface (no classes, no decorators).
 * - MUST NOT import from @prisma/client, NestJS, or any infrastructure library.
 * - All fields use primitive types or Date; no Prisma Decimal here.
 */
export interface Lease {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  tenantContactId: string;
  status: LeaseStatus;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
