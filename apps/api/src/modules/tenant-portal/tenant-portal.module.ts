import { Module } from '@nestjs/common';
import { TENANT_USER_REPOSITORY } from './application/repositories/tenant-user.repository';
import { PrismaTenantUserRepository } from './infrastructure/repositories/prisma-tenant-user.repository';
import { InviteTenantUserUseCase } from './application/use-cases/invite-tenant-user.use-case';
import { ActivateTenantUserUseCase } from './application/use-cases/activate-tenant-user.use-case';
import { ListTenantUsersUseCase } from './application/use-cases/list-tenant-users.use-case';
import { RevokeTenantInvitationUseCase } from './application/use-cases/revoke-tenant-invitation.use-case';
import { GetTenantPortalContextUseCase } from './application/use-cases/get-tenant-portal-context.use-case';
import { TenantInvitationsController } from './presentation/tenant-invitations.controller';
import { TenantPortalController } from './presentation/tenant-portal.controller';

@Module({
  controllers: [TenantInvitationsController, TenantPortalController],
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
  ],
  exports: [TENANT_USER_REPOSITORY],
})
export class TenantPortalModule {}
