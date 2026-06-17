import { apiFetch } from "./api";
import { API_URL } from "./env";
import type { PagedContacts, TenantContact } from "./types";

export interface ContactRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  idNumber?: string;
  notes?: string;
}

export type ContactResult =
  | { ok: true; contact: TenantContact }
  | {
      ok: false;
      fieldErrors: Record<string, string[]>;
      generalError: string | null;
      status: number;
    };

export type GetContactResult =
  | { ok: true; contact: TenantContact }
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

const CONTACT_FORM_FIELDS = new Set([
  "firstName",
  "lastName",
  "email",
  "phone",
  "idNumber",
  "notes",
]);

export async function getContacts(
  token: string,
  page = 1,
  limit = 50,
): Promise<PagedContacts> {
  return apiFetch<PagedContacts>(`/contacts?page=${page}&limit=${limit}`, {
    token,
  });
}

export async function getContactById(
  token: string,
  id: string,
): Promise<GetContactResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/contacts/${id}`, {
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
    const contact = (await response.json()) as TenantContact;
    return { ok: true, contact };
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

async function mutateContact(
  url: string,
  method: "POST" | "PATCH",
  token: string,
  data: ContactRequest | Partial<ContactRequest>,
): Promise<ContactResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
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
    const contact = (await response.json()) as TenantContact;
    return { ok: true, contact };
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

  const errorCode = body?.error?.code ?? "";
  const errorMessage = body?.error?.message ?? "An unexpected error occurred.";

  // 409 Conflict = duplicate email — show as field-level error
  if (errorCode === "CONFLICT" || response.status === 409) {
    return {
      ok: false,
      fieldErrors: { email: [errorMessage] },
      generalError: null,
      status: response.status,
    };
  }

  const serverFields = body?.error?.details?.fields ?? [];
  const fieldErrors: Record<string, string[]> = {};
  const unknownMessages: string[] = [];

  for (const { field, messages } of serverFields) {
    if (field === "_" || !CONTACT_FORM_FIELDS.has(field)) {
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

export async function createContact(
  token: string,
  data: ContactRequest,
): Promise<ContactResult> {
  return mutateContact(`${API_URL}/api/v1/contacts`, "POST", token, data);
}

export async function updateContact(
  token: string,
  id: string,
  data: Partial<ContactRequest>,
): Promise<ContactResult> {
  return mutateContact(`${API_URL}/api/v1/contacts/${id}`, "PATCH", token, data);
}

export async function archiveContact(
  token: string,
  id: string,
): Promise<{ ok: boolean; status: number }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/contacts/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return { ok: false, status: 0 };
  }
  return { ok: response.ok, status: response.status };
}
