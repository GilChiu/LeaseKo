"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProperty, type CreatePropertyRequest } from "@/lib/properties-api";

interface FormValues {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  propertyType: string;
  description: string;
}

type FormFieldErrors = Partial<Record<keyof FormValues, string>>;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; generalError: string | null };

const INITIAL_VALUES: FormValues = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  propertyType: "",
  description: "",
};

function validateForm(values: FormValues): FormFieldErrors {
  const errors: FormFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required";
  } else if (values.name.length > 120) {
    errors.name = "Name must be 120 characters or fewer";
  }

  if (!values.addressLine1.trim()) {
    errors.addressLine1 = "Address line 1 is required";
  } else if (values.addressLine1.length > 255) {
    errors.addressLine1 = "Must be 255 characters or fewer";
  }

  if (values.addressLine2.length > 255) {
    errors.addressLine2 = "Must be 255 characters or fewer";
  }

  if (!values.city.trim()) {
    errors.city = "City is required";
  } else if (values.city.length > 120) {
    errors.city = "Must be 120 characters or fewer";
  }

  if (values.state.length > 120) {
    errors.state = "Must be 120 characters or fewer";
  }

  if (values.postalCode.length > 30) {
    errors.postalCode = "Must be 30 characters or fewer";
  }

  if (!values.country.trim()) {
    errors.country = "Country is required";
  } else if (values.country.length > 120) {
    errors.country = "Must be 120 characters or fewer";
  }

  if (!values.propertyType.trim()) {
    errors.propertyType = "Property type is required";
  } else if (values.propertyType.length > 80) {
    errors.propertyType = "Must be 80 characters or fewer";
  }

  if (values.description.length > 1000) {
    errors.description = "Must be 1000 characters or fewer";
  }

  return errors;
}

function buildRequestBody(values: FormValues): CreatePropertyRequest {
  const body: CreatePropertyRequest = {
    name: values.name,
    addressLine1: values.addressLine1,
    city: values.city,
    country: values.country,
    propertyType: values.propertyType,
  };

  if (values.addressLine2.trim()) body.addressLine2 = values.addressLine2;
  if (values.state.trim()) body.state = values.state;
  if (values.postalCode.trim()) body.postalCode = values.postalCode;
  if (values.description.trim()) body.description = values.description;

  return body;
}

export function CreatePropertyForm() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

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

    const result = await createProperty(token, buildRequestBody(values));

    if (result.ok) {
      router.push("/properties");
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

    setSubmitState({
      status: "error",
      generalError: result.generalError,
    });
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
        <Input
          id="name"
          label="Property name *"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          error={fieldErrors.name}
          disabled={isSubmitting}
        />

        <Input
          id="addressLine1"
          label="Address line 1 *"
          value={values.addressLine1}
          onChange={(e) => setField("addressLine1", e.target.value)}
          error={fieldErrors.addressLine1}
          disabled={isSubmitting}
        />

        <Input
          id="addressLine2"
          label="Address line 2"
          value={values.addressLine2}
          onChange={(e) => setField("addressLine2", e.target.value)}
          error={fieldErrors.addressLine2}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="city"
            label="City *"
            value={values.city}
            onChange={(e) => setField("city", e.target.value)}
            error={fieldErrors.city}
            disabled={isSubmitting}
          />
          <Input
            id="state"
            label="State / Province"
            value={values.state}
            onChange={(e) => setField("state", e.target.value)}
            error={fieldErrors.state}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="postalCode"
            label="Postal code"
            value={values.postalCode}
            onChange={(e) => setField("postalCode", e.target.value)}
            error={fieldErrors.postalCode}
            disabled={isSubmitting}
          />
          <Input
            id="country"
            label="Country *"
            value={values.country}
            onChange={(e) => setField("country", e.target.value)}
            error={fieldErrors.country}
            disabled={isSubmitting}
          />
        </div>

        <Input
          id="propertyType"
          label="Property type *"
          value={values.propertyType}
          onChange={(e) => setField("propertyType", e.target.value)}
          error={fieldErrors.propertyType}
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
      </div>

      <div className="mt-6 flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save property"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push("/properties")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
