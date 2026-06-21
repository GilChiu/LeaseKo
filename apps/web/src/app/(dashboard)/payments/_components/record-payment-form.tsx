"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getInvoices } from "@/lib/invoices-api";
import { createPayment, type CreatePaymentRequest } from "@/lib/payments-api";
import { formatCurrency } from "@/lib/format";
import type { Invoice, PaymentMethod } from "@/lib/types";

interface FormValues {
  invoiceId: string;
  amount: string;
  method: string;
  recordedAt: string;
  notes: string;
}

type FormFieldErrors = Partial<Record<keyof FormValues, string>>;

const METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "CHECK", label: "Check" },
  { value: "OTHER", label: "Other" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "needs-prerequisites" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; generalError: string | null };

function validateForm(values: FormValues): FormFieldErrors {
  const errors: FormFieldErrors = {};

  if (!values.invoiceId) errors.invoiceId = "Select an invoice";
  if (!values.method) errors.method = "Select a payment method";
  if (!values.recordedAt) errors.recordedAt = "Payment date is required";

  const amount = Number(values.amount);
  if (!values.amount.trim()) {
    errors.amount = "Amount is required";
  } else if (Number.isNaN(amount) || amount <= 0) {
    errors.amount = "Enter a positive amount";
  }

  if (values.notes.length > 2000) {
    errors.notes = "Must be 2000 characters or fewer";
  }

  return errors;
}

function buildRequestBody(values: FormValues): CreatePaymentRequest {
  const body: CreatePaymentRequest = {
    invoiceId: values.invoiceId,
    amount: Number(values.amount),
    method: values.method as PaymentMethod,
    recordedAt: values.recordedAt,
  };
  if (values.notes.trim()) body.notes = values.notes;
  return body;
}

export function RecordPaymentForm() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInvoiceId = searchParams.get("invoiceId") ?? "";

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [values, setValues] = useState<FormValues>({
    invoiceId: initialInvoiceId,
    amount: "",
    method: "",
    recordedAt: todayIso(),
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const loadPrerequisites = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }
      const [pending, overdue] = await Promise.all([
        getInvoices(token, { page: 1, limit: 100, status: "PENDING" }),
        getInvoices(token, { page: 1, limit: 100, status: "OVERDUE" }),
      ]);
      const payable = [...pending.items, ...overdue.items];
      setInvoices(payable);
      setLoadState(
        payable.length === 0
          ? { status: "needs-prerequisites" }
          : { status: "ready" },
      );
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 401) {
        router.push("/sign-in");
        return;
      }
      if (status === 403) {
        setLoadState({ status: "error-forbidden" });
        return;
      }
      setLoadState({ status: "error-server" });
    }
  }, [getToken, router]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadPrerequisites();
  }, [isLoaded, loadPrerequisites]);

  function setField(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validateForm(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const token = await getToken();
    if (!token) {
      router.push("/sign-in");
      return;
    }

    setSubmitState({ status: "submitting" });

    const result = await createPayment(token, buildRequestBody(values));

    if (result.ok) {
      router.push(`/invoices/${result.payment.invoiceId}`);
      return;
    }

    if (result.status === 401) {
      router.push("/sign-in");
      return;
    }

    const serverFieldErrors: FormFieldErrors = {};
    for (const [field, messages] of Object.entries(result.fieldErrors)) {
      if (messages.length > 0) {
        serverFieldErrors[field as keyof FormValues] = messages[0];
      }
    }
    setFieldErrors(serverFieldErrors);
    setSubmitState({ status: "error", generalError: result.generalError });
  }

  if (loadState.status === "loading") {
    return (
      <div className="max-w-2xl space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (loadState.status === "error-forbidden") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          No active organisation context. Please select or create an
          organisation to continue.
        </p>
      </div>
    );
  }

  if (loadState.status === "error-server") {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-slate-500 mb-6">
          Failed to load the payment form. Please try again.
        </p>
        <button
          onClick={() => void loadPrerequisites()}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loadState.status === "needs-prerequisites") {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
        <p className="text-sm text-slate-500 mb-1">
          There are no pending or overdue invoices to record a payment against.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Create an invoice first.
        </p>
        <button
          onClick={() => router.push("/invoices/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Create invoice
        </button>
      </div>
    );
  }

  const isSubmitting = submitState.status === "submitting";
  const generalError =
    submitState.status === "error" ? submitState.generalError : null;

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      noValidate
      className="max-w-2xl"
    >
      {generalError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{generalError}</p>
        </div>
      )}

      <div className="space-y-4">
        <Select
          id="invoiceId"
          label="Invoice *"
          value={values.invoiceId}
          onChange={(v) => setField("invoiceId", v)}
          error={fieldErrors.invoiceId}
          disabled={isSubmitting}
          placeholder="Select an invoice"
          options={invoices.map((inv) => ({
            value: inv.id,
            label: `${inv.invoiceNumber} · ${formatCurrency(inv.amount)} (${inv.status})`,
          }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="amount"
            label="Amount *"
            type="number"
            value={values.amount}
            onChange={(e) => setField("amount", e.target.value)}
            error={fieldErrors.amount}
            disabled={isSubmitting}
          />
          <Input
            id="recordedAt"
            label="Payment date *"
            type="date"
            value={values.recordedAt}
            onChange={(e) => setField("recordedAt", e.target.value)}
            error={fieldErrors.recordedAt}
            disabled={isSubmitting}
          />
        </div>

        <Select
          id="method"
          label="Payment method *"
          value={values.method}
          onChange={(v) => setField("method", v)}
          error={fieldErrors.method}
          disabled={isSubmitting}
          placeholder="Select a method"
          options={METHOD_OPTIONS}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            value={values.notes}
            onChange={(e) => setField("notes", e.target.value)}
            disabled={isSubmitting}
            className={cn(
              "resize-none rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50",
              fieldErrors.notes
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300",
            )}
          />
          {fieldErrors.notes && (
            <p className="text-xs text-red-600">{fieldErrors.notes}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Record payment"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push("/payments")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
