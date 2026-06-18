import { Inject, Injectable } from '@nestjs/common';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../../../leases/application/repositories/lease.repository';

export interface GenerateRecurringInvoicesUseCaseInput {
  tenantId: string;
  billingMonth: number;
  billingYear: number;
}

export interface GenerateRecurringInvoicesResult {
  generated: number;
  skipped: number;
}

function generateInvoiceNumber(year: number, month: number): string {
  const mm = String(month).padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `INV-${year}${mm}-${suffix}`;
}

@Injectable()
export class GenerateRecurringInvoicesUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(
    input: GenerateRecurringInvoicesUseCaseInput,
  ): Promise<GenerateRecurringInvoicesResult> {
    const activeLeases = await this.leases.findActiveByTenant(input.tenantId);

    let generated = 0;
    let skipped = 0;

    for (const lease of activeLeases) {
      const exists = await this.invoices.existsByLeaseAndMonth(
        lease.id,
        input.tenantId,
        input.billingYear,
        input.billingMonth,
      );

      if (exists) {
        skipped++;
        continue;
      }

      const invoiceNumber = generateInvoiceNumber(
        input.billingYear,
        input.billingMonth,
      );

      const dueDate = new Date(input.billingYear, input.billingMonth - 1, 1);

      await this.invoices.create({
        tenantId: input.tenantId,
        leaseId: lease.id,
        tenantContactId: lease.tenantContactId,
        invoiceNumber,
        dueDate,
        amount: lease.monthlyRent,
        notes: null,
        status: 'PENDING',
      });

      generated++;
    }

    return { generated, skipped };
  }
}
