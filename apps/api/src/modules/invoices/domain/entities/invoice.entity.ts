export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'VOID';

export interface Invoice {
  id: string;
  tenantId: string;
  leaseId: string;
  tenantContactId: string;
  invoiceNumber: string;
  dueDate: Date;
  amount: number;
  notes: string | null;
  status: InvoiceStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
