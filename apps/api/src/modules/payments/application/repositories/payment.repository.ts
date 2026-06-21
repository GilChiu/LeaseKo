import { Payment } from '../../domain/entities/payment.entity';
import {
  CreatePaymentInput,
  FindPagedByTenantOptions,
  PagedPayments,
} from '../types/payment-repository.types';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface PaymentRepository {
  create(input: CreatePaymentInput): Promise<Payment | null>;

  findPagedByTenant(
    tenantId: string,
    options: FindPagedByTenantOptions,
  ): Promise<PagedPayments>;

  findById(id: string, tenantId: string): Promise<Payment | null>;

  getTotalPaidByInvoice(invoiceId: string, tenantId: string): Promise<number>;
}
