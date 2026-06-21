"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import {
  getMaintenanceRequests,
  updateMaintenanceStatus,
} from "@/lib/maintenance-api";
import { getPropertyById } from "@/lib/properties-api";
import { getUnits } from "@/lib/units-api";
import { formatDate } from "@/lib/format";
import type { MaintenanceRequest, MaintenanceStatus } from "@/lib/types";
import { MaintenanceStatusBadge } from "../../_components/maintenance-status-badge";
import { MaintenancePriorityBadge } from "../../_components/maintenance-priority-badge";

interface Enrichment {
  propertyName: string | null;
  unitNumber: string | null;
}

type PageState =
  | { status: "loading" }
  | { status: "success"; request: MaintenanceRequest; enrichment: Enrichment }
  | { status: "not-found" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

type ActionState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "error"; message: string };

const STATUS_OPTIONS: Array<{ value: MaintenanceStatus; label: string }> = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

async function enrich(
  token: string,
  request: MaintenanceRequest,
): Promise<Enrichment> {
  const enrichment: Enrichment = { propertyName: null, unitNumber: null };

  const [propertyResult, unitsData] = await Promise.allSettled([
    getPropertyById(token, request.propertyId),
    getUnits(token, request.propertyId),
  ]);

  if (propertyResult.status === "fulfilled" && propertyResult.value.ok) {
    enrichment.propertyName = propertyResult.value.property.name;
  }
  if (unitsData.status === "fulfilled") {
    const unit = unitsData.value.items.find((u) => u.id === request.unitId);
    if (unit) enrichment.unitNumber = unit.unitNumber;
  }

  return enrichment;
}

export function MaintenanceDetailView({ requestId }: { requestId: string }) {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [actionState, setActionState] = useState<ActionState>({
    status: "idle",
  });
  const [pendingStatus, setPendingStatus] = useState<string>("");

  const loadRequest = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }
      // No GET /maintenance/:id endpoint — fetch the list and locate by id.
      const paged = await getMaintenanceRequests(token, {
        page: 1,
        limit: 100,
      });
      const request = paged.items.find((r) => r.id === requestId);
      if (!request) {
        setState({ status: "not-found" });
        return;
      }
      const enrichment = await enrich(token, request);
      setPendingStatus(request.status);
      setState({ status: "success", request, enrichment });
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 401) {
        router.push("/sign-in");
        return;
      }
      if (status === 403) {
        setState({ status: "error-forbidden" });
        return;
      }
      setState({ status: "error-server" });
    }
  }, [getToken, requestId, router]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadRequest();
  }, [isLoaded, loadRequest]);

  async function handleUpdateStatus() {
    if (state.status !== "success") return;
    if (!pendingStatus || pendingStatus === state.request.status) return;

    setActionState({ status: "running" });
    const token = await getToken();
    if (!token) {
      router.push("/sign-in");
      return;
    }
    const result = await updateMaintenanceStatus(
      token,
      requestId,
      pendingStatus as MaintenanceStatus,
    );
    if (result.ok) {
      setActionState({ status: "idle" });
      setState((prev) =>
        prev.status === "success"
          ? { ...prev, request: result.request }
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
        <p className="text-base text-slate-500 mb-2">
          Maintenance request not found.
        </p>
        <p className="text-sm text-slate-400 mb-6">
          It may have been removed or you don&apos;t have access to it.
        </p>
        <button
          onClick={() => router.push("/maintenance")}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back to maintenance
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
          Failed to load the request. Please try again.
        </p>
        <button
          onClick={() => void loadRequest()}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { request, enrichment } = state;
  const isRunning = actionState.status === "running";
  const statusUnchanged = pendingStatus === request.status;

  return (
    <div>
      <button
        onClick={() => router.push("/maintenance")}
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to maintenance
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Created {formatDate(request.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MaintenancePriorityBadge priority={request.priority} />
          <MaintenanceStatusBadge status={request.status} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Property</dt>
            <dd className="font-medium text-slate-900">
              {enrichment.propertyName ?? request.propertyId}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Unit</dt>
            <dd className="font-medium text-slate-900">
              {enrichment.unitNumber
                ? `Unit ${enrichment.unitNumber}`
                : request.unitId}
            </dd>
          </div>
          {request.description && (
            <div className="col-span-2">
              <dt className="text-slate-500">Description</dt>
              <dd className="text-slate-700 whitespace-pre-wrap">
                {request.description}
              </dd>
            </div>
          )}
          {request.notes && (
            <div className="col-span-2">
              <dt className="text-slate-500">Notes</dt>
              <dd className="text-slate-700 whitespace-pre-wrap">
                {request.notes}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {actionState.status === "error" && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{actionState.message}</p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Update status
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Select
              id="status"
              label="Status"
              value={pendingStatus}
              onChange={setPendingStatus}
              disabled={isRunning}
              placeholder="Select a status"
              options={STATUS_OPTIONS}
            />
          </div>
          <button
            onClick={() => void handleUpdateStatus()}
            disabled={isRunning || statusUnchanged}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {isRunning ? "Working…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
