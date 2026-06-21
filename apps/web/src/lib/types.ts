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

export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "VOID";

export interface Invoice {
  id: string;
  tenantId: string;
  leaseId: string;
  tenantContactId: string;
  invoiceNumber: string;
  dueDate: string;
  amount: number;
  notes: string | null;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PagedInvoices {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "GCASH"
  | "MAYA"
  | "CHECK"
  | "OTHER";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  recordedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedPayments {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
}

export type MaintenanceStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PagedMaintenanceRequests {
  items: MaintenanceRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface OccupancyMetrics {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPercentage: number;
}

export interface RevenueMetrics {
  year: number;
  month: number;
  monthlyRevenue: number;
  collectedRent: number;
  outstandingAmount: number;
  outstandingCount: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface DashboardSummary {
  occupancy: OccupancyMetrics;
  revenue: RevenueMetrics;
}
