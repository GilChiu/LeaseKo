import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { InvoiceRepository } from '../../application/repositories/invoice.repository';
import { Invoice } from '../../domain/entities/invoice.entity';
import {
  CreateInvoiceInput,
  FindPagedByTenantOptions,
  PagedInvoices,
} from '../../application/types/invoice-repository.types';

type PrismaInvoice = Prisma.InvoiceGetPayload<object>;

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInvoiceInput): Promise<Invoice | null> {
    const lease = await this.prisma.lease.findFirst({
      where: {
        id: input.leaseId,
        ...tenantFilter(input.tenantId),
        deletedAt: null,
      },
    });
    if (!lease) return null;

    const contact = await this.prisma.tenantContact.findFirst({
      where: {
        id: input.tenantContactId,
        ...tenantFilter(input.tenantId),
        deletedAt: null,
      },
    });
    if (!contact) return null;

    const record = await this.prisma.invoice.create({
      data: {
        tenantId: input.tenantId,
        leaseId: input.leaseId,
        tenantContactId: input.tenantContactId,
        invoiceNumber: input.invoiceNumber,
        dueDate: input.dueDate,
        amount: input.amount,
        notes: input.notes,
        status: input.status,
      },
    });

    return this.toEntity(record);
  }

  async findPagedByTenant(
    tenantId: string,
    { page, limit, status }: FindPagedByTenantOptions,
  ): Promise<PagedInvoices> {
    const skip = (page - 1) * limit;
    const where = {
      ...tenantFilter(tenantId),
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items: records.map((r) => this.toEntity(r)), total };
  }

  async findById(id: string, tenantId: string): Promise<Invoice | null> {
    const record = await this.prisma.invoice.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async existsByLeaseAndMonth(
    leaseId: string,
    tenantId: string,
    year: number,
    month: number,
  ): Promise<boolean> {
    const startOfMonth = new Date(year, month - 1, 1);
    const startOfNextMonth = new Date(year, month, 1);

    const count = await this.prisma.invoice.count({
      where: {
        leaseId,
        ...tenantFilter(tenantId),
        deletedAt: null,
        dueDate: { gte: startOfMonth, lt: startOfNextMonth },
      },
    });

    return count > 0;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: string,
  ): Promise<Invoice | null> {
    const record = await this.prisma.invoice.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    if (!record) return null;

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: status as Prisma.InvoiceGetPayload<object>['status'] },
    });

    return this.toEntity(updated);
  }

  private toEntity(record: PrismaInvoice): Invoice {
    return {
      id: record.id,
      tenantId: record.tenantId,
      leaseId: record.leaseId,
      tenantContactId: record.tenantContactId,
      invoiceNumber: record.invoiceNumber,
      dueDate: record.dueDate,
      amount: record.amount.toNumber(),
      notes: record.notes,
      status: record.status as Invoice['status'],
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
