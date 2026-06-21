"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getInvoiceById } from "@/lib/invoices-api";
import { getPayments } from "@/lib/payments-api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice, Payment } from "@/lib/types";
import { InvoiceStatusBadge } from "../../_components/invoice-status-badge";
import { PaymentStatusBadge } from "../../../payments/_components/payment-status-badge";

type PageState =
  | { status: "loading" }
  | { status: "success"; invoice: Invoice; payments: Payment[] }
  | { status: "not-found" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

export function InvoiceDetailView({ invoiceId }: { invoiceId: string }) {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });

  const loadInvoice = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }
      const result = await getInvoiceById(token, invoiceId);
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

      let payments: Payment[] = [];
      try {
        const paged = await getPayments(token, { invoiceId, limit: 100 });
        payments = paged.items;
      } catch {
        // payments are supplementary; leave empty on failure
      }

      setState({ status: "success", invoice: result.invoice, payments });
    } catch {
      setState({ status: "error-server" });
    }
  }, [getToken, invoiceId, router]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadInvoice();
  }, [isLoaded, loadInvoice]);

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
        <p className="text-base text-slate-500 mb-2">Invoice not found.</p>
        <p className="text-sm text-slate-400 mb-6">
          This invoice may have been removed or you don&apos;t have access to it.
        </p>
        <button
          onClick={() => router.push("/invoices")}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back to invoices
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
          Failed to load invoice. Please try again.
        </p>
        <button
          onClick={() => void loadInvoice()}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { invoice, payments } = state;
  const canRecordPayment =
    invoice.status === "PENDING" || invoice.status === "OVERDUE";

  return (
    <div>
      <button
        onClick={() => router.push("/invoices")}
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to invoices
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {invoice.invoiceNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Due {formatDate(invoice.dueDate)}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Amount</dt>
            <dd className="font-medium text-slate-900">
              {formatCurrency(invoice.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Due date</dt>
            <dd className="font-medium text-slate-900">
              {formatDate(invoice.dueDate)}
            </dd>
          </div>
          {invoice.notes && (
            <div className="col-span-2">
              <dt className="text-slate-500">Notes</dt>
              <dd className="text-slate-700 whitespace-pre-wrap">
                {invoice.notes}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
        {canRecordPayment && (
          <button
            onClick={() =>
              router.push(`/payments/new?invoiceId=${invoice.id}`)
            }
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Record payment
          </button>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center">
          <p className="text-sm text-slate-500">
            No payments recorded for this invoice yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(payment.amount)} · {payment.method}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDate(payment.recordedAt)}
                  </p>
                </div>
                <PaymentStatusBadge status={payment.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
