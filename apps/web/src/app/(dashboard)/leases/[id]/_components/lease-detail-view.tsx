"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getContactById } from "@/lib/contacts-api";
import {
  activateLease,
  expireLease,
  getLeaseById,
  terminateLease,
  type LeaseActionResult,
} from "@/lib/leases-api";
import { getPropertyById } from "@/lib/properties-api";
import { getUnits } from "@/lib/units-api";
import type { Lease } from "@/lib/types";
import { LeaseStatusBadge } from "../../_components/lease-status-badge";

interface Enrichment {
  propertyName: string | null;
  unitNumber: string | null;
  tenantName: string | null;
}

type PageState =
  | { status: "loading" }
  | { status: "success"; lease: Lease; enrichment: Enrichment }
  | { status: "not-found" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

type ActionState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "error"; message: string };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

async function enrichLease(
  token: string,
  lease: Lease,
): Promise<Enrichment> {
  const enrichment: Enrichment = {
    propertyName: null,
    unitNumber: null,
    tenantName: null,
  };

  const [propertyResult, unitsData, contactResult] = await Promise.allSettled([
    getPropertyById(token, lease.propertyId),
    getUnits(token, lease.propertyId),
    getContactById(token, lease.tenantContactId),
  ]);

  if (propertyResult.status === "fulfilled" && propertyResult.value.ok) {
    enrichment.propertyName = propertyResult.value.property.name;
  }
  if (unitsData.status === "fulfilled") {
    const unit = unitsData.value.items.find((u) => u.id === lease.unitId);
    if (unit) enrichment.unitNumber = unit.unitNumber;
  }
  if (contactResult.status === "fulfilled" && contactResult.value.ok) {
    const c = contactResult.value.contact;
    enrichment.tenantName = `${c.firstName} ${c.lastName}`;
  }

  return enrichment;
}

export function LeaseDetailView({ leaseId }: { leaseId: string }) {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
  });

  const loadLease = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }
      const result = await getLeaseById(token, leaseId);
      if (!result.ok) {
        if (result.status === 401) {
          router.push("/sign-in");
          return;
        }
        if (result.status === 403) {
          setState({ status: "error-forbidden" });
          return;
        }
        if (result.status === 404) {
          setState({ status: "not-found" });
          return;
        }
        setState({ status: "error-server" });
        return;
      }
      const enrichment = await enrichLease(token, result.lease);
      setState({ status: "success", lease: result.lease, enrichment });
    } catch {
      setState({ status: "error-server" });
    }
  }, [getToken, leaseId, router]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadLease();
  }, [isLoaded, loadLease]);

  async function runAction(
    label: string,
    fn: (token: string, id: string) => Promise<LeaseActionResult>,
  ) {
    if (!window.confirm(`${label} this lease?`)) return;
    setActionState({ status: "running" });
    const token = await getToken();
    if (!token) {
      router.push("/sign-in");
      return;
    }
    const result = await fn(token, leaseId);
    if (result.ok) {
      setActionState({ status: "idle" });
      setState((prev) =>
        prev.status === "success"
          ? { ...prev, lease: result.lease }
          : prev,
      );
      return;
    }
    if (result.status === 401) {
      router.push("/sign-in");
      return;
    }
    setActionState({ status: "error", message: result.message });
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-72 rounded bg-slate-200 animate-pulse" />
        <div className="mt-8 h-40 rounded-lg bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-slate-500 mb-2">Lease not found.</p>
        <p className="text-sm text-slate-400 mb-6">
          This lease may have been removed or you don&apos;t have access to it.
        </p>
        <button
          onClick={() => router.push("/leases")}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back to leases
        </button>
      </div>
    );
  }

  if (state.status === "error-forbidden") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          No active organisation context. Please select or create an
          organisation to continue.
        </p>
      </div>
    );
  }

  if (state.status === "error-server") {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-slate-500 mb-6">
          Failed to load lease. Please try again.
        </p>
        <button
          onClick={() => void loadLease()}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { lease, enrichment } = state;
  const isRunning = actionState.status === "running";

  return (
    <div>
      <button
        onClick={() => router.push("/leases")}
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to leases
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Lease — {enrichment.tenantName ?? lease.tenantContactId}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
          </p>
        </div>
        <LeaseStatusBadge status={lease.status} />
      </div>

      {actionState.status === "error" && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{actionState.message}</p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Property</dt>
            <dd className="font-medium text-slate-900">
              {enrichment.propertyName ?? lease.propertyId}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Unit</dt>
            <dd className="font-medium text-slate-900">
              {enrichment.unitNumber
                ? `Unit ${enrichment.unitNumber}`
                : lease.unitId}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Monthly rent</dt>
            <dd className="font-medium text-slate-900">
              {lease.monthlyRent.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Deposit</dt>
            <dd className="font-medium text-slate-900">
              {lease.depositAmount !== null
                ? lease.depositAmount.toLocaleString()
                : "—"}
            </dd>
          </div>
          {lease.notes && (
            <div className="col-span-2">
              <dt className="text-slate-500">Notes</dt>
              <dd className="text-slate-700 whitespace-pre-wrap">
                {lease.notes}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {(lease.status === "DRAFT" || lease.status === "ACTIVE") && (
        <div className="flex flex-wrap gap-3">
          {lease.status === "DRAFT" && (
            <button
              onClick={() => void runAction("Activate", activateLease)}
              disabled={isRunning}
              className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isRunning ? "Working…" : "Activate"}
            </button>
          )}
          {lease.status === "ACTIVE" && (
            <>
              <button
                onClick={() => void runAction("Expire", expireLease)}
                disabled={isRunning}
                className="inline-flex items-center rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {isRunning ? "Working…" : "Expire"}
              </button>
              <button
                onClick={() => void runAction("Terminate", terminateLease)}
                disabled={isRunning}
                className="inline-flex items-center rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isRunning ? "Working…" : "Terminate"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
