"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUnit, type CreateUnitRequest } from "@/lib/units-api";

interface AddUnitFormValues {
  unitNumber: string;
  floorArea: string;
  bedrooms: string;
  bathrooms: string;
  monthlyRent: string;
  description: string;
}

type FormFieldErrors = Partial<Record<keyof AddUnitFormValues, string>>;

type UnitSubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; generalError: string | null };

const INITIAL_VALUES: AddUnitFormValues = {
  unitNumber: "",
  floorArea: "",
  bedrooms: "",
  bathrooms: "",
  monthlyRent: "",
  description: "",
};

function validateForm(values: AddUnitFormValues): FormFieldErrors {
  const errors: FormFieldErrors = {};
  if (!values.unitNumber.trim()) {
    errors.unitNumber = "Unit number is required";
  } else if (values.unitNumber.length > 50) {
    errors.unitNumber = "Must be 50 characters or fewer";
  }
  if (values.description.length > 1000) {
    errors.description = "Must be 1000 characters or fewer";
  }
  return errors;
}

function buildUnitRequest(values: AddUnitFormValues): CreateUnitRequest {
  const body: CreateUnitRequest = { unitNumber: values.unitNumber };
  const fa = parseFloat(values.floorArea);
  if (values.floorArea.trim() && !isNaN(fa)) body.floorArea = fa;
  const bd = parseInt(values.bedrooms, 10);
  if (values.bedrooms.trim() && !isNaN(bd)) body.bedrooms = bd;
  const ba = parseFloat(values.bathrooms);
  if (values.bathrooms.trim() && !isNaN(ba)) body.bathrooms = ba;
  const mr = parseFloat(values.monthlyRent);
  if (values.monthlyRent.trim() && !isNaN(mr)) body.monthlyRent = mr;
  if (values.description.trim()) body.description = values.description;
  return body;
}

interface AddUnitFormProps {
  propertyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddUnitForm({ propertyId, onSuccess, onCancel }: AddUnitFormProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<AddUnitFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [submitState, setSubmitState] = useState<UnitSubmitState>({ status: "idle" });

  function setField(field: keyof AddUnitFormValues, value: string) {
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
    if (!token) { router.push("/sign-in"); return; }

    setSubmitState({ status: "submitting" });
    const result = await createUnit(token, propertyId, buildUnitRequest(values));

    if (result.ok) {
      onSuccess();
      return;
    }

    if (result.status === 401) { router.push("/sign-in"); return; }

    const serverFieldErrors: FormFieldErrors = {};
    for (const [field, messages] of Object.entries(result.fieldErrors)) {
      if (messages.length > 0) {
        serverFieldErrors[field as keyof AddUnitFormValues] = messages[0];
      }
    }
    setFieldErrors(serverFieldErrors);
    setSubmitState({ status: "error", generalError: result.generalError });
  }

  const isSubmitting = submitState.status === "submitting";
  const generalError = submitState.status === "error" ? submitState.generalError : null;

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
      noValidate
    >
      {generalError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{generalError}</p>
        </div>
      )}

      <div className="space-y-3">
        <Input
          id="unitNumber"
          label="Unit number *"
          value={values.unitNumber}
          onChange={(e) => setField("unitNumber", e.target.value)}
          error={fieldErrors.unitNumber}
          disabled={isSubmitting}
          placeholder="e.g. 101, A, Penthouse"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="floorArea"
            label="Floor area (m²)"
            type="number"
            min="0"
            step="0.01"
            value={values.floorArea}
            onChange={(e) => setField("floorArea", e.target.value)}
            error={fieldErrors.floorArea}
            disabled={isSubmitting}
          />
          <Input
            id="bedrooms"
            label="Bedrooms"
            type="number"
            min="1"
            step="1"
            value={values.bedrooms}
            onChange={(e) => setField("bedrooms", e.target.value)}
            error={fieldErrors.bedrooms}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="bathrooms"
            label="Bathrooms"
            type="number"
            min="0"
            step="0.5"
            value={values.bathrooms}
            onChange={(e) => setField("bathrooms", e.target.value)}
            error={fieldErrors.bathrooms}
            disabled={isSubmitting}
          />
          <Input
            id="monthlyRent"
            label="Monthly rent"
            type="number"
            min="0"
            step="0.01"
            value={values.monthlyRent}
            onChange={(e) => setField("monthlyRent", e.target.value)}
            error={fieldErrors.monthlyRent}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="unitDescription"
            className="text-sm font-medium text-slate-700"
          >
            Description
          </label>
          <textarea
            id="unitDescription"
            rows={3}
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
      </div>

      <div className="mt-4 flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save unit"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
