import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClerkJwtGuard } from "./clerk-jwt.guard";
import { VerifyClerkTokenUseCase } from "../../modules/auth/application/verify-clerk-token.use-case";
import { TenantRepository } from "../../modules/tenants/application/repositories/tenant.repository";
import { TenantUserRepository } from "../../modules/tenant-portal/application/repositories/tenant-user.repository";
import { IRequestContext } from "../types/request-context.type";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { IS_USER_ONLY_KEY } from "../decorators/user-only.decorator";
import { IS_TENANT_REQUIRED_KEY } from "../decorators/requires-tenant.decorator";
import { IS_TENANT_PORTAL_KEY } from "../decorators/tenant-portal.decorator";

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
  } as unknown as ExecutionContext & {
    getRequest: () => Record<string, unknown>;
  };

  return ctx;
}

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

let guard: ClerkJwtGuard;
let mockReflector: { getAllAndOverride: jest.Mock };
let mockVerifyClerkToken: { execute: jest.Mock };
let mockTenantRepository: { findByClerkOrgId: jest.Mock };
let mockTenantUserRepository: { findActiveByClerkUserId: jest.Mock };

const MOCK_INTERNAL_TENANT_ID = "internal-uuid-tenant-123";

// Key-based reflector configuration so call order/count is irrelevant.
function setMetadata(meta: Record<string, boolean>): void {
  mockReflector.getAllAndOverride.mockImplementation(
    (key: string) => meta[key] ?? false,
  );
}

function mockTenantFound(clerkOrgId: string): void {
  mockTenantRepository.findByClerkOrgId.mockResolvedValue({
    id: MOCK_INTERNAL_TENANT_ID,
    clerkOrgId,
    name: "Test Org",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function mockTenantNotFound(): void {
  mockTenantRepository.findByClerkOrgId.mockResolvedValue(null);
}

beforeEach(() => {
  mockReflector = { getAllAndOverride: jest.fn(() => false) };
  mockVerifyClerkToken = { execute: jest.fn() };
  mockTenantRepository = { findByClerkOrgId: jest.fn() };
  mockTenantUserRepository = {
    findActiveByClerkUserId: jest.fn().mockResolvedValue(null),
  };
  guard = new ClerkJwtGuard(
    mockReflector as unknown as Reflector,
    mockVerifyClerkToken as unknown as VerifyClerkTokenUseCase,
    mockTenantRepository as unknown as TenantRepository,
    mockTenantUserRepository as unknown as TenantUserRepository,
  );
});

describe("ClerkJwtGuard", () => {
  describe("@Public() route", () => {
    it("returns true without calling the token verifier", async () => {
      setMetadata({ [IS_PUBLIC_KEY]: true });
      const ctx = createMockContext({});

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(mockVerifyClerkToken.execute).not.toHaveBeenCalled();
    });
  });

  describe("missing / malformed Authorization header", () => {
    it("throws UnauthorizedException when missing", async () => {
      setMetadata({});
      const ctx = createMockContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException without Bearer prefix", async () => {
      setMetadata({});
      const ctx = createMockContext({ authorization: "token123" });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException for empty token after Bearer", async () => {
      setMetadata({});
      const ctx = createMockContext({ authorization: "Bearer " });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("invalid Bearer token", () => {
    it("propagates UnauthorizedException from the verifier", async () => {
      setMetadata({});
      mockVerifyClerkToken.execute.mockRejectedValue(
        new UnauthorizedException(),
      );
      const ctx = createMockContext({
        authorization: "Bearer invalid-test-token",
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockVerifyClerkToken.execute).toHaveBeenCalledWith(
        "invalid-test-token",
      );
    });
  });

  describe("landlord (org-derived) context", () => {
    it("attaches a landlord context with the resolved internal tenantId", async () => {
      setMetadata({});
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      mockTenantFound("org_test_123");
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user).toEqual<IRequestContext>({
        userId: "user_test_123",
        clerkOrgId: "org_test_123",
        tenantId: MOCK_INTERNAL_TENANT_ID,
        tenantContactId: null,
        role: "landlord",
      });
      expect(
        mockTenantUserRepository.findActiveByClerkUserId,
      ).not.toHaveBeenCalled();
    });

    it("resolves tenantId/role to null when the org has no Tenant row", async () => {
      setMetadata({});
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_unregistered",
      });
      mockTenantNotFound();
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user.tenantId).toBeNull();
      expect(req.user.role).toBeNull();
    });
  });

  describe("tenant portal (renter) context", () => {
    it("resolves a no-org JWT with an active TenantUser to a tenant_user context", async () => {
      setMetadata({});
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_renter",
        tenantId: null,
      });
      mockTenantUserRepository.findActiveByClerkUserId.mockResolvedValue({
        tenantId: MOCK_INTERNAL_TENANT_ID,
        tenantContactId: "contact_1",
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user.role).toBe("tenant_user");
      expect(req.user.tenantId).toBe(MOCK_INTERNAL_TENANT_ID);
      expect(req.user.tenantContactId).toBe("contact_1");
      expect(mockTenantRepository.findByClerkOrgId).not.toHaveBeenCalled();
    });
  });

  describe("@UserOnly() route", () => {
    it("returns true for an authenticated user without any tenant context", async () => {
      setMetadata({ [IS_USER_ONLY_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: null,
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  describe("@RequiresTenant() route (landlord-only)", () => {
    it("throws ForbiddenException when the JWT has no active org", async () => {
      setMetadata({ [IS_TENANT_REQUIRED_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: null,
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it("throws ForbiddenException when the org has no Tenant row", async () => {
      setMetadata({ [IS_TENANT_REQUIRED_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_unregistered",
      });
      mockTenantNotFound();
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it("returns true for a landlord with a registered Tenant", async () => {
      setMetadata({ [IS_TENANT_REQUIRED_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      mockTenantFound("org_test_123");
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it("rejects a tenant_user even though they have a tenantId (isolation)", async () => {
      setMetadata({ [IS_TENANT_REQUIRED_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_renter",
        tenantId: null,
      });
      mockTenantUserRepository.findActiveByClerkUserId.mockResolvedValue({
        tenantId: MOCK_INTERNAL_TENANT_ID,
        tenantContactId: "contact_1",
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("@TenantPortal() route (renter-only)", () => {
    it("allows a tenant_user", async () => {
      setMetadata({ [IS_TENANT_PORTAL_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_renter",
        tenantId: null,
      });
      mockTenantUserRepository.findActiveByClerkUserId.mockResolvedValue({
        tenantId: MOCK_INTERNAL_TENANT_ID,
        tenantContactId: "contact_1",
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it("rejects a landlord", async () => {
      setMetadata({ [IS_TENANT_PORTAL_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      mockTenantFound("org_test_123");
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it("rejects an authenticated user with no portal account", async () => {
      setMetadata({ [IS_TENANT_PORTAL_KEY]: true });
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_nobody",
        tenantId: null,
      });
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("tenant injection prevention", () => {
    it("ignores tenantId in the request body — it comes from the JWT only", async () => {
      setMetadata({});
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      mockTenantFound("org_test_123");
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
        body: { tenantId: "org_evil_456" },
      });

      await guard.canActivate(ctx);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user.tenantId).toBe(MOCK_INTERNAL_TENANT_ID);
    });

    it("ignores tenantId in query params — it comes from the JWT only", async () => {
      setMetadata({});
      mockVerifyClerkToken.execute.mockResolvedValue({
        userId: "user_test_123",
        tenantId: "org_test_123",
      });
      mockTenantFound("org_test_123");
      const ctx = createMockContext({
        authorization: "Bearer valid-test-token",
        query: { tenantId: "org_evil_456" },
      });

      await guard.canActivate(ctx);

      const req = ctx.getRequest() as { user: IRequestContext };
      expect(req.user.tenantId).toBe(MOCK_INTERNAL_TENANT_ID);
    });
  });
});
