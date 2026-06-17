"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  archiveContact,
  getContactById,
} from "@/lib/contacts-api";
import type { TenantContact } from "@/lib/types";
import { TenantForm } from "../../_components/tenant-form";

type PageState =
  | { status: "loading" }
  | { status: "success"; contact: TenantContact }
  | { status: "not-found" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

export function TenantDetailView({ contactId }: { contactId: string }) {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [isEditing, setIsEditing] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const loadContact = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }
      const result = await getContactById(token, contactId);
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
      setState({ status: "success", contact: result.contact });
    } catch {
      setState({ status: "error-server" });
    }
  }, [getToken, contactId, router]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadContact();
  }, [isLoaded, loadContact]);

  async function handleArchive() {
    if (
      !window.confirm(
        "Archive this tenant? They will no longer appear in the active list.",
      )
    ) {
      return;
    }
    setArchiveError(null);
    setIsArchiving(true);
    const token = await getToken();
    if (!token) {
      router.push("/sign-in");
      return;
    }
    const result = await archiveContact(token, contactId);
    setIsArchiving(false);
    if (result.ok) {
      router.push("/tenants");
      return;
    }
    if (result.status === 401) {
      router.push("/sign-in");
      return;
    }
    setArchiveError("Failed to archive tenant. Please try again.");
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-4 w-72 rounded bg-slate-200 animate-pulse" />
        <div className="mt-8 h-32 rounded-lg bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-slate-500 mb-2">Tenant not found.</p>
        <p className="text-sm text-slate-400 mb-6">
          This tenant may have been archived or you don&apos;t have access to it.
        </p>
        <button
          onClick={() => router.push("/tenants")}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back to tenants
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
          Failed to load tenant. Please try again.
        </p>
        <button
          onClick={() => void loadContact()}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { contact } = state;

  return (
    <div>
      <button
        onClick={() => router.push("/tenants")}
        className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to tenants
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{contact.email}</p>
        </div>
        {!isEditing && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => void handleArchive()}
              disabled={isArchiving}
              className="inline-flex items-center rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isArchiving ? "Archiving…" : "Archive"}
            </button>
          </div>
        )}
      </div>

      {archiveError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{archiveError}</p>
        </div>
      )}

      {isEditing ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Edit tenant
          </h2>
          <TenantForm
            initial={contact}
            onSuccess={(updated) => {
              setIsEditing(false);
              setState({ status: "success", contact: updated });
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">
                {contact.phone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">ID number</dt>
              <dd className="font-medium text-slate-900">
                {contact.idNumber ?? "—"}
              </dd>
            </div>
            {contact.notes && (
              <div className="col-span-2">
                <dt className="text-slate-500">Notes</dt>
                <dd className="text-slate-700 whitespace-pre-wrap">
                  {contact.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
