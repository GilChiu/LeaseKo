"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getPayments } from "@/lib/payments-api";
import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";
import { PaymentCard } from "./_components/payment-card";

type MethodFilter = "ALL" | PaymentMethod;
type StatusFilter = "ALL" | PaymentStatus;

type PageState =
  | { status: "loading" }
  | { status: "success"; items: Payment[]; total: number }
  | { status: "empty" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

const METHOD_FILTERS: Array<{ value: MethodFilter; label: string }> = [
  { value: "ALL", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "CHECK", label: "Check" },
  { value: "OTHER", label: "Other" },
];

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

export default function PaymentsPage() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [method, setMethod] = useState<MethodFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const loadPayments = useCallback(
    async (activeMethod: MethodFilter, activeStatus: StatusFilter) => {
      setState({ status: "loading" });
      try {
        const token = await getToken();
        if (!token) {
          router.push("/sign-in");
          return;
        }
        const data = await getPayments(token, {
          page: 1,
          limit: 50,
          method: activeMethod === "ALL" ? undefined : activeMethod,
          status: activeStatus === "ALL" ? undefined : activeStatus,
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
    void loadPayments(method, statusFilter);
  }, [isLoaded, method, statusFilter, loadPayments]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <button
          onClick={() => router.push("/payments/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Record payment
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {METHOD_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setMethod(f.value)}
            className={
              method === f.value
                ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                : "rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
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
              ? `Showing ${state.items.length} of ${state.total} payments`
              : `${state.total} ${state.total === 1 ? "payment" : "payments"}`}
          </p>
          <div className="flex flex-col gap-3">
            {state.items.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </div>
        </div>
      )}

      {state.status === "empty" && (
        <div className="text-center py-16">
          <p className="text-base text-slate-500 mb-2">No payments found.</p>
          {method === "ALL" && statusFilter === "ALL" && (
            <>
              <p className="text-sm text-slate-400 mb-6">
                Record your first payment to get started.
              </p>
              <button
                onClick={() => router.push("/payments/new")}
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Record payment
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
            Failed to load payments. Please try again.
          </p>
          <button
            onClick={() => void loadPayments(method, statusFilter)}
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
