"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getInvoices } from "@/lib/invoices-api";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { InvoiceCard } from "./_components/invoice-card";

type Filter = "ALL" | InvoiceStatus;

type PageState =
  | { status: "loading" }
  | { status: "success"; items: Invoice[]; total: number }
  | { status: "empty" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
];

export default function InvoicesPage() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [filter, setFilter] = useState<Filter>("ALL");

  const loadInvoices = useCallback(
    async (activeFilter: Filter) => {
      setState({ status: "loading" });
      try {
        const token = await getToken();
        if (!token) {
          router.push("/sign-in");
          return;
        }
        const data = await getInvoices(token, {
          page: 1,
          limit: 50,
          status: activeFilter === "ALL" ? undefined : activeFilter,
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
    void loadInvoices(filter);
  }, [isLoaded, filter, loadInvoices]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <button
          onClick={() => router.push("/invoices/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Create invoice
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={
              filter === f.value
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
              ? `Showing ${state.items.length} of ${state.total} invoices`
              : `${state.total} ${state.total === 1 ? "invoice" : "invoices"}`}
          </p>
          <div className="flex flex-col gap-3">
            {state.items.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        </div>
      )}

      {state.status === "empty" && (
        <div className="text-center py-16">
          <p className="text-base text-slate-500 mb-2">
            {filter === "ALL"
              ? "No invoices yet."
              : `No ${filter.toLowerCase()} invoices.`}
          </p>
          {filter === "ALL" && (
            <>
              <p className="text-sm text-slate-400 mb-6">
                Create your first invoice to get started.
              </p>
              <button
                onClick={() => router.push("/invoices/new")}
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Create invoice
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
            Failed to load invoices. Please try again.
          </p>
          <button
            onClick={() => void loadInvoices(filter)}
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
