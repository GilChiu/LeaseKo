"use client";

import { useRouter } from "next/navigation";
import type { Property } from "@/lib/types";

interface Props {
  property: Property;
}

export function PropertyCard({ property }: Props) {
  const router = useRouter();

  const addressParts = [
    property.addressLine1,
    property.addressLine2,
    property.city,
    property.state,
    property.country,
  ].filter((part): part is string => Boolean(part));

  const address = addressParts.join(", ");

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => router.push(`/properties/${property.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {property.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1 truncate">{address}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {property.propertyType}
        </span>
      </div>
    </div>
  );
}
