import { API_URL } from "./env";
import type { Property } from "./types";

export type GetPropertyResult =
  | { ok: true; property: Property }
  | { ok: false; status: number; message: string };

export async function getPropertyById(
  token: string,
  propertyId: string,
): Promise<GetPropertyResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/properties/${propertyId}`, {
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
    const property = (await response.json()) as Property;
    return { ok: true, property };
  }

  let message = response.statusText;
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    if (body.error?.message) message = body.error.message;
  } catch {
    // leave as statusText
  }

  return { ok: false, status: response.status, message };
}

export interface CreatePropertyRequest {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  propertyType: string;
  description?: string;
}

export type CreatePropertyResult =
  | { ok: true; property: Property }
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

const FORM_FIELDS = new Set([
  "name",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "propertyType",
  "description",
]);

export async function createProperty(
  token: string,
  data: CreatePropertyRequest,
): Promise<CreatePropertyResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/properties`, {
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
    const property = (await response.json()) as Property;
    return { ok: true, property };
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
  const serverFields = body?.error?.details?.fields ?? [];

  const fieldErrors: Record<string, string[]> = {};
  const unknownMessages: string[] = [];

  for (const { field, messages } of serverFields) {
    if (field === "_" || !FORM_FIELDS.has(field)) {
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

  return {
    ok: false,
    fieldErrors,
    generalError,
    status: response.status,
  };
}
