"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getMaintenanceRequests } from "@/lib/maintenance-api";
import type {
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
} from "@/lib/types";
import { MaintenanceCard } from "./_components/maintenance-card";

type StatusFilter = "ALL" | MaintenanceStatus;
type PriorityFilter = "ALL" | MaintenancePriority;

type PageState =
  | { status: "loading" }
  | { status: "success"; items: MaintenanceRequest[]; total: number }
  | { status: "empty" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_FILTERS: Array<{ value: PriorityFilter; label: string }> = [
  { value: "ALL", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default function MaintenancePage() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");

  const loadRequests = useCallback(
    async (activeStatus: StatusFilter, activePriority: PriorityFilter) => {
      setState({ status: "loading" });
      try {
        const token = await getToken();
        if (!token) {
          router.push("/sign-in");
          return;
        }
        const data = await getMaintenanceRequests(token, {
          page: 1,
          limit: 50,
          status: activeStatus === "ALL" ? undefined : activeStatus,
          priority: activePriority === "ALL" ? undefined : activePriority,
        });
        setState(
          data.items.length === 0
            ? { status: "empty" }
            : { status: "success", items: data.items, total: data.total },
        );
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 401) {
            router.push("/sign-in");
            return;
          }
          if (e.status === 403) {
            setState({ status: "error-forbidden" });
            return;
          }
        }
        setState({ status: "error-server" });
      }
    },
    [getToken, router],
  );

  useEffect(() => {
    if (!isLoaded) return;
    void loadRequests(statusFilter, priorityFilter);
  }, [isLoaded, statusFilter, priorityFilter, loadRequests]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
        <button
          onClick={() => router.push("/maintenance/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          New request
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={
              statusFilter === f.value
                ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                : "rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {PRIORITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setPriorityFilter(f.value)}
            className={
              priorityFilter === f.value
                ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                : "rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-slate-200 animate-pulse"
            />
          ))}
        </div>
      )}

      {state.status === "success" && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            {state.total > state.items.length
              ? `Showing ${state.items.length} of ${state.total} requests`
              : `${state.total} ${state.total === 1 ? "request" : "requests"}`}
          </p>
          <div className="flex flex-col gap-3">
            {state.items.map((request) => (
              <MaintenanceCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {state.status === "empty" && (
        <div className="text-center py-16">
          <p className="text-base text-slate-500 mb-2">
            No maintenance requests found.
          </p>
          {statusFilter === "ALL" && priorityFilter === "ALL" && (
            <>
              <p className="text-sm text-slate-400 mb-6">
                Create your first maintenance request to get started.
              </p>
              <button
                onClick={() => router.push("/maintenance/new")}
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                New request
              </button>
            </>
          )}
        </div>
      )}

      {state.status === "error-forbidden" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            No active organisation context available. Please select or create an
            organisation to continue.
          </p>
        </div>
      )}

      {state.status === "error-server" && (
        <div className="text-center py-16">
          <p className="text-base text-slate-500 mb-6">
            Failed to load maintenance requests. Please try again.
          </p>
          <button
            onClick={() => void loadRequests(statusFilter, priorityFilter)}
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
