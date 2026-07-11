import { Inject, Injectable } from '@nestjs/common';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../../../leases/application/repositories/lease.repository';
import { Lease } from '../../../leases/domain/entities/lease.entity';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../../../invoices/application/repositories/invoice.repository';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
} from '../../../payments/application/repositories/payment.repository';
import { Payment } from '../../../payments/domain/entities/payment.entity';
import {
  MAINTENANCE_REQUEST_REPOSITORY,
  MaintenanceRequestRepository,
} from '../../../maintenance/application/repositories/maintenance-request.repository';
import { MaintenanceRequest } from '../../../maintenance/domain/entities/maintenance-request.entity';

/**
 * TenantDashboard — a read-model aggregate for the renter's portal home screen.
 * Composed from several repositories; not persisted.
 */
export interface TenantDashboard {
  currentLease: Lease | null;
  outstandingBalance: number;
  recentPayments: Payment[];
  openMaintenanceCount: number;
  recentMaintenance: MaintenanceRequest[];
}

export interface GetTenantDashboardUseCaseInput {
  tenantId: string;
  tenantContactId: string;
}

const RECENT_LIMIT = 5;

/**
 * GetTenantDashboardUseCase — assembles the renter dashboard summary. US 24.5.
 *
 * Everything is scoped to the signed-in renter: the current lease and
 * outstanding balance come from their own leases/invoices, recent payments
 * from their own invoices, and maintenance activity is restricted to the unit
 * on their active lease.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId AND tenantContactId come from verified request context only.
 */
@Injectable()
export class GetTenantDashboardUseCase {
  constructor(
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
    @Inject(MAINTENANCE_REQUEST_REPOSITORY)
    private readonly maintenanceRequests: MaintenanceRequestRepository,
  ) {}

  async execute(
    input: GetTenantDashboardUseCaseInput,
  ): Promise<TenantDashboard> {
    const { tenantId, tenantContactId } = input;

    const [currentLease, outstandingBalance, recentPayments] =
      await Promise.all([
        this.leases.findActiveByTenantContact(tenantId, tenantContactId),
        this.invoices.sumOutstandingByTenantContact(tenantId, tenantContactId),
        this.payments
          .findPagedByTenantContact(tenantId, tenantContactId, {
            page: 1,
            limit: RECENT_LIMIT,
          })
          .then((paged) => paged.items),
      ]);

    // Maintenance is scoped to the unit on the renter's active lease. Without
    // an active lease there is no unit to report on.
    let openMaintenanceCount = 0;
    let recentMaintenance: MaintenanceRequest[] = [];
    if (currentLease) {
      [openMaintenanceCount, recentMaintenance] = await Promise.all([
        this.maintenanceRequests.countActiveByUnit(
          tenantId,
          currentLease.unitId,
        ),
        this.maintenanceRequests.findRecentByUnit(
          tenantId,
          currentLease.unitId,
          RECENT_LIMIT,
        ),
      ]);
    }

    return {
      currentLease,
      outstandingBalance,
      recentPayments,
      openMaintenanceCount,
      recentMaintenance,
    };
  }
}
