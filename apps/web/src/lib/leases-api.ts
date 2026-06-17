import { apiFetch } from "./api";
import { API_URL } from "./env";
import type { Lease, LeaseStatus, PagedLeases } from "./types";

export interface CreateLeaseRequest {
  propertyId: string;
  unitId: string;
  tenantContactId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount?: number;
  notes?: string;
}

export type CreateLeaseResult =
  | { ok: true; lease: Lease }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
      generalError: string | null;
      status: number;
    };

export type GetLeaseResult =
  | { ok: true; lease: Lease }
  | { ok: false; status: number; message: string };

export type LeaseActionResult =
  | { ok: true; lease: Lease }
  | { ok: false; status: number; message: string };

interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      fields?: Array<{ field: string; messages: string[] }>;
    };
  };
}

const LEASE_FORM_FIELDS = new Set([
  "propertyId",
  "unitId",
  "tenantContactId",
  "startDate",
  "endDate",
  "monthlyRent",
  "depositAmount",
  "notes",
]);

export async function getLeases(
  token: string,
  options: { page?: number; limit?: number; status?: LeaseStatus } = {},
): Promise<PagedLeases> {
  const { page = 1, limit = 50, status } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  return apiFetch<PagedLeases>(`/leases?${params.toString()}`, { token });
}

export async function getLeaseById(
  token: string,
  id: string,
): Promise<GetLeaseResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/leases/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Network error — please check your connection.",
    };
  }

  if (response.ok) {
    const lease = (await response.json()) as Lease;
    return { ok: true, lease };
  }

  let message = response.statusText;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // leave as statusText
  }

  return { ok: false, status: response.status, message };
}

export async function createLease(
  token: string,
  data: CreateLeaseRequest,
): Promise<CreateLeaseResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/leases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  } catch {
    return {
      ok: false,
      fieldErrors: {},
      generalError:
        "Network error — please check your connection and try again.",
      status: 0,
    };
  }

  if (response.ok) {
    const lease = (await response.json()) as Lease;
    return { ok: true, lease };
  }

  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    return {
      ok: false,
      fieldErrors: {},
      generalError: response.statusText || "An unexpected error occurred.",
      status: response.status,
    };
  }

  const errorMessage = body?.error?.message ?? "An unexpected error occurred.";

  // 404 = a referenced property/unit/tenant no longer exists or is inaccessible
  if (response.status === 404) {
    return {
      ok: false,
      fieldErrors: {},
      generalError:
        "The selected property, unit, or tenant is no longer available. Please refresh and try again.",
      status: response.status,
    };
  }

  const serverFields = body?.error?.details?.fields ?? [];
  const fieldErrors: Record<string, string[]> = {};
  const unknownMessages: string[] = [];

  for (const { field, messages } of serverFields) {
    if (field === "_" || !LEASE_FORM_FIELDS.has(field)) {
      unknownMessages.push(...messages);
    } else {
      fieldErrors[field] = messages;
    }
  }

  let generalError: string | null = null;
  if (serverFields.length === 0) {
    generalError = errorMessage;
  } else if (unknownMessages.length > 0) {
    generalError = unknownMessages.join(" ");
  }

  return { ok: false, fieldErrors, generalError, status: response.status };
}

async function transitionLease(
  token: string,
  id: string,
  action: "activate" | "expire" | "terminate",
): Promise<LeaseActionResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/leases/${id}/${action}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Network error — please check your connection.",
    };
  }

  if (response.ok) {
    const lease = (await response.json()) as Lease;
    return { ok: true, lease };
  }

  let message = response.statusText;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // leave as statusText
  }

  return { ok: false, status: response.status, message };
}

export async function activateLease(
  token: string,
  id: string,
): Promise<LeaseActionResult> {
  return transitionLease(token, id, "activate");
}

export async function expireLease(
  token: string,
  id: string,
): Promise<LeaseActionResult> {
  return transitionLease(token, id, "expire");
}

export async function terminateLease(
  token: string,
  id: string,
): Promise<LeaseActionResult> {
  return transitionLease(token, id, "terminate");
}
