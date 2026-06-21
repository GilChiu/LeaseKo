import { apiFetch } from "./api";
import { API_URL } from "./env";
import type {
  PagedPayments,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "./types";

export interface CreatePaymentRequest {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  recordedAt: string;
  notes?: string;
}

export type CreatePaymentResult =
  | { ok: true; payment: Payment }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
      generalError: string | null;
      status: number;
    };

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

const PAYMENT_FORM_FIELDS = new Set([
  "invoiceId",
  "amount",
  "method",
  "recordedAt",
  "notes",
]);

export async function getPayments(
  token: string,
  options: {
    page?: number;
    limit?: number;
    invoiceId?: string;
    method?: PaymentMethod;
    status?: PaymentStatus;
  } = {},
): Promise<PagedPayments> {
  const { page = 1, limit = 50, invoiceId, method, status } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (invoiceId) params.set("invoiceId", invoiceId);
  if (method) params.set("method", method);
  if (status) params.set("status", status);
  return apiFetch<PagedPayments>(`/payments?${params.toString()}`, { token });
}

export async function createPayment(
  token: string,
  data: CreatePaymentRequest,
): Promise<CreatePaymentResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/payments`, {
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
    const payment = (await response.json()) as Payment;
    return { ok: true, payment };
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

  // 404 = the referenced invoice no longer exists or is inaccessible
  if (response.status === 404) {
    return {
      ok: false,
      fieldErrors: {},
      generalError:
        "The selected invoice is no longer available. Please refresh and try again.",
      status: response.status,
    };
  }

  const serverFields = body?.error?.details?.fields ?? [];
  const fieldErrors: Record<string, string[]> = {};
  const unknownMessages: string[] = [];

  for (const { field, messages } of serverFields) {
    if (field === "_" || !PAYMENT_FORM_FIELDS.has(field)) {
      unknownMessages.push(...messages);
    } else {
      fieldErrors[field] = messages;
    }
  }

  let generalError: string | null = null;
  if (serverFields.length === 0) {
    // Business-rule errors (overpayment, invalid invoice status) arrive as a
    // plain 400 message with no field details — surface them generally.
    generalError = errorMessage;
  } else if (unknownMessages.length > 0) {
    generalError = unknownMessages.join(" ");
  }

  return { ok: false, fieldErrors, generalError, status: response.status };
}
