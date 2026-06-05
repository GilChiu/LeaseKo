import { Module } from '@nestjs/common';
import { PROPERTY_REPOSITORY } from './application/repositories/property.repository';
import { ArchivePropertyUseCase } from './application/use-cases/archive-property.use-case';
import { CreatePropertyUseCase } from './application/use-cases/create-property.use-case';
import { GetPropertyByIdUseCase } from './application/use-cases/get-property-by-id.use-case';
import { ListPropertiesUseCase } from './application/use-cases/list-properties.use-case';
import { UpdatePropertyUseCase } from './application/use-cases/update-property.use-case';
import { PrismaPropertyRepository } from './infrastructure/repositories/prisma-property.repository';
import { PropertiesController } from './presentation/properties.controller';

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
  controllers: [PropertiesController],
  providers: [
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PrismaPropertyRepository,
    },
    ArchivePropertyUseCase,
    CreatePropertyUseCase,
    GetPropertyByIdUseCase,
    ListPropertiesUseCase,
    UpdatePropertyUseCase,
  ],
  exports: [PROPERTY_REPOSITORY],
})
export class PropertiesModule {}
