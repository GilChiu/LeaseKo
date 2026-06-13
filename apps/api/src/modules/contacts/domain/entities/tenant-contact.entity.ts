export interface TenantContact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
