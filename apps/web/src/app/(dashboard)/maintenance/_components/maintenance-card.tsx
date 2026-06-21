"use client";

import { useRouter } from "next/navigation";
import type { MaintenanceRequest } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { MaintenanceStatusBadge } from "./maintenance-status-badge";
import { MaintenancePriorityBadge } from "./maintenance-priority-badge";

interface Props {
  request: MaintenanceRequest;
}

export function MaintenanceCard({ request }: Props) {
  const router = useRouter();

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => router.push(`/maintenance/${request.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {request.title}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Created {formatDate(request.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MaintenancePriorityBadge priority={request.priority} />
          <MaintenanceStatusBadge status={request.status} />
        </div>
      </div>
    </div>
  );
}
