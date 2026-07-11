import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
} from '../../../payments/application/repositories/payment.repository';
import { PagedPayments } from '../../../payments/application/types/payment-repository.types';

export interface ListTenantPaymentsUseCaseInput {
  tenantId: string;
  tenantContactId: string;
  page: number;
  limit: number;
}

/**
 * ListTenantPaymentsUseCase — paginated payment history for the signed-in
 * renter (tenant portal). US 24.3. Payments are resolved via the renter's
 * invoices, so a renter only ever sees their own payments.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - MUST NOT import PrismaService or @prisma/client.
 * - tenantId AND tenantContactId come from verified request context only.
 */
@Injectable()
export class ListTenantPaymentsUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepository,
  ) {}

  async execute(input: ListTenantPaymentsUseCaseInput): Promise<PagedPayments> {
    return this.payments.findPagedByTenantContact(
      input.tenantId,
      input.tenantContactId,
      { page: input.page, limit: input.limit },
    );
  }
}
