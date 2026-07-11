import { Module } from '@nestjs/common';
import { LeasesModule } from '../leases/leases.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsModule } from '../payments/payments.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { TENANT_USER_REPOSITORY } from './application/repositories/tenant-user.repository';
import { PrismaTenantUserRepository } from './infrastructure/repositories/prisma-tenant-user.repository';
import { InviteTenantUserUseCase } from './application/use-cases/invite-tenant-user.use-case';
import { ActivateTenantUserUseCase } from './application/use-cases/activate-tenant-user.use-case';
import { ListTenantUsersUseCase } from './application/use-cases/list-tenant-users.use-case';
import { RevokeTenantInvitationUseCase } from './application/use-cases/revoke-tenant-invitation.use-case';
import { GetTenantPortalContextUseCase } from './application/use-cases/get-tenant-portal-context.use-case';
import { GetTenantLeaseUseCase } from './application/use-cases/get-tenant-lease.use-case';
import { ListTenantInvoicesUseCase } from './application/use-cases/list-tenant-invoices.use-case';
import { ListTenantPaymentsUseCase } from './application/use-cases/list-tenant-payments.use-case';
import { SubmitTenantMaintenanceRequestUseCase } from './application/use-cases/submit-tenant-maintenance-request.use-case';
import { GetTenantDashboardUseCase } from './application/use-cases/get-tenant-dashboard.use-case';
import { TenantInvitationsController } from './presentation/tenant-invitations.controller';
import { TenantPortalController } from './presentation/tenant-portal.controller';
import { TenantResourcesController } from './presentation/tenant-resources.controller';

@Module({
  imports: [LeasesModule, InvoicesModule, PaymentsModule, MaintenanceModule],
  controllers: [
    TenantInvitationsController,
    TenantPortalController,
    TenantResourcesController,
  ],
  providers: [
    {
      provide: TENANT_USER_REPOSITORY,
      useClass: PrismaTenantUserRepository,
    },
    InviteTenantUserUseCase,
    ActivateTenantUserUseCase,
    ListTenantUsersUseCase,
    RevokeTenantInvitationUseCase,
    GetTenantPortalContextUseCase,
    GetTenantLeaseUseCase,
    ListTenantInvoicesUseCase,
    ListTenantPaymentsUseCase,
    SubmitTenantMaintenanceRequestUseCase,
    GetTenantDashboardUseCase,
  ],
  exports: [TENANT_USER_REPOSITORY],
})
export class TenantPortalModule {}
