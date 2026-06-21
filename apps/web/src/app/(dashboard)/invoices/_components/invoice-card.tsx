"use client";

import { useRouter } from "next/navigation";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceStatusBadge } from "./invoice-status-badge";

interface Props {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: Props) {
  const router = useRouter();

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => router.push(`/invoices/${invoice.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {invoice.invoiceNumber}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {formatCurrency(invoice.amount)} · due {formatDate(invoice.dueDate)}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>
    </div>
  );
}
