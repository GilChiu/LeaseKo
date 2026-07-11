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

  /**
   * Return the most recent non-deleted maintenance requests for a single unit,
   * ordered by createdAt DESC (capped by `limit`). Used by the tenant dashboard
   * so a renter sees recent activity for their assigned unit only.
   * tenantId MUST come from verified request context.
   */
  findRecentByUnit(
    tenantId: string,
    unitId: string,
    limit: number,
  ): Promise<MaintenanceRequest[]>;

  /**
   * Count a unit's non-deleted maintenance requests that are still active
   * (status OPEN or IN_PROGRESS). Used by the tenant dashboard's status widget.
   */
  countActiveByUnit(tenantId: string, unitId: string): Promise<number>;
}
