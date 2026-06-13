import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { TenantContactRepository } from '../../application/repositories/tenant-contact.repository';
import { TenantContact } from '../../domain/entities/tenant-contact.entity';
import {
  CreateTenantContactInput,
  FindPagedByTenantOptions,
  PagedTenantContacts,
  UpdateTenantContactInput,
} from '../../application/types/tenant-contact-repository.types';

type PrismaTenantContact = Prisma.TenantContactGetPayload<object>;

/**
 * PrismaTenantContactRepository — infrastructure implementation of TenantContactRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for TenantContact data.
 * - All tenant-scoped queries MUST use tenantFilter() — no exceptions.
 * - Soft-deleted records (deletedAt != null) are excluded from all read methods.
 * - email is always stored as received (already lowercased by the use case).
 */
@Injectable()
export class PrismaTenantContactRepository implements TenantContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTenantContactInput): Promise<TenantContact> {
    const record = await this.prisma.tenantContact.create({
      data: {
        tenantId: input.tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        idNumber: input.idNumber,
        notes: input.notes,
      },
    });
    return this.toEntity(record);
  }

  async findByEmail(
    tenantId: string,
    email: string,
  ): Promise<TenantContact | null> {
    const record = await this.prisma.tenantContact.findFirst({
      where: {
        ...tenantFilter(tenantId),
        email,
        deletedAt: null,
      },
    });
    return record ? this.toEntity(record) : null;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateTenantContactInput,
  ): Promise<TenantContact | null> {
    try {
      const record = await this.prisma.tenantContact.update({
        where: { id, tenantId },
        data,
      });
      return this.toEntity(record);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }

  async findById(id: string, tenantId: string): Promise<TenantContact | null> {
    const record = await this.prisma.tenantContact.findFirst({
      where: {
        id,
        ...tenantFilter(tenantId),
        deletedAt: null,
      },
    });
    return record ? this.toEntity(record) : null;
  }

  async findPagedByTenant(
    tenantId: string,
    { page, limit }: FindPagedByTenantOptions,
  ): Promise<PagedTenantContacts> {
    const skip = (page - 1) * limit;
    const where = { ...tenantFilter(tenantId), deletedAt: null };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.tenantContact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenantContact.count({ where }),
    ]);

    return { items: records.map((r) => this.toEntity(r)), total };
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.prisma.tenantContact.update({
        where: { id, tenantId },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return false;
      }
      throw e;
    }
  }

  private toEntity(record: PrismaTenantContact): TenantContact {
    return {
      id: record.id,
      tenantId: record.tenantId,
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phone: record.phone,
      idNumber: record.idNumber,
      notes: record.notes,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
