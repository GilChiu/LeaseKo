import { Module } from '@nestjs/common';

/**
 * AuthModule — Bounded context: Identity & Authentication
 *
 * Epic 2 (Clerk Integration) will populate this module with:
 * - domain/: AuthUser entity, token value objects
 * - application/: VerifyTokenUseCase, GetCurrentUserUseCase
 * - infrastructure/: ClerkJwtStrategy, ClerkWebhookAdapter
 * - presentation/: JwtAuthGuard, ClerkJwtGuard
 *
 * Architecture rules:
 * - ClerkJwtGuard populates IRequestContext on every protected request
 * - tenantId MUST come from the verified JWT — never from request body
 * - No direct Prisma access outside the infrastructure/ layer
 */
@Module({})
export class AuthModule {}
