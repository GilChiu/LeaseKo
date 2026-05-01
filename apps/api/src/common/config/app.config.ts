export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  databaseUrl: string;
  redisUrl: string;
  clerkSecretKey: string | undefined;
  clerkJwksUrl: string | undefined;
}

export const appConfig = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  frontendUrl: process.env.FRONTEND_URL!,
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL!,
  clerkSecretKey: process.env.CLERK_SECRET_KEY || undefined,
  clerkJwksUrl: process.env.CLERK_JWKS_URL || undefined,
});
