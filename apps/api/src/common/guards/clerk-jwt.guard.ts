import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { VerifyClerkTokenUseCase } from "../../modules/auth/application/verify-clerk-token.use-case";
import { IRequestContext } from "../types/request-context.type";

@Injectable()
export class ClerkJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifyClerkToken: VerifyClerkTokenUseCase,
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

    const userId = await this.verifyClerkToken.execute(token);

    const user: IRequestContext = {
      userId,
      tenantId: null,
      role: null,
    };

    (request as Request & { user: IRequestContext }).user = user;

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
