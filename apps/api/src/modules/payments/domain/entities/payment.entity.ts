export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'GCASH' | 'MAYA' | 'CHECK' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  recordedAt: Date;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
