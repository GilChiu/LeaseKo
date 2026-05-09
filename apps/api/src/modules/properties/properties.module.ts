import { Module } from '@nestjs/common';
import { PROPERTY_REPOSITORY } from './application/repositories/property.repository';
import { PrismaPropertyRepository } from './infrastructure/repositories/prisma-property.repository';

/**
 * PropertiesModule — Bounded context: Property management.
 *
 * Provides the PropertyRepository implementation via DI token.
 * PrismaService is NOT listed here — it is globally provided by DatabaseModule (@Global).
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - Only infrastructure/repositories/ files may use PrismaService.
 * - Use cases depend on PropertyRepository interface via PROPERTY_REPOSITORY token.
 * - Controllers in this module MUST NOT inject PrismaService or PrismaPropertyRepository.
 */
@Module({
  providers: [
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PrismaPropertyRepository,
    },
  ],
  exports: [PROPERTY_REPOSITORY],
})
export class PropertiesModule {}
