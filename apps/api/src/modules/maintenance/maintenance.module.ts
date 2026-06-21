import { Module } from '@nestjs/common';
import { MAINTENANCE_REQUEST_REPOSITORY } from './application/repositories/maintenance-request.repository';
import { PrismaMaintenanceRequestRepository } from './infrastructure/repositories/prisma-maintenance-request.repository';
import { CreateMaintenanceRequestUseCase } from './application/use-cases/create-maintenance-request.use-case';
import { UpdateMaintenanceStatusUseCase } from './application/use-cases/update-maintenance-status.use-case';
import { ListMaintenanceRequestsUseCase } from './application/use-cases/list-maintenance-requests.use-case';
import { MaintenanceRequestsController } from './presentation/maintenance-requests.controller';

@Module({
  controllers: [MaintenanceRequestsController],
  providers: [
    {
      provide: MAINTENANCE_REQUEST_REPOSITORY,
      useClass: PrismaMaintenanceRequestRepository,
    },
    CreateMaintenanceRequestUseCase,
    UpdateMaintenanceStatusUseCase,
    ListMaintenanceRequestsUseCase,
  ],
  exports: [MAINTENANCE_REQUEST_REPOSITORY],
})
export class MaintenanceModule {}
