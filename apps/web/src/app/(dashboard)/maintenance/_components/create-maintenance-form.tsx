"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getUnits } from "@/lib/units-api";
import {
  createMaintenanceRequest,
  type CreateMaintenanceRequest,
} from "@/lib/maintenance-api";
import type {
  MaintenancePriority,
  PagedProperties,
  Property,
  Unit,
} from "@/lib/types";

interface FormValues {
  propertyId: string;
  unitId: string;
  title: string;
  description: string;
  priority: string;
  notes: string;
}

type FormFieldErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  propertyId: "",
  unitId: "",
  title: "",
  description: "",
  priority: "",
  notes: "",
};

const PRIORITY_OPTIONS: Array<{ value: MaintenancePriority; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

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

  if (!values.propertyId) errors.propertyId = "Select a property";
  if (!values.unitId) errors.unitId = "Select a unit";
  if (!values.priority) errors.priority = "Select a priority";

  if (!values.title.trim()) {
    errors.title = "Title is required";
  } else if (values.title.length > 200) {
    errors.title = "Must be 200 characters or fewer";
  }

  if (values.description.length > 2000) {
    errors.description = "Must be 2000 characters or fewer";
  }
  if (values.notes.length > 2000) {
    errors.notes = "Must be 2000 characters or fewer";
  }

  return errors;
}

function buildRequestBody(values: FormValues): CreateMaintenanceRequest {
  const body: CreateMaintenanceRequest = {
    propertyId: values.propertyId,
    unitId: values.unitId,
    title: values.title,
    priority: values.priority as MaintenancePriority,
  };
  if (values.description.trim()) body.description = values.description;
  if (values.notes.trim()) body.notes = values.notes;
  return body;
}

export function CreateMaintenanceForm() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [properties, setProperties] = useState<Property[]>([]);
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
      const propsData = await apiFetch<PagedProperties>(
        "/properties?page=1&limit=100",
        { token },
      );
      setProperties(propsData.items);
      setLoadState(
        propsData.items.length === 0
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

    const result = await createMaintenanceRequest(
      token,
      buildRequestBody(values),
    );

    if (result.ok) {
      router.push(`/maintenance/${result.request.id}`);
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
          Failed to load the request form. Please try again.
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
          You need at least one property and unit before creating a maintenance
          request.
        </p>
        <p className="text-xs text-slate-400 mb-6">Add a property first.</p>
        <button
          onClick={() => router.push("/properties/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Add property
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

        <Input
          id="title"
          label="Title *"
          value={values.title}
          onChange={(e) => setField("title", e.target.value)}
          error={fieldErrors.title}
          disabled={isSubmitting}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor="description"
            className="text-sm font-medium text-slate-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            disabled={isSubmitting}
            className={cn(
              "resize-none rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50",
              fieldErrors.description
                ? "border-red-500 focus:ring-red-500"
                : "border-slate-300",
            )}
          />
          {fieldErrors.description && (
            <p className="text-xs text-red-600">{fieldErrors.description}</p>
          )}
        </div>

        <Select
          id="priority"
          label="Priority *"
          value={values.priority}
          onChange={(v) => setField("priority", v)}
          error={fieldErrors.priority}
          disabled={isSubmitting}
          placeholder="Select a priority"
          options={PRIORITY_OPTIONS}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
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
          {isSubmitting ? "Saving…" : "Create request"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push("/maintenance")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
