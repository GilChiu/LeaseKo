import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../repositories/invoice.repository';
import {
  LEASE_REPOSITORY,
  LeaseRepository,
} from '../../../leases/application/repositories/lease.repository';
import { Invoice } from '../../domain/entities/invoice.entity';

export interface CreateInvoiceUseCaseInput {
  tenantId: string;
  leaseId: string;
  dueDate: Date;
  amount: number;
  notes?: string | null;
}

function generateInvoiceNumber(dueDate: Date): string {
  const yyyy = dueDate.getFullYear();
  const mm = String(dueDate.getMonth() + 1).padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `INV-${yyyy}${mm}-${suffix}`;
}

@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(LEASE_REPOSITORY)
    private readonly leases: LeaseRepository,
  ) {}

  async execute(input: CreateInvoiceUseCaseInput): Promise<Invoice> {
    const lease = await this.leases.findById(input.leaseId, input.tenantId);

    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }

    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Invoices can only be created for active leases.',
      );
    }

    const invoiceNumber = generateInvoiceNumber(input.dueDate);

    const invoice = await this.invoices.create({
      tenantId: input.tenantId,
      leaseId: input.leaseId,
      tenantContactId: lease.tenantContactId,
      invoiceNumber,
      dueDate: input.dueDate,
      amount: input.amount,
      notes: input.notes ?? null,
      status: 'DRAFT',
    });

    if (!invoice) {
      throw new NotFoundException(
        'One or more referenced resources were not found.',
      );
    }

    return invoice;
  }
}
