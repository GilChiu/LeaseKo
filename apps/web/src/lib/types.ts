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
