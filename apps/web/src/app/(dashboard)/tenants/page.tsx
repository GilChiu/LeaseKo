"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getContacts } from "@/lib/contacts-api";
import type { TenantContact } from "@/lib/types";
import { TenantCard } from "./_components/tenant-card";

type PageState =
  | { status: "loading" }
  | { status: "success"; items: TenantContact[]; total: number }
  | { status: "empty" }
  | { status: "error-forbidden" }
  | { status: "error-server" };

export default function TenantsPage() {
  const { isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });

  const loadTenants = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }
      const data = await getContacts(token, 1, 50);
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
  }, [getToken, router]);

  useEffect(() => {
    if (!isLoaded) return;
    void loadTenants();
  }, [isLoaded, loadTenants]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <button
          onClick={() => router.push("/tenants/new")}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Add tenant
        </button>
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
              ? `Showing ${state.items.length} of ${state.total} tenants`
              : `${state.total} ${state.total === 1 ? "tenant" : "tenants"}`}
          </p>
          <div className="flex flex-col gap-3">
            {state.items.map((contact) => (
              <TenantCard key={contact.id} contact={contact} />
            ))}
          </div>
        </div>
      )}

      {state.status === "empty" && (
        <div className="text-center py-16">
          <p className="text-base text-slate-500 mb-2">No tenants yet.</p>
          <p className="text-sm text-slate-400 mb-6">
            Add your first tenant to get started.
          </p>
          <button
            onClick={() => router.push("/tenants/new")}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Add tenant
          </button>
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
            Failed to load tenants. Please try again.
          </p>
          <button
            onClick={() => void loadTenants()}
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
