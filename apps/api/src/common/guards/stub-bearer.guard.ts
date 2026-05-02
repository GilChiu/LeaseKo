import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";

/**
 * @deprecated Replaced by ClerkJwtGuard (Feature 008).
 * This guard accepts any Bearer token and sets a stub user — for local
 * development only. ClerkJwtGuard is now registered as APP_GUARD in
 * AuthModule and verifies real Clerk JWTs.
 */
@Injectable()
export class StubBearerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();
    const authHeader = request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Bearer token");
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException("Missing or invalid Bearer token");
    }

    request.user = { userId: "stub_user_001", tenantId: "stub_tenant_001" };
    return true;
  }
}
