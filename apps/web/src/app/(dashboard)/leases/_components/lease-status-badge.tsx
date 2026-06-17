import type { LeaseStatus } from "@/lib/types";

const STATUS_BADGE: Record<LeaseStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-amber-100 text-amber-800",
  TERMINATED: "bg-red-100 text-red-800",
};

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {status}
    </span>
  );
}
