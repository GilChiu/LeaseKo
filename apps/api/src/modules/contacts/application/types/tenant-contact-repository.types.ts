import { TenantContact } from '../../domain/entities/tenant-contact.entity';

export interface CreateTenantContactInput {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
}

export interface UpdateTenantContactInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  idNumber?: string | null;
  notes?: string | null;
}

export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
}

export interface PagedTenantContacts {
  items: TenantContact[];
  total: number;
}
