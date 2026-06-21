import type { MaintenancePriority } from "@/lib/types";

const PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-red-100 text-red-800",
};

export function MaintenancePriorityBadge({
  priority,
}: {
  priority: MaintenancePriority;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[priority]}`}
    >
      {priority}
    </span>
  );
}
