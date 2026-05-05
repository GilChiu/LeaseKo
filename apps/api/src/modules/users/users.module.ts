import { Module } from "@nestjs/common";
import { USER_REPOSITORY } from "./application/repositories/user.repository";
import { PrismaUserRepository } from "./infrastructure/repositories/prisma-user.repository";
import { GetCurrentUserUseCase } from "./application/use-cases/get-current-user.use-case";

/**
 * UsersModule — Bounded context: User identity management.
 *
 * Provides the UserRepository implementation via DI token.
 * PrismaService is NOT listed here — it is globally provided by DatabaseModule (@Global).
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - Only infrastructure/repositories/ files may use PrismaService.
 * - Use cases depend on UserRepository interface via USER_REPOSITORY token.
 * - Controllers in this module MUST NOT inject PrismaService or PrismaUserRepository.
 *
 * @see docs/data-layer.md
 */
@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    GetCurrentUserUseCase,
  ],
  exports: [GetCurrentUserUseCase],
})
export class UsersModule {}
