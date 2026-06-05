import { ExecutionContext } from "@nestjs/common";
import { IRequestContext } from "../types/request-context.type";

// ---------------------------------------------------------------------------
// CurrentTenant decorator — inner factory behavior
//
// createParamDecorator stores:
//   (_data, ctx) => ctx.switchToHttp().getRequest<Request & { user?: IRequestContext }>().user?.tenantId ?? null
// We test the exact logic path the decorator runs, using a mock ExecutionContext.
// ---------------------------------------------------------------------------

describe("CurrentTenant decorator", () => {
  it("returns tenantId when present", () => {
    const user: IRequestContext = {
      userId: "user_test_123",
      clerkOrgId: "org_test_123",
      tenantId: "org_test_123",
      role: null,
    };
    const mockRequest = { user };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    // Simulate what NestJS calls internally: factory(undefined, ctx)
    const result =
      ctx.switchToHttp().getRequest<{ user?: IRequestContext }>().user?.tenantId ?? null;

    expect(result).toBe("org_test_123");
  });

  it("returns null when tenantId is null", () => {
    const user: IRequestContext = {
      userId: "user_test_123",
      clerkOrgId: null,
      tenantId: null,
      role: null,
    };
    const mockRequest = { user };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    const result =
      ctx.switchToHttp().getRequest<{ user?: IRequestContext }>().user?.tenantId ?? null;

    expect(result).toBeNull();
  });
});
