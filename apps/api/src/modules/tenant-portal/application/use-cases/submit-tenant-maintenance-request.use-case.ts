import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../../../leases/application/repositories/lease.repository';
import {
  MAINTENANCE_REQUEST_REPOSITORY,
  MaintenanceRequestRepository,
} from '../../../maintenance/application/repositories/maintenance-request.repository';
import {
  MaintenancePriority,
  MaintenanceRequest,
} from '../../../maintenance/domain/entities/maintenance-request.entity';

export interface SubmitTenantMaintenanceRequestUseCaseInput {
  tenantId: string;
  tenantContactId: string;
  title: string;
  description?: string | null;
  priority: MaintenancePriority;
}

/**
 * SubmitTenantMaintenanceRequestUseCase — lets a renter open a maintenance
 * request against their assigned unit (tenant portal). US 24.4.
 *
 * Security invariant: the unit and property are NEVER taken from the request
 * body. They are derived from the renter's own ACTIVE lease, so a renter can
 * only ever file requests against the unit they actually occupy.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId AND tenantContactId come from verified request context only.
 */
@Injectable()
export class SubmitTenantMaintenanceRequestUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
    @Inject(MAINTENANCE_REQUEST_REPOSITORY)
    private readonly maintenanceRequests: MaintenanceRequestRepository,
  ) {}

  async execute(
    input: SubmitTenantMaintenanceRequestUseCaseInput,
  ): Promise<MaintenanceRequest> {
    const lease = await this.leases.findActiveByTenantContact(
      input.tenantId,
      input.tenantContactId,
    );
    if (!lease) {
      throw new ForbiddenException(
        'An active lease is required to submit a maintenance request.',
      );
    }

    const request = await this.maintenanceRequests.create({
      tenantId: input.tenantId,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      title: input.title,
      description: input.description ?? null,
      status: 'OPEN',
      priority: input.priority,
      notes: null,
    });

    if (!request) {
      throw new NotFoundException(
        'The unit associated with your lease could not be found.',
      );
    }

    return request;
  }
}
