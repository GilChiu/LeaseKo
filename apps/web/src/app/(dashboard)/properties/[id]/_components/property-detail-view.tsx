"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getPropertyById } from "@/lib/properties-api";
import { getUnits } from "@/lib/units-api";
import type { Property, Unit } from "@/lib/types";
import { AddUnitForm } from "./add-unit-form";

type PageState =
  | { status: "loading" }
  | { status: "success"; property: Property; units: Unit[] }
  | { status: "not-found" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-amber-100 text-amber-800",
  MAINTENANCE: "bg-blue-100 text-blue-800",
  INACTIVE: "bg-slate-100 text-slate-600",
};

function formatAddress(p: Property): string {
  return [p.addressLine1, p.addressLine2, p.city, p.state, p.postalCode, p.country]
    .filter(Boolean)
    .join(", ");
}

export function PropertyDetailView({ propertyId }: { propertyId: string }) {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }

      const propertyResult = await getPropertyById(token, propertyId);

      if (!propertyResult.ok) {
        if (propertyResult.status === 401) { router.push("/sign-in"); return; }
        if (propertyResult.status === 403) { setState({ status: "error-forbidden" }); return; }
        if (propertyResult.status === 404) { setState({ status: "not-found" }); return; }
        setState({ status: "error-server" });
        return;
      }

      let units: Unit[] = [];
      try {
        const unitsData = await getUnits(token, propertyId);
        units = unitsData.items;
      } catch {
        // units load failure is non-fatal; show empty list
      }

      setState({ status: "success", property: propertyResult.property, units });
    } catch {
      setState({ status: "error-server" });
    }
  }, [getToken, propertyId, router]);

  const loadUnits = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const unitsData = await getUnits(token, propertyId);
      setState((prev) =>
        prev.status === "success" ? { ...prev, units: unitsData.items } : prev,
      );
    } catch {
      // non-blocking
    }
  }, [getToken, propertyId]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadData();
  }, [isLoaded, loadData]);

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-72 rounded bg-slate-200 animate-pulse" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-slate-500 mb-2">Property not found.</p>
        <p className="text-sm text-slate-400 mb-6">
          This property may have been deleted or you don&apos;t have access to it.
        </p>
        <button
          onClick={() => router.push("/properties")}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back to properties
        </button>
      </div>
    );
  }

  if (state.status === "error-forbidden") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          No active organisation context. Please select or create an organisation to continue.
        </p>
      </div>
    );
  }

  if (state.status === "error-server") {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-slate-500 mb-6">
          Failed to load property. Please try again.
        </p>
        <button
          onClick={() => void loadData()}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { property, units } = state;

  return (
    <div>
      <button
        onClick={() => router.push("/properties")}
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to properties
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{formatAddress(property)}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-8">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Property type</dt>
            <dd className="font-medium text-slate-900">{property.propertyType}</dd>
          </div>
          {property.description && (
            <div className="col-span-2">
              <dt className="text-slate-500">Description</dt>
              <dd className="text-slate-700">{property.description}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Units{" "}
          {units.length > 0 && (
            <span className="text-slate-400 font-normal text-base">
              ({units.length})
            </span>
          )}
        </h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Add unit
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">New unit</h3>
          <AddUnitForm
            propertyId={propertyId}
            onSuccess={() => {
              setShowAddForm(false);
              void loadUnits();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {units.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
          <p className="text-sm text-slate-500 mb-1">No units yet.</p>
          <p className="text-xs text-slate-400">
            Add your first unit to start tracking rentable spaces.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  Unit {unit.unitNumber}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[unit.status] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {unit.status}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-4 gap-2 text-xs text-slate-500">
                <div>
                  <dt>Floor area</dt>
                  <dd className="text-slate-700">
                    {unit.floorArea !== null ? `${unit.floorArea} m²` : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Bedrooms</dt>
                  <dd className="text-slate-700">
                    {unit.bedrooms !== null ? String(unit.bedrooms) : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Bathrooms</dt>
                  <dd className="text-slate-700">
                    {unit.bathrooms !== null ? String(unit.bathrooms) : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Monthly rent</dt>
                  <dd className="text-slate-700">
                    {unit.monthlyRent !== null
                      ? unit.monthlyRent.toLocaleString()
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
