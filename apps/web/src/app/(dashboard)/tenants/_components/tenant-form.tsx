"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createContact,
  updateContact,
  type ContactRequest,
} from "@/lib/contacts-api";
import type { TenantContact } from "@/lib/types";

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  notes: string;
}

type FormFieldErrors = Partial<Record<keyof FormValues, string>>;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; generalError: string | null };

function initialValues(contact?: TenantContact): FormValues {
  return {
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    idNumber: contact?.idNumber ?? "",
    notes: contact?.notes ?? "",
  };
}

function validateForm(values: FormValues): FormFieldErrors {
  const errors: FormFieldErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "First name is required";
  } else if (values.firstName.length > 100) {
    errors.firstName = "Must be 100 characters or fewer";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Last name is required";
  } else if (values.lastName.length > 100) {
    errors.lastName = "Must be 100 characters or fewer";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address";
  } else if (values.email.length > 255) {
    errors.email = "Must be 255 characters or fewer";
  }

  if (values.phone.length > 30) {
    errors.phone = "Must be 30 characters or fewer";
  }

  if (values.idNumber.length > 50) {
    errors.idNumber = "Must be 50 characters or fewer";
  }

  if (values.notes.length > 1000) {
    errors.notes = "Must be 1000 characters or fewer";
  }

  return errors;
}

function buildRequestBody(values: FormValues): ContactRequest {
  const body: ContactRequest = {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
  };
  if (values.phone.trim()) body.phone = values.phone;
  if (values.idNumber.trim()) body.idNumber = values.idNumber;
  if (values.notes.trim()) body.notes = values.notes;
  return body;
}

interface Props {
  /** When provided, the form edits this contact; otherwise it creates a new one. */
  initial?: TenantContact;
  /** Where to go after a successful save. Defaults to /tenants. */
  onSuccess?: (contact: TenantContact) => void;
  onCancel?: () => void;
}

export function TenantForm({ initial, onSuccess, onCancel }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initialValues(initial));
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const isEdit = Boolean(initial);

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

    const body = buildRequestBody(values);
    const result = isEdit
      ? await updateContact(token, initial!.id, body)
      : await createContact(token, body);

    if (result.ok) {
      if (onSuccess) {
        onSuccess(result.contact);
      } else {
        router.push("/tenants");
      }
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
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="firstName"
            label="First name *"
            value={values.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            error={fieldErrors.firstName}
            disabled={isSubmitting}
          />
          <Input
            id="lastName"
            label="Last name *"
            value={values.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            error={fieldErrors.lastName}
            disabled={isSubmitting}
          />
        </div>

        <Input
          id="email"
          label="Email *"
          type="email"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          error={fieldErrors.email}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="phone"
            label="Phone"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            error={fieldErrors.phone}
            disabled={isSubmitting}
          />
          <Input
            id="idNumber"
            label="ID number"
            value={values.idNumber}
            onChange={(e) => setField("idNumber", e.target.value)}
            error={fieldErrors.idNumber}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="notes"
            className="text-sm font-medium text-slate-700"
          >
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
          {isSubmitting
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Save tenant"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              router.push("/tenants");
            }
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
