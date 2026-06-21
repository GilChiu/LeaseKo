import { apiFetch } from "./api";
import { API_URL } from "./env";
import type { Invoice, InvoiceStatus, PagedInvoices } from "./types";

export interface CreateInvoiceRequest {
  leaseId: string;
  dueDate: string;
  amount: number;
  notes?: string;
}

export type CreateInvoiceResult =
  | { ok: true; invoice: Invoice }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
      generalError: string | null;
      status: number;
    };

export type GetInvoiceResult =
  | { ok: true; invoice: Invoice }
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

const INVOICE_FORM_FIELDS = new Set(["leaseId", "dueDate", "amount", "notes"]);

export async function getInvoices(
  token: string,
  options: { page?: number; limit?: number; status?: InvoiceStatus } = {},
): Promise<PagedInvoices> {
  const { page = 1, limit = 50, status } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  return apiFetch<PagedInvoices>(`/invoices?${params.toString()}`, { token });
}

export async function getInvoiceById(
  token: string,
  id: string,
): Promise<GetInvoiceResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/invoices/${id}`, {
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
    const invoice = (await response.json()) as Invoice;
    return { ok: true, invoice };
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

export async function createInvoice(
  token: string,
  data: CreateInvoiceRequest,
): Promise<CreateInvoiceResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/invoices`, {
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
    const invoice = (await response.json()) as Invoice;
    return { ok: true, invoice };
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

  // 404 = the referenced lease no longer exists or is inaccessible
  if (response.status === 404) {
    return {
      ok: false,
      fieldErrors: {},
      generalError:
        "The selected lease is no longer available. Please refresh and try again.",
      status: response.status,
    };
  }

  const serverFields = body?.error?.details?.fields ?? [];
  const fieldErrors: Record<string, string[]> = {};
  const unknownMessages: string[] = [];

  for (const { field, messages } of serverFields) {
    if (field === "_" || !INVOICE_FORM_FIELDS.has(field)) {
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
