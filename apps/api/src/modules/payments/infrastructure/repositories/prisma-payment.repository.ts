import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { tenantFilter } from '../../../../common/utils/tenant-filter.util';
import { PaymentRepository } from '../../application/repositories/payment.repository';
import { Payment } from '../../domain/entities/payment.entity';
import {
  CreatePaymentInput,
  FindPagedByTenantOptions,
  PagedPayments,
} from '../../application/types/payment-repository.types';

type PrismaPayment = Prisma.PaymentGetPayload<object>;

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePaymentInput): Promise<Payment | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: input.invoiceId,
        ...tenantFilter(input.tenantId),
        deletedAt: null,
      },
    });
    if (!invoice) return null;

    const record = await this.prisma.payment.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        status: input.status,
        recordedAt: input.recordedAt,
        notes: input.notes,
      },
    });

    return this.toEntity(record);
  }

  async findPagedByTenant(
    tenantId: string,
    { page, limit, invoiceId, method, status }: FindPagedByTenantOptions,
  ): Promise<PagedPayments> {
    const skip = (page - 1) * limit;
    const where = {
      ...tenantFilter(tenantId),
      deletedAt: null,
      ...(invoiceId ? { invoiceId } : {}),
      ...(method ? { method } : {}),
      ...(status ? { status } : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items: records.map((r) => this.toEntity(r)), total };
  }

  async findById(id: string, tenantId: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findFirst({
      where: { id, ...tenantFilter(tenantId), deletedAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async getTotalPaidByInvoice(
    invoiceId: string,
    tenantId: string,
  ): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: {
        invoiceId,
        ...tenantFilter(tenantId),
        status: 'COMPLETED',
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  private toEntity(record: PrismaPayment): Payment {
    return {
      id: record.id,
      tenantId: record.tenantId,
      invoiceId: record.invoiceId,
      amount: record.amount.toNumber(),
      method: record.method as Payment['method'],
      status: record.status as Payment['status'],
      recordedAt: record.recordedAt,
      notes: record.notes,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
