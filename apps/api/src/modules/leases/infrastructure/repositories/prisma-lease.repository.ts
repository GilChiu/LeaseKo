import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { LeaseRepository } from '../../application/repositories/lease.repository';
import { Lease } from '../../domain/entities/lease.entity';
import {
  CreateLeaseInput,
  FindPagedByTenantOptions,
  PagedLeases,
} from '../../application/types/lease-repository.types';

type PrismaLease = Prisma.LeaseGetPayload<object>;

/**
 * PrismaLeaseRepository — infrastructure implementation of LeaseRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for Lease data.
 * - All tenant-scoped queries MUST filter by tenantId.
 * - Cross-entity FK ownership is validated here before create to enforce tenant isolation.
 * - Soft-deleted records (deletedAt != null) are excluded from all read/validation queries.
 */
@Injectable()
export class PrismaLeaseRepository implements LeaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateLeaseInput): Promise<Lease | null> {
    const [unit, property, contact] = await this.prisma.$transaction([
      this.prisma.unit.findFirst({
        where: { id: input.unitId, tenantId: input.tenantId },
      }),
      this.prisma.property.findFirst({
        where: { id: input.propertyId, tenantId: input.tenantId, deletedAt: null },
      }),
      this.prisma.tenantContact.findFirst({
        where: { id: input.tenantContactId, tenantId: input.tenantId, deletedAt: null },
      }),
    ]);

    if (!unit || !property || !contact) {
      return null;
    }

    const record = await this.prisma.lease.create({
      data: {
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantContactId: input.tenantContactId,
        startDate: input.startDate,
        endDate: input.endDate,
        monthlyRent: input.monthlyRent,
        depositAmount: input.depositAmount,
        notes: input.notes,
      },
    });

    return this.toEntity(record);
  }

  async findPagedByTenant(
    tenantId: string,
    { page, limit, status }: FindPagedByTenantOptions,
  ): Promise<PagedLeases> {
    const skip = (page - 1) * limit;
    const where = {
      ...tenantFilter(tenantId),
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.lease.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lease.count({ where }),
    ]);

    return { items: records.map((r) => this.toEntity(r)), total };
  }

  async findById(id: string, tenantId: string): Promise<Lease | null> {
    const record = await this.prisma.lease.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async activate(id: string, tenantId: string): Promise<Lease | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lease = await tx.lease.update({
          where: { id, tenantId },
          data: { status: 'ACTIVE' },
        });
        await tx.unit.update({
          where: { id: lease.unitId, tenantId },
          data: { status: 'OCCUPIED' },
        });
        return this.toEntity(lease);
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }

  async expire(id: string, tenantId: string): Promise<Lease | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lease = await tx.lease.update({
          where: { id, tenantId },
          data: { status: 'EXPIRED' },
        });
        await tx.unit.update({
          where: { id: lease.unitId, tenantId },
          data: { status: 'AVAILABLE' },
        });
        return this.toEntity(lease);
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }

  async terminate(id: string, tenantId: string): Promise<Lease | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lease = await tx.lease.update({
          where: { id, tenantId },
          data: { status: 'TERMINATED' },
        });
        await tx.unit.update({
          where: { id: lease.unitId, tenantId },
          data: { status: 'AVAILABLE' },
        });
        return this.toEntity(lease);
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }

  async hasActiveLeaseForUnit(unitId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.lease.count({
      where: {
        unitId,
        ...tenantFilter(tenantId),
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    return count > 0;
  }

  private toEntity(record: PrismaLease): Lease {
    return {
      id: record.id,
      tenantId: record.tenantId,
      propertyId: record.propertyId,
      unitId: record.unitId,
      tenantContactId: record.tenantContactId,
      status: record.status as Lease['status'],
      startDate: record.startDate,
      endDate: record.endDate,
      monthlyRent: record.monthlyRent.toNumber(),
      depositAmount: record.depositAmount ? record.depositAmount.toNumber() : null,
      notes: record.notes,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
