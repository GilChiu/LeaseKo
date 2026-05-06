import {
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
} from "@prisma/client/runtime/library";
import { HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes";

interface MappedPrismaError {
  status: number;
  code: ErrorCode;
  message: string;
}

export function mapPrismaError(error: unknown): MappedPrismaError | null {
  if (error instanceof PrismaClientInitializationError) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: "The database is temporarily unavailable",
    };
  }

  if (!(error instanceof PrismaClientKnownRequestError)) {
    return null;
  }

  switch (error.code) {
    case "P2002":
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message: "A record with this value already exists",
      };
    case "P2025":
      return {
        status: HttpStatus.NOT_FOUND,
        code: ErrorCode.NOT_FOUND,
        message: "The requested resource was not found",
      };
    case "P2003":
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message:
          "Referenced resource does not exist or a constraint was violated",
      };
    default:
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "A database error occurred",
      };
  }
}
