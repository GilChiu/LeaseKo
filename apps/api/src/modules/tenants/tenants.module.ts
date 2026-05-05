import { Module } from "@nestjs/common";
import { TENANT_REPOSITORY } from "./application/repositories/tenant.repository";
import { TENANT_MEMBERSHIP_REPOSITORY } from "./application/repositories/tenant-membership.repository";
import { PrismaTenantRepository } from "./infrastructure/repositories/prisma-tenant.repository";
import { PrismaTenantMembershipRepository } from "./infrastructure/repositories/prisma-tenant-membership.repository";

/**
 * TenantsModule — Bounded context: Organization / Tenant Management.
 *
 * Provides TenantRepository and TenantMembershipRepository implementations via DI tokens.
 * PrismaService is NOT listed here — it is globally provided by DatabaseModule (@Global).
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - All repository queries on tenant-scoped models MUST include tenant_id filter.
 * - tenant_id MUST come from IRequestContext — never from request body.
 * - No direct Prisma access outside the infrastructure/ layer.
 * - TENANT_REPOSITORY and TENANT_MEMBERSHIP_REPOSITORY are exported for use by
 *   other modules (e.g., guards that resolve membership and role).
 *
 * @see docs/data-layer.md
 */
@Module({
  providers: [
    {
      provide: TENANT_REPOSITORY,
      useClass: PrismaTenantRepository,
    },
    {
      provide: TENANT_MEMBERSHIP_REPOSITORY,
      useClass: PrismaTenantMembershipRepository,
    },
  ],
  exports: [TENANT_REPOSITORY, TENANT_MEMBERSHIP_REPOSITORY],
})
export class TenantsModule {}
