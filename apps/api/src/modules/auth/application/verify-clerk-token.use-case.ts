import { Injectable } from "@nestjs/common";
import { ClerkTokenVerifierService } from "../infrastructure/clerk-token-verifier.service";

@Injectable()
export class VerifyClerkTokenUseCase {
  constructor(private readonly verifier: ClerkTokenVerifierService) {}

  async execute(
    token: string,
  ): Promise<{ userId: string; tenantId: string | null }> {
    return this.verifier.verify(token);
  }
}
