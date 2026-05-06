import { ArgumentsHost, BadRequestException, HttpException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";

function createMockHost(url: string, method = "GET"): ArgumentsHost {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockResponse = { status: mockStatus };
  const mockRequest = { method, url };
  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as unknown as ArgumentsHost;
}

function getJsonArg(host: ArgumentsHost): Record<string, unknown> {
  const response = (host.switchToHttp().getResponse() as { status: jest.Mock }).status.mock.results[0]?.value as { json: jest.Mock };
  return response.json.mock.calls[0]?.[0] as Record<string, unknown>;
}

function getStatusArg(host: ArgumentsHost): number {
  const response = host.switchToHttp().getResponse() as { status: jest.Mock };
  return response.status.mock.calls[0]?.[0] as number;
}

describe("GlobalExceptionFilter", () => {
  const devFilter = new GlobalExceptionFilter("development");
  const prodFilter = new GlobalExceptionFilter("production");

  it("HttpException 400 → BAD_REQUEST code and success: false", () => {
    const host = createMockHost("/api/v1/test");
    devFilter.catch(new HttpException("Bad input", 400), host);

    const body = getJsonArg(host);
    expect(getStatusArg(host)).toBe(400);
    expect(body["success"]).toBe(false);
    expect((body["error"] as Record<string, unknown>)["code"]).toBe("BAD_REQUEST");
    expect((body["error"] as Record<string, unknown>)["statusCode"]).toBe(400);
  });

  it("HttpException 401 → UNAUTHORIZED code", () => {
    const host = createMockHost("/api/v1/me");
    devFilter.catch(new UnauthorizedException(), host);

    const body = getJsonArg(host);
    expect(getStatusArg(host)).toBe(401);
    expect((body["error"] as Record<string, unknown>)["code"]).toBe("UNAUTHORIZED");
  });

  it("HttpException 404 → NOT_FOUND code", () => {
    const host = createMockHost("/api/v1/tenants/999");
    devFilter.catch(new NotFoundException("Tenant not found"), host);

    const body = getJsonArg(host);
    expect(getStatusArg(host)).toBe(404);
    expect((body["error"] as Record<string, unknown>)["code"]).toBe("NOT_FOUND");
    expect((body["error"] as Record<string, unknown>)["message"]).toBe("Tenant not found");
  });

  it("array message → VALIDATION_ERROR with details.fields", () => {
    const host = createMockHost("/api/v1/tenants", "POST");
    devFilter.catch(
      new BadRequestException({ message: ["name must be a string", "email must be an email"], error: "Bad Request" }),
      host,
    );

    const body = getJsonArg(host);
    const error = body["error"] as Record<string, unknown>;
    expect(getStatusArg(host)).toBe(400);
    expect(error["code"]).toBe("VALIDATION_ERROR");
    expect(error["message"]).toBe("Validation failed");

    const details = error["details"] as Record<string, unknown>;
    const fields = details["fields"] as Array<{ field: string; messages: string[] }>;
    expect(fields).toEqual(
      expect.arrayContaining([
        { field: "name", messages: ["must be a string"] },
        { field: "email", messages: ["must be an email"] },
      ]),
    );
  });

  it("unknown error in dev mode → original message included", () => {
    const host = createMockHost("/api/v1/crash");
    devFilter.catch(new Error("raw internal crash"), host);

    const body = getJsonArg(host);
    const error = body["error"] as Record<string, unknown>;
    expect(getStatusArg(host)).toBe(500);
    expect(error["code"]).toBe("INTERNAL_SERVER_ERROR");
    expect(error["message"]).toBe("raw internal crash");
  });

  it("unknown error in prod mode → generic message, no internal details", () => {
    const host = createMockHost("/api/v1/crash");
    prodFilter.catch(new Error("raw internal crash"), host);

    const body = getJsonArg(host);
    const error = body["error"] as Record<string, unknown>;
    expect(getStatusArg(host)).toBe(500);
    expect(error["code"]).toBe("INTERNAL_SERVER_ERROR");
    expect(error["message"]).toBe("An unexpected error occurred");
    expect(error["message"]).not.toContain("raw internal crash");
  });

  it("every response has success: false, timestamp, path", () => {
    const path = "/api/v1/me";
    const host = createMockHost(path);
    devFilter.catch(new UnauthorizedException(), host);

    const body = getJsonArg(host);
    expect(body["success"]).toBe(false);
    const error = body["error"] as Record<string, unknown>;
    expect(typeof error["timestamp"]).toBe("string");
    expect(error["path"]).toBe(path);
  });

  it("ForbiddenException with custom code in body → uses custom code", () => {
    const { ForbiddenException } = jest.requireActual<typeof import("@nestjs/common")>("@nestjs/common");
    const host = createMockHost("/api/v1/tenants");
    devFilter.catch(
      new ForbiddenException({ code: "TENANT_CONTEXT_REQUIRED", message: "Org context required" }),
      host,
    );

    const body = getJsonArg(host);
    const error = body["error"] as Record<string, unknown>;
    expect(getStatusArg(host)).toBe(403);
    expect(error["code"]).toBe("TENANT_CONTEXT_REQUIRED");
    expect(error["message"]).toBe("Org context required");
  });
});
