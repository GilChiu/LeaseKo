import { Module } from "@nestjs/common";
import { SystemController } from "./presentation/system.controller";

@Module({
  controllers: [SystemController],
})
export class SystemModule {}
