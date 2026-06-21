import { Inject, Injectable } from '@nestjs/common';
import {
  MAINTENANCE_REQUEST_REPOSITORY,
  MaintenanceRequestRepository,
} from '../repositories/maintenance-request.repository';
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '../../domain/entities/maintenance-request.entity';
import { PagedMaintenanceRequests } from '../types/maintenance-request-repository.types';

export interface ListMaintenanceRequestsUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
}

@Injectable()
export class ListMaintenanceRequestsUseCase {
  constructor(
    @Inject(MAINTENANCE_REQUEST_REPOSITORY)
    private readonly maintenanceRequests: MaintenanceRequestRepository,
  ) {}

  async execute(
    input: ListMaintenanceRequestsUseCaseInput,
  ): Promise<PagedMaintenanceRequests> {
    return this.maintenanceRequests.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
      status: input.status,
      priority: input.priority,
    });
  }
}
