import {
  MaintenanceRequest,
  MaintenanceStatus,
} from '../../domain/entities/maintenance-request.entity';
import {
  CreateMaintenanceRequestInput,
  FindPagedByTenantOptions,
  PagedMaintenanceRequests,
} from '../types/maintenance-request-repository.types';

export const MAINTENANCE_REQUEST_REPOSITORY = Symbol(
  'MAINTENANCE_REQUEST_REPOSITORY',
);

export interface MaintenanceRequestRepository {
  create(input: CreateMaintenanceRequestInput): Promise<MaintenanceRequest | null>;

  findPagedByTenant(
    tenantId: string,
    options: FindPagedByTenantOptions,
  ): Promise<PagedMaintenanceRequests>;

  findById(id: string, tenantId: string): Promise<MaintenanceRequest | null>;

  updateStatus(
    id: string,
    tenantId: string,
    status: MaintenanceStatus,
  ): Promise<MaintenanceRequest | null>;
}
