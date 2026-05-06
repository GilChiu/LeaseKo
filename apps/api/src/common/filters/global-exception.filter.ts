import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ErrorCode } from "../errors/error-codes";
import { mapPrismaError } from "../errors/prisma-error.mapper";
import type { ApiErrorDetails } from "../types/api-error-response.interface";

function defaultErrorCode(status: number): ErrorCode {
  const map: Record<number, ErrorCode> = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    500: ErrorCode.INTERNAL_SERVER_ERROR,
    503: ErrorCode.SERVICE_UNAVAILABLE,
  };
  return (
    map[status] ??
    (status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST)
  );
}

function parseValidationMessages(messages: string[]): ApiErrorDetails {
  const fieldMap = new Map<string, string[]>();
  for (const msg of messages) {
    const spaceIdx = msg.indexOf(" ");
    if (spaceIdx === -1) {
      const existing = fieldMap.get("_") ?? [];
      fieldMap.set("_", [...existing, msg]);
    } else {
      const field = msg.substring(0, spaceIdx);
      const constraint = msg.substring(spaceIdx + 1);
      const existing = fieldMap.get(field) ?? [];
      fieldMap.set(field, [...existing, constraint]);
    }
  }
  return {
    fields: Array.from(fieldMap.entries()).map(([field, messages]) => ({
      field,
      messages,
    })),
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly nodeEnv: string) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const path = request.url;
    const timestamp = new Date().toISOString();

    let status: number;
    let code: ErrorCode;
    let message: string;
    let details: ApiErrorDetails | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const body =
        typeof exceptionResponse === "object" && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>)
          : {};

      if (Array.isArray(body["message"])) {
        code = ErrorCode.VALIDATION_ERROR;
        message = "Validation failed";
        details = parseValidationMessages(body["message"] as string[]);
      } else if (
        typeof body["code"] === "string" &&
        body["code"].length > 0
      ) {
        code = body["code"] as ErrorCode;
        message =
          typeof body["message"] === "string"
            ? body["message"]
            : exception.message;
      } else {
        code = defaultErrorCode(status);
        message =
          typeof body["message"] === "string"
            ? body["message"]
            : typeof exceptionResponse === "string"
              ? exceptionResponse
              : exception.message;
      }
    } else {
      const prismaResult = mapPrismaError(exception);
      if (prismaResult !== null) {
        status = prismaResult.status;
        code = prismaResult.code;
        message = prismaResult.message;
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        code = ErrorCode.INTERNAL_SERVER_ERROR;
        message =
          this.nodeEnv === "production"
            ? "An unexpected error occurred"
            : exception instanceof Error
              ? exception.message
              : String(exception);

        this.logger.error(
          `Unhandled exception: ${request.method} ${path} → ${status}`,
          {
            errorName:
              exception instanceof Error ? exception.name : typeof exception,
            errorMessage:
              exception instanceof Error ? exception.message : String(exception),
          },
        );
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        statusCode: status,
        timestamp,
        path,
        ...(details !== undefined && { details }),
      },
    });
  }
}
