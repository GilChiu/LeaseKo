"use client";

import { useRouter } from "next/navigation";
import type { TenantContact } from "@/lib/types";

interface Props {
  contact: TenantContact;
}

export function TenantCard({ contact }: Props) {
  const router = useRouter();

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => router.push(`/tenants/${contact.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {contact.firstName} {contact.lastName}
          </h3>
          <p className="text-sm text-slate-500 mt-1 truncate">
            {contact.email}
          </p>
        </div>
        {contact.phone && (
          <span className="shrink-0 text-xs font-medium text-slate-600">
            {contact.phone}
          </span>
        )}
      </div>
    </div>
  );
}
