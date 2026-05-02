import { Module } from "@nestjs/common";
import { TenantContextController } from "./presentation/tenant-context.controller";

@Module({
  controllers: [TenantContextController],
})
export class TenantContextModule {}
