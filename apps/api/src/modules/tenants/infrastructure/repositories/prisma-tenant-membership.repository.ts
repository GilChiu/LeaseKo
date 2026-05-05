import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { PrismaService } from "../../../../database/prisma/prisma.service";
import {
  CreateTenantMembershipInput,
  TenantMembershipRecord,
  TenantMembershipRepository,
} from "../../application/repositories/tenant-membership.repository";

/**
 * PrismaTenantMembershipRepository — infrastructure implementation of TenantMembershipRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for TenantMembership data.
 * - Application layer (use cases) MUST inject via TENANT_MEMBERSHIP_REPOSITORY token.
 * - Controllers MUST NOT inject this class directly.
 *
 * The @@unique([userId, tenantId]) constraint on TenantMembership is exposed by
 * Prisma as the compound key `userId_tenantId` in findUnique where clauses.
 *
 * Error normalization:
 * - P2002 (unique constraint violation on [userId, tenantId]) → throws descriptive Error
 */
@Injectable()
export class PrismaTenantMembershipRepository
  implements TenantMembershipRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(
    userId: string,
    tenantId: string,
  ): Promise<TenantMembershipRecord | null> {
    return this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
  }

  async create(
    input: CreateTenantMembershipInput,
  ): Promise<TenantMembershipRecord> {
    try {
      return await this.prisma.tenantMembership.create({
        data: {
          userId: input.userId,
          tenantId: input.tenantId,
          role: input.role ?? "member",
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        throw new Error(
          `Membership already exists for userId=${input.userId} tenantId=${input.tenantId}`,
        );
      }
      throw e;
    }
  }

  async findUserTenants(userId: string): Promise<TenantMembershipRecord[]> {
    return this.prisma.tenantMembership.findMany({ where: { userId } });
  }

  async findTenantUsers(tenantId: string): Promise<TenantMembershipRecord[]> {
    return this.prisma.tenantMembership.findMany({ where: { tenantId } });
  }
}
