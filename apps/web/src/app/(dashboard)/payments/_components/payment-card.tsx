"use client";

import { useRouter } from "next/navigation";
import type { Payment } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentStatusBadge } from "./payment-status-badge";

interface Props {
  payment: Payment;
}

export function PaymentCard({ payment }: Props) {
  const router = useRouter();

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => router.push(`/invoices/${payment.invoiceId}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {formatCurrency(payment.amount)} · {payment.method}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {formatDate(payment.recordedAt)}
          </p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>
    </div>
  );
}
