import { Lease, LeaseStatus } from '../../domain/entities/lease.entity';

export interface CreateLeaseInput {
  tenantId: string;
  propertyId: string;
  unitId: string;
  tenantContactId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number | null;
  notes: string | null;
}

export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
  status?: LeaseStatus;
}

export interface PagedLeases {
  items: Lease[];
  total: number;
}
