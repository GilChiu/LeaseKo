import type { ErrorCode } from "../errors/error-codes";

export interface ApiErrorDetails {
  fields?: Array<{ field: string; messages: string[] }>;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: ApiErrorDetails;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}
