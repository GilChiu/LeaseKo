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
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PagedProperties {
  items: Property[];
  total: number;
  page: number;
  limit: number;
}

export interface Unit {
  id: string;
  tenantId: string;
  propertyId: string;
  unitNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
  floorArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthlyRent: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedUnits {
  items: Unit[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TenantContact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedContacts {
  items: TenantContact[];
  total: number;
  page: number;
  limit: number;
}

export type LeaseStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";

export interface Lease {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  tenantContactId: string;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedLeases {
  items: Lease[];
  total: number;
  page: number;
  limit: number;
}
