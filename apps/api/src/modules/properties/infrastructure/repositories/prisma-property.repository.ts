import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { Property } from '../../domain/entities/property.entity';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
} from '../../application/types/property-repository.types';
import { PropertyRepository } from '../../application/repositories/property.repository';

/** Prisma result shape — all columns returned by default selects. */
type PrismaProperty = Prisma.PropertyGetPayload<object>;

/**
 * PrismaPropertyRepository — infrastructure implementation of PropertyRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for Property data.
 * - Application layer (use cases) MUST inject PropertyRepository via PROPERTY_REPOSITORY token.
 * - All tenant-scoped queries MUST use tenantFilter() — no exceptions.
 * - Soft-deleted records (deletedAt != null) are excluded from all normal read methods.
 *
 * Error normalisation:
 * - P2025 (record not found on update) → returns null / false
 * - FK violations on create propagate as-is (tenantId must exist)
 */
@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePropertyInput): Promise<Property> {
    const record = await this.prisma.property.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        state: input.state ?? null,
        postalCode: input.postalCode ?? null,
        country: input.country,
        propertyType: input.propertyType,
        description: input.description ?? null,
      },
    });
    return this.toEntity(record);
  }

  async findManyByTenant(tenantId: string): Promise<Property[]> {
    const records = await this.prisma.property.findMany({
      where: {
        ...tenantFilter(tenantId),
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findById(id: string, tenantId: string): Promise<Property | null> {
    const record = await this.prisma.property.findFirst({
      where: {
        id,
        ...tenantFilter(tenantId),
        deletedAt: null,
      },
    });
    return record ? this.toEntity(record) : null;
  }

  async update(
    id: string,
    tenantId: string,
    input: UpdatePropertyInput,
  ): Promise<Property | null> {
    try {
      const record = await this.prisma.property.update({
        where: { id, tenantId },
        data: input,
      });
      return this.toEntity(record);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        return null;
      }
      throw e;
    }
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.prisma.property.update({
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

  private toEntity(record: PrismaProperty): Property {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      addressLine1: record.addressLine1,
      addressLine2: record.addressLine2,
      city: record.city,
      state: record.state,
      postalCode: record.postalCode,
      country: record.country,
      propertyType: record.propertyType,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    };
  }
}
