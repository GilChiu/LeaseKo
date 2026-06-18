import { Invoice, InvoiceStatus } from '../../domain/entities/invoice.entity';

export interface CreateInvoiceInput {
  tenantId: string;
  leaseId: string;
  tenantContactId: string;
  invoiceNumber: string;
  dueDate: Date;
  amount: number;
  notes: string | null;
  status: InvoiceStatus;
}

export interface FindPagedByTenantOptions {
  page: number;
  limit: number;
  status?: InvoiceStatus;
}

export interface PagedInvoices {
  items: Invoice[];
  total: number;
}
