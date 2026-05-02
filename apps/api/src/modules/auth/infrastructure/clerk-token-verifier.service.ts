import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyToken } from "@clerk/backend";

@Injectable()
export class ClerkTokenVerifierService {
  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<string> {
    try {
      const payload = await verifyToken(token, {
        secretKey: this.config.getOrThrow<string>("CLERK_SECRET_KEY"),
      });
      if (!payload.sub) {
        throw new UnauthorizedException();
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
