import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * PrismaService — manages the Prisma client lifecycle inside NestJS.
 *
 * Architecture rule (NON-NEGOTIABLE per constitution):
 * This service MUST only be imported by repository implementations inside
 * the `infrastructure/` layer of each module.
 *
 * NEVER import PrismaService in:
 *   - controllers       (presentation layer)
 *   - use cases         (application layer)
 *   - domain services   (domain layer)
 *
 * @see docs/tenant-isolation.md — tenant-safe query patterns
 * @see apps/api/src/common/utils/tenant-filter.util.ts — use in every repository query
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("PrismaService connected to PostgreSQL");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("PrismaService disconnected from PostgreSQL");
  }
}
