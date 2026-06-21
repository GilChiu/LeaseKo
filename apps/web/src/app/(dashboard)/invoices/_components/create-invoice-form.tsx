"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getLeases } from "@/lib/leases-api";
import { createInvoice, type CreateInvoiceRequest } from "@/lib/invoices-api";
import { formatDate } from "@/lib/format";
import type { Lease } from "@/lib/types";

interface FormValues {
  leaseId: string;
  dueDate: string;
  amount: string;
  notes: string;
}

type FormFieldErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  leaseId: "",
  dueDate: "",
  amount: "",
  notes: "",
};

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

  if (!values.leaseId) errors.leaseId = "Select a lease";
  if (!values.dueDate) errors.dueDate = "Due date is required";

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

function buildRequestBody(values: FormValues): CreateInvoiceRequest {
  const body: CreateInvoiceRequest = {
    leaseId: values.leaseId,
    dueDate: values.dueDate,
    amount: Number(values.amount),
  };
  if (values.notes.trim()) body.notes = values.notes;
  return body;
}

export function CreateInvoiceForm() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [leases, setLeases] = useState<Lease[]>([]);

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
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
      const data = await getLeases(token, {
        page: 1,
        limit: 100,
        status: "ACTIVE",
      });
      setLeases(data.items);
      setLoadState(
        data.items.length === 0
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

    const result = await createInvoice(token, buildRequestBody(values));

    if (result.ok) {
      router.push(`/invoices/${result.invoice.id}`);
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
          Failed to load the invoice form. Please try again.
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
          You need at least one active lease before creating an invoice.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Create a lease and activate it first.
        </p>
        <button
          onClick={() => router.push("/leases/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Create lease
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
          id="leaseId"
          label="Lease *"
          value={values.leaseId}
          onChange={(v) => setField("leaseId", v)}
          error={fieldErrors.leaseId}
          disabled={isSubmitting}
          placeholder="Select an active lease"
          options={leases.map((l) => ({
            value: l.id,
            label: `${formatDate(l.startDate)} → ${formatDate(l.endDate)} · ${l.monthlyRent.toLocaleString()}/mo`,
          }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="dueDate"
            label="Due date *"
            type="date"
            value={values.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
            error={fieldErrors.dueDate}
            disabled={isSubmitting}
          />
          <Input
            id="amount"
            label="Amount *"
            type="number"
            value={values.amount}
            onChange={(e) => setField("amount", e.target.value)}
            error={fieldErrors.amount}
            disabled={isSubmitting}
          />
        </div>

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
          {isSubmitting ? "Saving…" : "Create invoice"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push("/invoices")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
