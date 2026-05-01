import { Module } from '@nestjs/common';

/**
 * TenantsModule — Bounded context: Organization / Tenant Management
 *
 * Future feature will populate this module with:
 * - domain/: Tenant entity, TenantId value object, tenant business rules
 * - application/: GetTenantUseCase, UpdateTenantUseCase
 * - infrastructure/: TenantRepository (Prisma), TenantMapper
 * - presentation/: TenantsController, DTOs
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - All repository queries MUST include `tenant_id` filter — no unscoped queries
 * - tenant_id is NEVER sourced from the request body; it comes exclusively from IRequestContext
 * - No direct Prisma access outside the infrastructure/ layer
 */
@Module({})
export class TenantsModule {}
