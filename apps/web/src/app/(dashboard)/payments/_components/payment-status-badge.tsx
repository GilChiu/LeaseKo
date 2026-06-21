import type { PaymentStatus } from "@/lib/types";

const STATUS_BADGE: Record<PaymentStatus, string> = {
  COMPLETED: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-slate-100 text-slate-600",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {status}
    </span>
  );
}
