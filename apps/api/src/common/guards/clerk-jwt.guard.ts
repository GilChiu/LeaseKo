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
import { IS_TENANT_PORTAL_KEY } from "../decorators/tenant-portal.decorator";
import { IS_USER_ONLY_KEY } from "../decorators/user-only.decorator";
import { VerifyClerkTokenUseCase } from "../../modules/auth/application/verify-clerk-token.use-case";
import { IRequestContext } from "../types/request-context.type";
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from "../../modules/tenants/application/repositories/tenant.repository";
import {
  TENANT_USER_REPOSITORY,
  TenantUserRepository,
} from "../../modules/tenant-portal/application/repositories/tenant-user.repository";

@Injectable()
export class ClerkJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifyClerkToken: VerifyClerkTokenUseCase,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(TENANT_USER_REPOSITORY)
    private readonly tenantUserRepository: TenantUserRepository,
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

    // Resolve identity into one of two mutually exclusive contexts:
    //  - Landlord/staff: active Clerk org → internal Tenant.id (role 'landlord').
    //  - Tenant portal (renter): no org, but an ACTIVE TenantUser bound to this
    //    Clerk identity → its tenantId + tenantContactId (role 'tenant_user').
    let tenantId: string | null = null;
    let tenantContactId: string | null = null;
    let role: IRequestContext["role"] = null;

    if (clerkOrgId) {
      const tenant =
        await this.tenantRepository.findByClerkOrgId(clerkOrgId);
      tenantId = tenant?.id ?? null;
      if (tenantId) {
        role = "landlord";
      }
    } else {
      const tenantUser =
        await this.tenantUserRepository.findActiveByClerkUserId(userId);
      if (tenantUser) {
        tenantId = tenantUser.tenantId;
        tenantContactId = tenantUser.tenantContactId;
        role = "tenant_user";
      }
    }

    (request as Request & { user: IRequestContext }).user = {
      userId,
      clerkOrgId,
      tenantId,
      tenantContactId,
      role,
    };

    const isUserOnly = this.reflector.getAllAndOverride<boolean>(
      IS_USER_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isUserOnly) {
      return true;
    }

    const isTenantPortal = this.reflector.getAllAndOverride<boolean>(
      IS_TENANT_PORTAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isTenantPortal) {
      // Renter-only route: require an active tenant portal context.
      if (role !== "tenant_user" || !tenantId) {
        throw new ForbiddenException();
      }
      return true;
    }

    const isTenantRequired = this.reflector.getAllAndOverride<boolean>(
      IS_TENANT_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isTenantRequired) {
      // Landlord/staff route: require tenant context AND reject renters, who
      // must never reach landlord resources even though they have a tenantId.
      if (!tenantId || role === "tenant_user") {
        throw new ForbiddenException();
      }
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
