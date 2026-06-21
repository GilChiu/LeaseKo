import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
} from '../repositories/payment.repository';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '../../../invoices/application/repositories/invoice.repository';
import { Payment, PaymentMethod } from '../../domain/entities/payment.entity';

export interface RecordPaymentUseCaseInput {
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  recordedAt: Date;
  notes?: string | null;
}

@Injectable()
export class RecordPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
    @Inject(INVOICE_REPOSITORY)
    private readonly invoices: InvoiceRepository,
  ) {}

  async execute(input: RecordPaymentUseCaseInput): Promise<Payment> {
    const invoice = await this.invoices.findById(
      input.invoiceId,
      input.tenantId,
    );
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already fully paid.');
    }
    if (invoice.status === 'VOID') {
      throw new BadRequestException(
        'Cannot record payment for a voided invoice.',
      );
    }

    const totalPaid = await this.payments.getTotalPaidByInvoice(
      input.invoiceId,
      input.tenantId,
    );
    const remaining = invoice.amount - totalPaid;

    if (input.amount > remaining) {
      throw new BadRequestException(
        `Payment amount exceeds remaining balance of ${remaining}.`,
      );
    }

    const payment = await this.payments.create({
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      method: input.method,
      status: 'COMPLETED',
      recordedAt: input.recordedAt,
      notes: input.notes ?? null,
    });

    if (!payment) {
      throw new NotFoundException(
        'One or more referenced resources were not found.',
      );
    }

    const newTotalPaid = totalPaid + input.amount;
    if (newTotalPaid >= invoice.amount) {
      await this.invoices.updateStatus(input.invoiceId, input.tenantId, 'PAID');
    }

    return payment;
  }
}
