"use client";

import { useRouter } from "next/navigation";
import type { Lease } from "@/lib/types";
import { LeaseStatusBadge } from "./lease-status-badge";

interface Props {
  lease: Lease;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

export function LeaseCard({ lease }: Props) {
  const router = useRouter();

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => router.push(`/leases/${lease.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {lease.monthlyRent.toLocaleString()} / month
          </p>
        </div>
        <LeaseStatusBadge status={lease.status} />
      </div>
    </div>
  );
}
