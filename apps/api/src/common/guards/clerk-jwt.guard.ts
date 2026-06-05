import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { IS_TENANT_REQUIRED_KEY } from "../decorators/requires-tenant.decorator";
import { IS_USER_ONLY_KEY } from "../decorators/user-only.decorator";
import { VerifyClerkTokenUseCase } from "../../modules/auth/application/verify-clerk-token.use-case";
import { IRequestContext } from "../types/request-context.type";
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from "../../modules/tenants/application/repositories/tenant.repository";

@Injectable()
export class ClerkJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifyClerkToken: VerifyClerkTokenUseCase,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const { userId, tenantId: clerkOrgId } =
      await this.verifyClerkToken.execute(token);

    // Resolve Clerk orgId → internal Tenant.id so all downstream FK references
    // use the correct internal UUID (Property.tenantId, Unit.tenantId, etc.)
    let tenantId: string | null = null;
    if (clerkOrgId) {
      const tenant =
        await this.tenantRepository.findByClerkOrgId(clerkOrgId);
      tenantId = tenant?.id ?? null;
    }

    (request as Request & { user: IRequestContext }).user = {
      userId,
      clerkOrgId,
      tenantId,
      role: null,
    };

    const isUserOnly = this.reflector.getAllAndOverride<boolean>(
      IS_USER_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isUserOnly) {
      return true;
    }

    const isTenantRequired = this.reflector.getAllAndOverride<boolean>(
      IS_TENANT_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isTenantRequired && !tenantId) {
      throw new ForbiddenException();
    }

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.slice(7);
  }
}
