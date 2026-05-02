import { Injectable } from "@nestjs/common";
import { ClerkTokenVerifierService } from "../infrastructure/clerk-token-verifier.service";

@Injectable()
export class VerifyClerkTokenUseCase {
  constructor(private readonly verifier: ClerkTokenVerifierService) {}

  async execute(token: string): Promise<string> {
    return this.verifier.verify(token);
  }
}
