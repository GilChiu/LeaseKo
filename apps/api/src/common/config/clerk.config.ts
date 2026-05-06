import { registerAs } from "@nestjs/config";

export interface ClerkConfig {
  secretKey: string;
  jwksUrl: string | undefined;
  issuer: string | undefined;
  audience: string | undefined;
}

export const clerkConfig = registerAs(
  "clerk",
  (): ClerkConfig => ({
    secretKey: process.env.CLERK_SECRET_KEY!,
    jwksUrl: process.env.CLERK_JWKS_URL || undefined,
    issuer: process.env.CLERK_ISSUER || undefined,
    audience: process.env.CLERK_AUDIENCE || undefined,
  }),
);
