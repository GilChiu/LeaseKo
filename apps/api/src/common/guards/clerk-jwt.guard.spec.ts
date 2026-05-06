import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClerkJwtGuard } from "./clerk-jwt.guard";
import { VerifyClerkTokenUseCase } from "../../modules/auth/application/verify-clerk-token.use-case";
import { IRequestContext } from "../types/request-context.type";

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------

function createMockContext(options: {
  authorization?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  extraHeaders?: Record<string, string>;
}): ExecutionContext & { getRequest: () => Record<string, unknown> } {
  const mockRequest: Record<string, unknown> = {
    headers: {
      ...(options.authorization !== undefined
        ? { authorization: options.authorization }
        : {}),
      ...(options.extraHeaders ?? {}),
    },
    body: options.body ?? {},
    query: options.query ?? {},
  };

  const ctx = {
    switchToHttp: () => ({ getRequest: () => mockRequest }),
    getHandler: () => ({}),
    getClass: () => ({}),
    getRequest: () => mockRequest,
  } as unknown as ExecutionContext & { getRequest: () => Record<string, unknown> };

  return ctx;
}

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

let guard: ClerkJwtGuard;
let mockReflector: { getAllAndOverride: jest.Mock };
let mockVerifyClerkToken: { execute: jest.Mock };

beforeEach(() => {
  mockReflector = { getAllAndOverride: jest.fn() };
  mockVerifyClerkToken = { execute: jest.fn() };
  guard = new ClerkJwtGuard(
    mockReflector as unknown as Reflector,
    mockVerifyClerkToken as unknown as VerifyClerkTokenUseCase,
  );
});

// ---------------------------------------------------------------------------
// Helper: configure reflector for a plain protected route (no special decorators)
// ---------------------------------------------------------------------------
function setProtectedRoute(): void {
  mockReflector.getAllAndOverride
    .mockReturnValueOnce(false) // IS_PUBLIC_KEY
    .mockReturnValueOnce(false) // IS_USER_ONLY_KEY
    .mockReturnValueOnce(false); // IS_TENANT_REQUIRED_KEY
}

// ---------------------------------------------------------------------------
// US1 — ClerkJwtGuard unit tests
// ---------------------------------------------------------------------------

describe("ClerkJwtGuard", () => {
  // -------------------------------------------------------------------------
  // @Public() route
  // -------------------------------------------------------------------------

  describe("@Public() route", () => {
    it("returns true without calling the token verifier", async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(true); // IS_PUBLIC_KEY
      const ctx = createMockContext({});

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(mockVerifyClerkToken.execute).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Missing / malformed Authorization header
  // -------------------------------------------------------------------------

  describe("missing Authorization header", () => {
    it("throws UnauthorizedException", async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false); // IS_PUBLIC_KEY
      const ctx = createMockContext({});

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("malformed Authorization header — no Bearer prefix", () => {
    it("throws UnauthorizedException", async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false);
      const ctx = createMockContext({ authorization: "token123" });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("malformed Authorization header — Basic prefix", () => {
    it("throws UnauthorizedException", async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false);
      const ctx = createMockContext({ authorization: "Basic abc123" });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("empty token after Bearer prefix", () => {
    it("throws UnauthorizedException (empty string is falsy)", async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false);
      const ctx = createMockContext({ authorization: "Bearer " });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // Invalid token
  // -------------------------------------------------------------------------

  describe("invalid Bearer token", () => {
    it("verifier throws, guard propagates UnauthorizedException", async () => {
      mockReflector.getAllAndOverride.mockReturnValueOnce(false);
      mockVerifyClerkToken.execute.mockRejectedValue(new UnauthorizedException());
      const ctx = createMockContext({ authorization: "Bearer invalid-test-token" });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      expect(mockVerifyClerkToken.execute).toHaveBeenCalledWith("invalid-test-token");
    });
  });

  // -------------------------------------------------------------------------
  // Valid token — request.user attachment
  // -------------------------------------------------------------------------

  describe("valid Bearer token", () => {
    it("returns true and attaches request.user with userId, tenantId and role: null", async () => {
      setProtectedRoute();
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      const ctx = createMockContext({ authorization: "Bearer valid-test-token" });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user).toEqual<IRequestContext>({
        userId: "user_test_123",
        tenantId: "org_test_123",
        role: null,
      });
    });
  });

  // -------------------------------------------------------------------------
  // @UserOnly() — tenant not required
  // -------------------------------------------------------------------------

  describe("@UserOnly() route with null tenantId", () => {
    it("returns true — tenant not required for user-only routes", async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(true); // IS_USER_ONLY_KEY → short-circuit
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: null,
      });
      const ctx = createMockContext({ authorization: "Bearer valid-test-token" });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // @RequiresTenant()
  // -------------------------------------------------------------------------

  describe("@RequiresTenant() route", () => {
    it("throws ForbiddenException when tenantId is null", async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(false) // IS_USER_ONLY_KEY
        .mockReturnValueOnce(true); // IS_TENANT_REQUIRED_KEY
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: null,
      });
      const ctx = createMockContext({ authorization: "Bearer valid-test-token" });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it("returns true when tenantId is present", async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(false) // IS_USER_ONLY_KEY
        .mockReturnValueOnce(true); // IS_TENANT_REQUIRED_KEY
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      const ctx = createMockContext({ authorization: "Bearer valid-test-token" });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // US2 — Tenant injection prevention
  // -------------------------------------------------------------------------

  describe("tenant injection prevention", () => {
    it("ignores tenantId in request body — request.user.tenantId comes from JWT only", async () => {
      setProtectedRoute();
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
        body: { tenantId: "org_evil_456" },
      });

      await guard.canActivate(ctx);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user.tenantId).toBe("org_test_123");
    });

    it("ignores tenantId in query params — request.user.tenantId comes from JWT only", async () => {
      setProtectedRoute();
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
        query: { tenantId: "org_evil_456" },
      });

      await guard.canActivate(ctx);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user.tenantId).toBe("org_test_123");
    });

    it("ignores tenantId in x-tenant-id header — request.user.tenantId comes from JWT only", async () => {
      setProtectedRoute();
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
        extraHeaders: { "x-tenant-id": "org_evil_456" },
      });

      await guard.canActivate(ctx);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user.tenantId).toBe("org_test_123");
    });
  });
});
