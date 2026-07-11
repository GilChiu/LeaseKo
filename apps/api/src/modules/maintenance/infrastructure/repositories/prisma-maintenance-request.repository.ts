import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { MaintenanceRequestRepository } from '../../application/repositories/maintenance-request.repository';
import { MaintenanceRequest } from '../../domain/entities/maintenance-request.entity';
import {
  CreateMaintenanceRequestInput,
  FindPagedByTenantOptions,
  PagedMaintenanceRequests,
} from '../../application/types/maintenance-request-repository.types';

type PrismaMaintenanceRequest = Prisma.MaintenanceRequestGetPayload<object>;

@Injectable()
export class PrismaMaintenanceRequestRepository
  implements MaintenanceRequestRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateMaintenanceRequestInput,
  ): Promise<MaintenanceRequest | null> {
    const [property, unit] = await this.prisma.$transaction([
      this.prisma.property.findFirst({
        where: {
          id: input.propertyId,
          ...tenantFilter(input.tenantId),
          deletedAt: null,
        },
      }),
      this.prisma.unit.findFirst({
        where: {
          id: input.unitId,
          ...tenantFilter(input.tenantId),
        },
      }),
    ]);

    if (!property || !unit) return null;

    const record = await this.prisma.maintenanceRequest.create({
      data: {
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        notes: input.notes,
      },
    });

    return this.toEntity(record);
  }

  async findPagedByTenant(
    tenantId: string,
    { page, limit, status, priority }: FindPagedByTenantOptions,
  ): Promise<PagedMaintenanceRequests> {
    const skip = (page - 1) * limit;
    const where = {
      ...tenantFilter(tenantId),
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.maintenanceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);

    return { items: records.map((r) => this.toEntity(r)), total };
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<MaintenanceRequest | null> {
    const record = await this.prisma.maintenanceRequest.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: string,
  ): Promise<MaintenanceRequest | null> {
    const record = await this.prisma.maintenanceRequest.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    if (!record) return null;

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status:
          status as PrismaMaintenanceRequest['status'],
      },
    });

    return this.toEntity(updated);
  }

  async findRecentByUnit(
    tenantId: string,
    unitId: string,
    limit: number,
  ): Promise<MaintenanceRequest[]> {
    const records = await this.prisma.maintenanceRequest.findMany({
      where: { ...tenantFilter(tenantId), unitId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map((r) => this.toEntity(r));
  }

  async countActiveByUnit(tenantId: string, unitId: string): Promise<number> {
    return this.prisma.maintenanceRequest.count({
      where: {
        ...tenantFilter(tenantId),
        unitId,
        deletedAt: null,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });
  }

  private toEntity(record: PrismaMaintenanceRequest): MaintenanceRequest {
    return {
      id: record.id,
      tenantId: record.tenantId,
      propertyId: record.propertyId,
      unitId: record.unitId,
      title: record.title,
      description: record.description,
      status: record.status as MaintenanceRequest['status'],
      priority: record.priority as MaintenanceRequest['priority'],
      notes: record.notes,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
