import { apiFetch } from "./api";
import { API_URL } from "./env";
import type { PagedUnits, Unit } from "./types";

export interface CreateUnitRequest {
  unitNumber: string;
  floorArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  monthlyRent?: number;
  description?: string;
}

export type CreateUnitResult =
  | { ok: true; unit: Unit }
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

const UNIT_FORM_FIELDS = new Set([
  "unitNumber",
  "floorArea",
  "bedrooms",
  "bathrooms",
  "monthlyRent",
  "description",
]);

export async function getUnits(
  token: string,
  propertyId: string,
): Promise<PagedUnits> {
  return apiFetch<PagedUnits>(
    `/properties/${propertyId}/units?page=1&limit=50`,
    { token },
  );
}

export async function createUnit(
  token: string,
  propertyId: string,
  data: CreateUnitRequest,
): Promise<CreateUnitResult> {
  let response: Response;
  try {
    response = await fetch(
      `${API_URL}/api/v1/properties/${propertyId}/units`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      },
    );
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
    const unit = (await response.json()) as Unit;
    return { ok: true, unit };
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

  // 409 Conflict = duplicate unit number — show as field-level error
  if (errorCode === "CONFLICT" || response.status === 409) {
    return {
      ok: false,
      fieldErrors: { unitNumber: [errorMessage] },
      generalError: null,
      status: response.status,
    };
  }

  const serverFields = body?.error?.details?.fields ?? [];
  const fieldErrors: Record<string, string[]> = {};
  const unknownMessages: string[] = [];

  for (const { field, messages } of serverFields) {
    if (field === "_" || !UNIT_FORM_FIELDS.has(field)) {
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
