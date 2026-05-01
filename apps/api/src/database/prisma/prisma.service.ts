import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * PrismaService Placeholder
 *
 * Feature 005 (Prisma Integration) will replace this placeholder with:
 * - class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy
 * - onModuleInit → this.$connect()
 * - onModuleDestroy → this.$disconnect()
 * - Tenant-scoped query middleware (tenant_id injection, soft-delete)
 *
 * Architecture rule (NON-NEGOTIABLE per constitution):
 * PrismaService MUST only be imported by repository implementations inside
 * the infrastructure/ layer of each module.
 * NEVER import PrismaService in controllers, use cases, or domain services.
 */
@Injectable()
export class PrismaService implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'PrismaService initialized — placeholder (no DB connection until Feature 005)',
    );
  }
}
