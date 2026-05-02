import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { IRequestContext } from "../types/request-context.type";

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: IRequestContext }>();
    return request.user?.tenantId ?? null;
  },
);
