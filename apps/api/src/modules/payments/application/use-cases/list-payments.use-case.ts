import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
} from '../repositories/payment.repository';
import { PaymentMethod, PaymentStatus } from '../../domain/entities/payment.entity';
import { PagedPayments } from '../types/payment-repository.types';

export interface ListPaymentsUseCaseInput {
  tenantId: string;
  page: number;
  limit: number;
  invoiceId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
}

@Injectable()
export class ListPaymentsUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
  ) {}

  async execute(input: ListPaymentsUseCaseInput): Promise<PagedPayments> {
    return this.payments.findPagedByTenant(input.tenantId, {
      page: input.page,
      limit: input.limit,
      invoiceId: input.invoiceId,
      method: input.method,
      status: input.status,
    });
  }
}
