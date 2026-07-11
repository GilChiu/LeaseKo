import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { TenantUserRepository } from '../../application/repositories/tenant-user.repository';
import { TenantUser } from '../../domain/entities/tenant-user.entity';
import {
  CreateInvitationInput,
  FindPagedByTenantOptions,
  PagedTenantUsers,
} from '../../application/types/tenant-user-repository.types';

type PrismaTenantUser = Prisma.TenantUserGetPayload<object>;

@Injectable()
export class PrismaTenantUserRepository implements TenantUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createInvitation(
    input: CreateInvitationInput,
  ): Promise<TenantUser | null> {
    const contact = await this.prisma.tenantContact.findFirst({
      where: {
        id: input.tenantContactId,
        ...tenantFilter(input.tenantId),
        deletedAt: null,
      },
    });
    if (!contact) return null;

    const record = await this.prisma.tenantUser.create({
      data: {
        tenantId: input.tenantId,
        tenantContactId: input.tenantContactId,
        email: contact.email,
        status: 'PENDING',
        invitationToken: input.invitationToken,
        invitationExpiresAt: input.invitationExpiresAt,
      },
    });

    return this.toEntity(record);
  }

  async findActiveByClerkUserId(
    clerkUserId: string,
  ): Promise<TenantUser | null> {
    const record = await this.prisma.tenantUser.findFirst({
      where: { clerkUserId, status: 'ACTIVE', deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByInvitationToken(token: string): Promise<TenantUser | null> {
    const record = await this.prisma.tenantUser.findFirst({
      where: { invitationToken: token, deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async activate(id: string, clerkUserId: string): Promise<TenantUser | null> {
    const record = await this.prisma.tenantUser.findFirst({
      where: { id, deletedAt: null },
    });
    if (!record) return null;

    const updated = await this.prisma.tenantUser.update({
      where: { id },
      data: {
        clerkUserId,
        status: 'ACTIVE',
        activatedAt: new Date(),
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });

    return this.toEntity(updated);
  }

  async findByContactId(
    tenantContactId: string,
    tenantId: string,
  ): Promise<TenantUser | null> {
    const record = await this.prisma.tenantUser.findFirst({
      where: { tenantContactId, ...tenantFilter(tenantId), deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async findById(id: string, tenantId: string): Promise<TenantUser | null> {
    const record = await this.prisma.tenantUser.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async findPagedByTenant(
    tenantId: string,
    { page, limit, status }: FindPagedByTenantOptions,
  ): Promise<PagedTenantUsers> {
    const skip = (page - 1) * limit;
    const where = {
      ...tenantFilter(tenantId),
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.tenantUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenantUser.count({ where }),
    ]);

    return { items: records.map((r) => this.toEntity(r)), total };
  }

  async revoke(id: string, tenantId: string): Promise<TenantUser | null> {
    const record = await this.prisma.tenantUser.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    if (!record) return null;

    const updated = await this.prisma.tenantUser.update({
      where: { id },
      data: {
        status: 'REVOKED',
        invitationToken: null,
        deletedAt: new Date(),
      },
    });

    return this.toEntity(updated);
  }

  private toEntity(record: PrismaTenantUser): TenantUser {
    return {
      id: record.id,
      tenantId: record.tenantId,
      tenantContactId: record.tenantContactId,
      email: record.email,
      clerkUserId: record.clerkUserId,
      status: record.status as TenantUser['status'],
      invitationToken: record.invitationToken,
      invitationExpiresAt: record.invitationExpiresAt,
      activatedAt: record.activatedAt,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
