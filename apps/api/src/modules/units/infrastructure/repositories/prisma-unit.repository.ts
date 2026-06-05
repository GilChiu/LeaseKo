import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { Unit } from '../../domain/entities/unit.entity';
import {
  CreateUnitInput,
  FindManyByPropertyOptions,
  PagedUnits,
  UpdateUnitInput,
} from '../../application/types/unit-repository.types';
import { UnitRepository } from '../../application/repositories/unit.repository';

/** Prisma result shape — all columns returned by default selects. */
type PrismaUnit = Prisma.UnitGetPayload<object>;

/**
 * PrismaUnitRepository — infrastructure implementation of UnitRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for Unit data.
 * - Application layer (use cases) MUST inject UnitRepository via UNIT_REPOSITORY token.
 * - All tenant-scoped queries MUST use tenantId from CreateUnitInput — no exceptions.
 *
 * Error normalisation:
 * - P2002 (unique constraint violation on [propertyId, unitNumber]) → ConflictException
 * - All other errors propagate as-is
 */
@Injectable()
export class PrismaUnitRepository implements UnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUnitInput): Promise<Unit> {
    try {
      const record = await this.prisma.unit.create({
        data: {
          tenantId: input.tenantId,
          propertyId: input.propertyId,
          unitNumber: input.unitNumber,
          floorArea: input.floorArea ?? null,
          bedrooms: input.bedrooms ?? null,
          bathrooms: input.bathrooms ?? null,
          monthlyRent: input.monthlyRent ?? null,
          description: input.description ?? null,
        },
      });
      return this.toEntity(record);
    } catch (e) {
      if (
        e instanceof PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Unit number already exists under this property.',
        );
      }
      throw e;
    }
  }

  async findManyByProperty(
    propertyId: string,
    tenantId: string,
    options: FindManyByPropertyOptions,
  ): Promise<PagedUnits> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const where = { propertyId, tenantId };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({
        where,
        orderBy: { unitNumber: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.unit.count({ where }),
    ]);

    return { items: records.map((r) => this.toEntity(r)), total };
  }

  async findById(id: string, tenantId: string): Promise<Unit | null> {
    const record = await this.prisma.unit.findFirst({
      where: { id, tenantId },
    });
    return record ? this.toEntity(record) : null;
  }

  async update(
    id: string,
    tenantId: string,
    input: UpdateUnitInput,
  ): Promise<Unit | null> {
    try {
      const record = await this.prisma.unit.update({
        where: { id, tenantId },
        data: input,
      });
      return this.toEntity(record);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException(
            'Unit number already exists under this property.',
          );
        }
        if (e.code === 'P2025') {
          return null;
        }
      }
      throw e;
    }
  }

  private toEntity(record: PrismaUnit): Unit {
    return {
      id: record.id,
      tenantId: record.tenantId,
      propertyId: record.propertyId,
      unitNumber: record.unitNumber,
      status: record.status as Unit['status'],
      floorArea: record.floorArea,
      bedrooms: record.bedrooms,
      bathrooms: record.bathrooms,
      monthlyRent: record.monthlyRent ? record.monthlyRent.toNumber() : null,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
