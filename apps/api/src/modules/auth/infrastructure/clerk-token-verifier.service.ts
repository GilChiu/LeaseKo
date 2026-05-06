import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";
import type { ClerkConfig } from "../../../common/config/clerk.config";

@Injectable()
export class ClerkTokenVerifierService {
  constructor(private readonly config: ConfigService) {}

  async verify(
    token: string,
  ): Promise<{ userId: string; tenantId: string | null }> {
    try {
      const clerkConf = this.config.getOrThrow<ClerkConfig>("clerk");
      const payload = await verifyToken(token, {
        secretKey: clerkConf.secretKey,
        ...(clerkConf.issuer && { issuer: clerkConf.issuer }),
        ...(clerkConf.audience && { audience: clerkConf.audience }),
      });
      if (!payload.sub) {
        throw new UnauthorizedException();
      }
      // Clerk v2 JWT compact format: org context is in the 'o' claim object.
      // o.id = organization ID (e.g. "org_..."), absent when no active org session.
      const orgClaim = (
        payload as Record<string, Record<string, string> | undefined>
      ).o;
      const tenantId = orgClaim?.id ?? null;
      return { userId: payload.sub, tenantId };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
