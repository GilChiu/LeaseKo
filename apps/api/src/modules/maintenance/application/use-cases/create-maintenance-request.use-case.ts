import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MAINTENANCE_REQUEST_REPOSITORY,
  MaintenanceRequestRepository,
} from '../repositories/maintenance-request.repository';
import {
  MaintenanceRequest,
  MaintenancePriority,
} from '../../domain/entities/maintenance-request.entity';

export interface CreateMaintenanceRequestUseCaseInput {
  tenantId: string;
  propertyId: string;
  unitId: string;
  title: string;
  description?: string | null;
  priority: MaintenancePriority;
  notes?: string | null;
}

@Injectable()
export class CreateMaintenanceRequestUseCase {
  constructor(
    @Inject(MAINTENANCE_REQUEST_REPOSITORY)
    private readonly maintenanceRequests: MaintenanceRequestRepository,
  ) {}

  async execute(
    input: CreateMaintenanceRequestUseCaseInput,
  ): Promise<MaintenanceRequest> {
    const request = await this.maintenanceRequests.create({
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      title: input.title,
      description: input.description ?? null,
      status: 'OPEN',
      priority: input.priority,
      notes: input.notes ?? null,
    });

    if (!request) {
      throw new NotFoundException(
        'One or more referenced resources were not found.',
      );
    }

    return request;
  }
}
