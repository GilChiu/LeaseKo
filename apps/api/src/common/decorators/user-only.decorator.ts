import { SetMetadata } from "@nestjs/common";

export const IS_USER_ONLY_KEY = "isUserOnly";
export const UserOnly = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_USER_ONLY_KEY, true);
