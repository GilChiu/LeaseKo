import { Module } from '@nestjs/common';
import { LEASE_REPOSITORY } from './application/repositories/lease.repository';
import { ActivateLeaseUseCase } from './application/use-cases/activate-lease.use-case';
import { CreateLeaseUseCase } from './application/use-cases/create-lease.use-case';
import { ExpireLeaseUseCase } from './application/use-cases/expire-lease.use-case';
import { GetLeaseByIdUseCase } from './application/use-cases/get-lease-by-id.use-case';
import { ListLeasesUseCase } from './application/use-cases/list-leases.use-case';
import { TerminateLeaseUseCase } from './application/use-cases/terminate-lease.use-case';
import { PrismaLeaseRepository } from './infrastructure/repositories/prisma-lease.repository';
import { LeasesController } from './presentation/leases.controller';

/**
 * LeasesModule — Bounded context: Lease management.
 *
 * Provides the LeaseRepository implementation via DI token.
 * PrismaService is NOT listed here — it is globally provided by DatabaseModule (@Global).
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - Only infrastructure/repositories/ files may use PrismaService.
 * - Use cases depend on LeaseRepository via LEASE_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaService or PrismaLeaseRepository.
 */
@Module({
  controllers: [LeasesController],
  providers: [
    {
      provide: LEASE_REPOSITORY,
      useClass: PrismaLeaseRepository,
    },
    CreateLeaseUseCase,
    ListLeasesUseCase,
    GetLeaseByIdUseCase,
    ActivateLeaseUseCase,
    ExpireLeaseUseCase,
    TerminateLeaseUseCase,
  ],
  exports: [LEASE_REPOSITORY],
})
export class LeasesModule {}
