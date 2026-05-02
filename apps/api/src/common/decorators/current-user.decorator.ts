import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { IRequestContext } from "../types/request-context.type";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IRequestContext => {
    const request = ctx.switchToHttp().getRequest<{ user: IRequestContext }>();
    return request.user;
  },
);
