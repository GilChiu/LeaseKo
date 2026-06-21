import { apiFetch } from "./api";
import { API_URL } from "./env";
import type {
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
  PagedMaintenanceRequests,
} from "./types";

export interface CreateMaintenanceRequest {
  propertyId: string;
  unitId: string;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  notes?: string;
}

export type CreateMaintenanceResult =
  | { ok: true; request: MaintenanceRequest }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
      generalError: string | null;
      status: number;
    };

export type UpdateMaintenanceStatusResult =
  | { ok: true; request: MaintenanceRequest }
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

const MAINTENANCE_FORM_FIELDS = new Set([
  "propertyId",
  "unitId",
  "title",
  "description",
  "priority",
  "notes",
]);

export async function getMaintenanceRequests(
  token: string,
  options: {
    page?: number;
    limit?: number;
    status?: MaintenanceStatus;
    priority?: MaintenancePriority;
  } = {},
): Promise<PagedMaintenanceRequests> {
  const { page = 1, limit = 50, status, priority } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  return apiFetch<PagedMaintenanceRequests>(
    `/maintenance?${params.toString()}`,
    { token },
  );
}

export async function createMaintenanceRequest(
  token: string,
  data: CreateMaintenanceRequest,
): Promise<CreateMaintenanceResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/maintenance`, {
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
    const request = (await response.json()) as MaintenanceRequest;
    return { ok: true, request };
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

  // 404 = referenced property/unit no longer exists or is inaccessible
  if (response.status === 404) {
    return {
      ok: false,
      fieldErrors: {},
      generalError:
        "The selected property or unit is no longer available. Please refresh and try again.",
      status: response.status,
    };
  }

  const serverFields = body?.error?.details?.fields ?? [];
  const fieldErrors: Record<string, string[]> = {};
  const unknownMessages: string[] = [];

  for (const { field, messages } of serverFields) {
    if (field === "_" || !MAINTENANCE_FORM_FIELDS.has(field)) {
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

export async function updateMaintenanceStatus(
  token: string,
  id: string,
  status: MaintenanceStatus,
): Promise<UpdateMaintenanceStatusResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/maintenance/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Network error — please check your connection.",
    };
  }

  if (response.ok) {
    const request = (await response.json()) as MaintenanceRequest;
    return { ok: true, request };
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
