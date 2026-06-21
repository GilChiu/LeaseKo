import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MAINTENANCE_REQUEST_REPOSITORY,
  MaintenanceRequestRepository,
} from '../repositories/maintenance-request.repository';
import {
  MaintenanceRequest,
  MaintenanceStatus,
} from '../../domain/entities/maintenance-request.entity';

export interface UpdateMaintenanceStatusUseCaseInput {
  id: string;
  tenantId: string;
  status: MaintenanceStatus;
}

@Injectable()
export class UpdateMaintenanceStatusUseCase {
  constructor(
    @Inject(MAINTENANCE_REQUEST_REPOSITORY)
    private readonly maintenanceRequests: MaintenanceRequestRepository,
  ) {}

  async execute(
    input: UpdateMaintenanceStatusUseCaseInput,
  ): Promise<MaintenanceRequest> {
    const request = await this.maintenanceRequests.updateStatus(
      input.id,
      input.tenantId,
      input.status,
    );

    if (!request) {
      throw new NotFoundException('Maintenance request not found.');
    }

    return request;
  }
}
