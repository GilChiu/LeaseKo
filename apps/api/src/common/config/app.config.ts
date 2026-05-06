import { registerAs } from "@nestjs/config";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
}

export const appConfig = registerAs(
  "app",
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: parseInt(process.env.PORT ?? "3001", 10),
    frontendUrl: process.env.FRONTEND_URL!,
  }),
);
