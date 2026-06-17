"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getContacts } from "@/lib/contacts-api";
import { createLease, type CreateLeaseRequest } from "@/lib/leases-api";
import { getUnits } from "@/lib/units-api";
import type {
  PagedProperties,
  Property,
  TenantContact,
  Unit,
} from "@/lib/types";

interface FormValues {
  propertyId: string;
  unitId: string;
  tenantContactId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  depositAmount: string;
  notes: string;
}

type FormFieldErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  propertyId: "",
  unitId: "",
  tenantContactId: "",
  startDate: "",
  endDate: "",
  monthlyRent: "",
  depositAmount: "",
  notes: "",
};

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "needs-prerequisites"; missing: string }
  | { status: "error-forbidden" }
  | { status: "error-server" };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; generalError: string | null };

function validateForm(values: FormValues): FormFieldErrors {
  const errors: FormFieldErrors = {};

  if (!values.propertyId) errors.propertyId = "Select a property";
  if (!values.unitId) errors.unitId = "Select a unit";
  if (!values.tenantContactId) errors.tenantContactId = "Select a tenant";
  if (!values.startDate) errors.startDate = "Start date is required";
  if (!values.endDate) errors.endDate = "End date is required";

  if (
    values.startDate &&
    values.endDate &&
    new Date(values.startDate) >= new Date(values.endDate)
  ) {
    errors.endDate = "End date must be after the start date";
  }

  const rent = Number(values.monthlyRent);
  if (!values.monthlyRent.trim()) {
    errors.monthlyRent = "Monthly rent is required";
  } else if (Number.isNaN(rent) || rent <= 0) {
    errors.monthlyRent = "Enter a positive amount";
  }

  if (values.depositAmount.trim()) {
    const deposit = Number(values.depositAmount);
    if (Number.isNaN(deposit) || deposit < 0) {
      errors.depositAmount = "Enter a valid amount";
    }
  }

  if (values.notes.length > 2000) {
    errors.notes = "Must be 2000 characters or fewer";
  }

  return errors;
}

function buildRequestBody(values: FormValues): CreateLeaseRequest {
  const body: CreateLeaseRequest = {
    propertyId: values.propertyId,
    unitId: values.unitId,
    tenantContactId: values.tenantContactId,
    startDate: values.startDate,
    endDate: values.endDate,
    monthlyRent: Number(values.monthlyRent),
  };
  if (values.depositAmount.trim()) {
    body.depositAmount = Number(values.depositAmount);
  }
  if (values.notes.trim()) body.notes = values.notes;
  return body;
}

export function CreateLeaseForm() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [properties, setProperties] = useState<Property[]>([]);
  const [contacts, setContacts] = useState<TenantContact[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

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
      const [propsData, contactsData] = await Promise.all([
        apiFetch<PagedProperties>("/properties?page=1&limit=100", { token }),
        getContacts(token, 1, 100),
      ]);
      setProperties(propsData.items);
      setContacts(contactsData.items);

      if (propsData.items.length === 0) {
        setLoadState({ status: "needs-prerequisites", missing: "property" });
        return;
      }
      if (contactsData.items.length === 0) {
        setLoadState({ status: "needs-prerequisites", missing: "tenant" });
        return;
      }
      setLoadState({ status: "ready" });
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

  async function handlePropertyChange(propertyId: string) {
    setValues((prev) => ({ ...prev, propertyId, unitId: "" }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.propertyId;
      delete next.unitId;
      return next;
    });
    setUnits([]);
    if (!propertyId) return;

    setUnitsLoading(true);
    const token = await getToken();
    if (!token) {
      router.push("/sign-in");
      return;
    }
    try {
      const unitsData = await getUnits(token, propertyId);
      setUnits(unitsData.items);
    } catch {
      // non-blocking; leave units empty
    } finally {
      setUnitsLoading(false);
    }
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

    const result = await createLease(token, buildRequestBody(values));

    if (result.ok) {
      router.push(`/leases/${result.lease.id}`);
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
        {[1, 2, 3, 4].map((i) => (
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
          Failed to load the lease form. Please try again.
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
    const isProperty = loadState.missing === "property";
    return (
      <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
        <p className="text-sm text-slate-500 mb-1">
          You need at least one {isProperty ? "property and unit" : "tenant"}{" "}
          before creating a lease.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          {isProperty
            ? "Add a property and a unit first."
            : "Add a tenant first."}
        </p>
        <button
          onClick={() => router.push(isProperty ? "/properties/new" : "/tenants/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          {isProperty ? "Add property" : "Add tenant"}
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
          id="propertyId"
          label="Property *"
          value={values.propertyId}
          onChange={(v) => void handlePropertyChange(v)}
          error={fieldErrors.propertyId}
          disabled={isSubmitting}
          placeholder="Select a property"
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
        />

        <Select
          id="unitId"
          label="Unit *"
          value={values.unitId}
          onChange={(v) => setField("unitId", v)}
          error={fieldErrors.unitId}
          disabled={isSubmitting || !values.propertyId || unitsLoading}
          placeholder={
            !values.propertyId
              ? "Select a property first"
              : unitsLoading
                ? "Loading units…"
                : units.length === 0
                  ? "No units in this property"
                  : "Select a unit"
          }
          options={units.map((u) => ({
            value: u.id,
            label: `Unit ${u.unitNumber} (${u.status})`,
          }))}
        />

        <Select
          id="tenantContactId"
          label="Tenant *"
          value={values.tenantContactId}
          onChange={(v) => setField("tenantContactId", v)}
          error={fieldErrors.tenantContactId}
          disabled={isSubmitting}
          placeholder="Select a tenant"
          options={contacts.map((c) => ({
            value: c.id,
            label: `${c.firstName} ${c.lastName} (${c.email})`,
          }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="startDate"
            label="Start date *"
            type="date"
            value={values.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
            error={fieldErrors.startDate}
            disabled={isSubmitting}
          />
          <Input
            id="endDate"
            label="End date *"
            type="date"
            value={values.endDate}
            onChange={(e) => setField("endDate", e.target.value)}
            error={fieldErrors.endDate}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="monthlyRent"
            label="Monthly rent *"
            type="number"
            value={values.monthlyRent}
            onChange={(e) => setField("monthlyRent", e.target.value)}
            error={fieldErrors.monthlyRent}
            disabled={isSubmitting}
          />
          <Input
            id="depositAmount"
            label="Deposit amount"
            type="number"
            value={values.depositAmount}
            onChange={(e) => setField("depositAmount", e.target.value)}
            error={fieldErrors.depositAmount}
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
          {isSubmitting ? "Saving…" : "Create lease"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push("/leases")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface SelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  error?: string;
  disabled?: boolean;
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:bg-slate-50",
          error ? "border-red-500 focus:ring-red-500" : "border-slate-300",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
