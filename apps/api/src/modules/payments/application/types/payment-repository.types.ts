import { Payment, PaymentMethod, PaymentStatus } from '../../domain/entities/payment.entity';

export interface CreatePaymentInput {
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  recordedAt: Date;
  notes: string | null;
}

export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
  invoiceId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
}

export interface FindPagedByTenantContactOptions {
  page: number;
  limit: number;
}

export interface PagedPayments {
  items: Payment[];
  total: number;
}
