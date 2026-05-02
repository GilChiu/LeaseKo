import { SetMetadata } from "@nestjs/common";

export const IS_TENANT_REQUIRED_KEY = "isTenantRequired";
export const RequiresTenant = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_TENANT_REQUIRED_KEY, true);
