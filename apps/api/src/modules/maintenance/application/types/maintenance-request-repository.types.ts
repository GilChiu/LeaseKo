import {
  MaintenanceRequest,
  MaintenancePriority,
  MaintenanceStatus,
} from '../../domain/entities/maintenance-request.entity';

export interface CreateMaintenanceRequestInput {
  tenantId: string;
  propertyId: string;
  unitId: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  notes: string | null;
}

export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
}

export interface PagedMaintenanceRequests {
  items: MaintenanceRequest[];
  total: number;
}
