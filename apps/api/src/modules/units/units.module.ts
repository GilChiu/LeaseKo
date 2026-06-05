import { Module } from '@nestjs/common';
import { PropertiesModule } from '../properties/properties.module';
import { UNIT_REPOSITORY } from './application/repositories/unit.repository';
import { CreateUnitUseCase } from './application/use-cases/create-unit.use-case';
import { GetUnitByIdUseCase } from './application/use-cases/get-unit-by-id.use-case';
import { UpdateUnitUseCase } from './application/use-cases/update-unit.use-case';
import { ListUnitsByPropertyUseCase } from './application/use-cases/list-units-by-property.use-case';
import { PrismaUnitRepository } from './infrastructure/repositories/prisma-unit.repository';
import { UnitController } from './presentation/unit.controller';
import { UnitsController } from './presentation/units.controller';

/**
 * UnitsModule — Bounded context: Unit management.
 *
 * Imports PropertiesModule to access PROPERTY_REPOSITORY via DI.
 * PrismaService is NOT listed here — it is globally provided by DatabaseModule (@Global).
 *
 * Controllers:
 * - UnitsController: nested routes @ /properties/:propertyId/units
 * - UnitController:  flat routes   @ /units/:id
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - Only infrastructure/repositories/ files may use PrismaService.
 * - Use cases depend on UnitRepository via UNIT_REPOSITORY token.
 * - CreateUnitUseCase and ListUnitsByPropertyUseCase also depend on
 *   PropertyRepository via PROPERTY_REPOSITORY token (provided by PropertiesModule import).
 * - Controllers in this module MUST NOT inject PrismaService or PrismaUnitRepository.
 */
@Module({
  imports: [PropertiesModule],
  controllers: [UnitsController, UnitController],
  providers: [
    {
      provide: UNIT_REPOSITORY,
      useClass: PrismaUnitRepository,
    },
    CreateUnitUseCase,
    ListUnitsByPropertyUseCase,
    GetUnitByIdUseCase,
    UpdateUnitUseCase,
  ],
})
export class UnitsModule {}
