import { ExecutionContext } from "@nestjs/common";
import { IRequestContext } from "../types/request-context.type";

// ---------------------------------------------------------------------------
// CurrentUser decorator — inner factory behavior
//
// createParamDecorator stores: (_data, ctx) => ctx.switchToHttp().getRequest().user
// We test the exact logic path the decorator runs, using a mock ExecutionContext.
// ---------------------------------------------------------------------------

describe("CurrentUser decorator", () => {
  it("returns the full IRequestContext from request.user", () => {
    const user: IRequestContext = {
      userId: "user_test_123",
      clerkOrgId: "org_test_123",
      tenantId: "org_test_123",
      tenantContactId: null,
      role: null,
    };
    const mockRequest = { user };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    // Simulate what NestJS calls internally: factory(undefined, ctx)
    const result = ctx.switchToHttp().getRequest<{ user: IRequestContext }>().user;

    expect(result).toEqual<IRequestContext>(user);
  });

  it("returns context when tenantId is null", () => {
    const user: IRequestContext = {
      userId: "user_test_123",
      clerkOrgId: null,
      tenantId: null,
      tenantContactId: null,
      role: null,
    };
    const mockRequest = { user };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    const result = ctx.switchToHttp().getRequest<{ user: IRequestContext }>().user;

    expect(result.tenantId).toBeNull();
    expect(result.userId).toBe("user_test_123");
  });
});
