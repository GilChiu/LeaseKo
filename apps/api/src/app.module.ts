import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "./common/config/app.config";
import { databaseConfig } from "./common/config/database.config";
import { redisConfig } from "./common/config/redis.config";
import { clerkConfig } from "./common/config/clerk.config";
import { validationSchema } from "./common/config/validation.schema";
import { HealthModule } from "./modules/health/health.module";
import { SystemModule } from "./modules/system/system.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";
import { TenantContextModule } from "./modules/tenant-context/tenant-context.module";
import { DatabaseModule } from "./database/prisma/prisma.module";
import { QueuesModule } from "./queues/bullmq/bullmq.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, clerkConfig],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    HealthModule,
    SystemModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    TenantContextModule,
    DatabaseModule,
    QueuesModule,
  ],
})
export class AppModule {}
