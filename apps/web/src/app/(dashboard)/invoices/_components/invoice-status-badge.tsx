import type { InvoiceStatus } from "@/lib/types";

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  VOID: "bg-slate-100 text-slate-600",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {status}
    </span>
  );
}
