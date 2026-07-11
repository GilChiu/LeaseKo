import { Payment } from '../../domain/entities/payment.entity';
import {
  CreatePaymentInput,
  FindPagedByTenantContactOptions,
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

  /**
   * Return a paginated slice of payments belonging to a single tenant contact
   * (renter), resolved via the payment's parent invoice. Ordered by createdAt
   * DESC. Used by the tenant portal. tenantId MUST come from verified context.
   */
  findPagedByTenantContact(
    tenantId: string,
    tenantContactId: string,
    options: FindPagedByTenantContactOptions,
  ): Promise<PagedPayments>;

  findById(id: string, tenantId: string): Promise<Payment | null>;

  getTotalPaidByInvoice(invoiceId: string, tenantId: string): Promise<number>;
}
