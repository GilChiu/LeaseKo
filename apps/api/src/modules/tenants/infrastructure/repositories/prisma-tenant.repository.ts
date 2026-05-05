import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { PrismaService } from "../../../../database/prisma/prisma.service";
import {
  CreateTenantInput,
  TenantRecord,
  TenantRepository,
} from "../../application/repositories/tenant.repository";

/**
 * PrismaTenantRepository — infrastructure implementation of TenantRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for Tenant data.
 * - Application layer (use cases) MUST inject TenantRepository via TENANT_REPOSITORY token.
 * - Controllers MUST NOT inject this class directly.
 *
 * Error normalization:
 * - P2025 (record not found on update)  → returns null
 * - P2002 (unique constraint violation) → throws a descriptive Error
 */
@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async findByClerkOrgId(clerkOrgId: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({ where: { clerkOrgId } });
  }

  async create(input: CreateTenantInput): Promise<TenantRecord> {
    try {
      return await this.prisma.tenant.create({ data: input });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        throw new Error(
          `Tenant already exists with clerkOrgId: ${input.clerkOrgId}`,
        );
      }
      throw e;
    }
  }

  async updateName(id: string, name: string): Promise<TenantRecord | null> {
    try {
      return await this.prisma.tenant.update({ where: { id }, data: { name } });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
        return null;
      }
      throw e;
    }
  }
}
