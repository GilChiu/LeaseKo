import type { MaintenanceStatus } from "@/lib/types";

const STATUS_BADGE: Record<MaintenanceStatus, string> = {
  OPEN: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
};

export function MaintenanceStatusBadge({
  status,
}: {
  status: MaintenanceStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
