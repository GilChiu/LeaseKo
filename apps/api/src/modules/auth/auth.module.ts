import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ClerkTokenVerifierService } from "./infrastructure/clerk-token-verifier.service";
import { VerifyClerkTokenUseCase } from "./application/verify-clerk-token.use-case";
import { ClerkJwtGuard } from "../../common/guards/clerk-jwt.guard";
import { AuthController } from "./presentation/auth.controller";

@Module({
  providers: [
    ClerkTokenVerifierService,
    VerifyClerkTokenUseCase,
    ClerkJwtGuard,
    {
      provide: APP_GUARD,
      useClass: ClerkJwtGuard,
    },
  ],
  controllers: [AuthController],
  exports: [VerifyClerkTokenUseCase],
})
export class AuthModule {}
