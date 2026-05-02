# Implementation Plan: Clerk JWT Verification — NestJS Backend

**Branch**: `008-clerk-jwt-nestjs` | **Date**: 2026-05-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/008-clerk-jwt-nestjs/spec.md`

## Summary

Install `@clerk/backend` and wire Clerk JWT verification into the NestJS API. The implementation creates a `ClerkTokenVerifierService` (infrastructure layer), a `VerifyClerkTokenUseCase` (application layer), and a `ClerkJwtGuard` (common guards). The guard is registered globally via `APP_GUARD` — all routes are protected by default. The `@Public()` decorator opts routes out. The `@CurrentUser()` decorator exposes the verified `IRequestContext` in controllers. A `GET /me` endpoint returns `{ userId }` from the verified token with no database lookup.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS, NestJS 10
**Primary Dependencies**: `@clerk/backend` (Clerk server-side JWT verification SDK)
**Storage**: N/A — no database access in this feature
**Testing**: `pnpm typecheck`, `pnpm lint`, `pnpm build` + manual curl/Swagger verification
**Target Platform**: NestJS on Node.js (server, HTTP)
**Project Type**: Backend authentication middleware
**Performance Goals**: `GET /me` with valid JWT responds in < 100ms; `401` responses in < 50ms
**Constraints**: `@clerk/backend` v5-compatible API; no Prisma access; no roles/permissions; no tenant extraction
**Scale/Scope**: `apps/api` only; 9 files created or updated

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  > `ClerkTokenVerifierService` → infrastructure. `VerifyClerkTokenUseCase` → application. `AuthController` → presentation. Domain layer has no domain entities yet (auth has no domain rules beyond identity in this feature) — acceptable for this scope.
- [x] Domain layer imports no NestJS or Prisma packages
  > No domain layer files introduced. Auth module domain layer remains empty — correct for a pure infrastructure auth feature.
- [x] Controllers are thin — all logic delegated to use cases
  > `AuthController.getMe()` calls no logic — it receives the already-verified `IRequestContext` via `@CurrentUser()` and returns it.
- [x] Cross-module interaction uses explicit interfaces or events only
  > The guard and decorators are in `common/` — all modules consume them via import, not cross-module service injection.

**Multi-Tenancy (CRITICAL)**

- [N/A] All new DB tables include `tenant_id` column with index
  > No DB tables introduced in this feature.
- [N/A] All repository queries filter by `tenant_id`
  > No repository queries in this feature.
- [x] Request context injected via guard before any business logic
  > `ClerkJwtGuard` (global, `APP_GUARD`) sets `request.user.userId` before any controller method runs. `tenantId` is `null` until Feature 009 — documented and acceptable for this scope.

**Authentication & Authorization**

- [x] Clerk JWT is verified against JWKS — client-supplied identity is never trusted
  > `@clerk/backend` `verifyToken()` validates signature, expiry, and issuer against Clerk's JWKS endpoint. The `userId` comes from the verified `sub` claim exclusively.
- [x] Role/permission checks are enforced in backend guards, not in frontend
  > No role checks in this feature. Guard only enforces identity — not authorization. Correct scope.

**Data Layer**

- [N/A] All DB access goes through repository interfaces
  > No DB access in this feature.
- [N/A] Prisma schema changes include `tenant_id` index
  > No schema changes.

**API & Async**

- [x] All new endpoints documented with Swagger/OpenAPI decorators
  > `GET /me` will have `@ApiOperation`, `@ApiBearerAuth()`, `@ApiOkResponse`, `@ApiUnauthorizedResponse`.
- [x] All DTOs use `class-validator` decorators
  > No request DTOs in this feature. Response is a plain `{ userId: string }` inline object.
- [N/A] Heavy operations offloaded to BullMQ
  > JWT verification is synchronous and < 5ms. Not a heavy operation.
- [N/A] BullMQ jobs are idempotent
  > No queues in this feature.

**Testing**

- [N/A] Unit tests cover domain and application layer logic
  > No unit tests are in scope for this feature per the spec (manual curl/Swagger verification is the validation approach).
- [N/A] Integration tests cover repository and module interactions
  > No repositories.
- [N/A] E2E tests cover new API endpoints
  > E2E tests require a live Clerk app. Manual verification via curl and Swagger is the specified approach.

**Security**

- [x] No secrets or credentials in source code
  > `CLERK_SECRET_KEY` comes from environment variables only. `.env.example` has empty placeholder. `.env` is gitignored.
- [N/A] Rate limiting applied to new public-facing endpoints
  > `/me` is protected, not public-facing. Rate limiting is a future cross-cutting concern.
- [x] All inputs validated and sanitised before processing
  > The `Authorization` header is validated for `Bearer` scheme before the token is passed to the verifier. The verifier rejects all malformed, expired, or invalid tokens.

**Constitution Check Result**: ✅ PASS — All applicable gates pass. The authentication correctness gate is the central gate of this feature — explicitly confirmed: `userId` comes exclusively from JWKS-verified JWT `sub` claim.

## Project Structure

### Documentation (this feature)

```text
specs/008-clerk-jwt-nestjs/
├── plan.md              # This file
├── research.md          # Phase 0 decisions (D1–D8)
├── data-model.md        # Request context entity, env config, file artifacts
├── quickstart.md        # Developer setup and testing guide
├── contracts/
│   └── api-endpoints.md # GET /me + GET /health contracts
└── tasks.md             # Generated by /speckit.tasks
```

### Files Modified or Created (`apps/api`)

```text
apps/api/
├── package.json                                    UPDATE — add @clerk/backend
├── .env.example                                    UPDATE — mark CLERK_SECRET_KEY required
└── src/
    ├── common/
    │   ├── config/
    │   │   └── validation.schema.ts                UPDATE — CLERK_SECRET_KEY required()
    │   ├── decorators/
    │   │   ├── public.decorator.ts                 CREATE — @Public() sets IS_PUBLIC_KEY metadata
    │   │   └── current-user.decorator.ts           CREATE — @CurrentUser() reads request.user
    │   ├── guards/
    │   │   ├── clerk-jwt.guard.ts                  CREATE — global auth guard
    │   │   └── stub-bearer.guard.ts                UPDATE — add @deprecated comment
    │   └── types/
    │       └── request-context.type.ts             UPDATE — tenantId + role → string | null
    └── modules/
        ├── auth/
        │   ├── application/
        │   │   └── verify-clerk-token.use-case.ts  CREATE — orchestrates verification
        │   ├── infrastructure/
        │   │   └── clerk-token-verifier.service.ts CREATE — wraps @clerk/backend
        │   ├── presentation/
        │   │   └── auth.controller.ts              CREATE — GET /me endpoint
        │   └── auth.module.ts                      UPDATE — register services, APP_GUARD, controller
        └── health/
            └── health.controller.ts                UPDATE — add @Public()
```

**Structure Decision**: All changes within `apps/api`. No new packages or monorepo-level changes.

## Complexity Tracking

> No constitution violations — all applicable gates pass.

---

## Implementation Phases

### Phase 1 — Package Installation

**Goal**: Install `@clerk/backend` so Clerk JWT verification is available in the API.

| # | Command | Detail |
|---|---------|--------|
| T001 | `pnpm --filter @leaseKo/api add @clerk/backend` | Install Clerk server-side SDK |
| T002 | Verify `apps/api/package.json` | `@clerk/backend` appears in `dependencies` |

---

### Phase 2 — Environment & Config

**Goal**: Make `CLERK_SECRET_KEY` required at startup and update documentation.

| # | File | Action | Detail |
|---|------|--------|--------|
| T003 | `apps/api/src/common/config/validation.schema.ts` | Update | `CLERK_SECRET_KEY`: `Joi.string().optional().allow("")` → `Joi.string().required()`. Add comment: "SERVER-SIDE ONLY — never expose to frontend". Keep `CLERK_JWKS_URL` optional. |
| T004 | `apps/api/.env.example` | Update | Mark `CLERK_SECRET_KEY` as required with comment; mark `CLERK_JWKS_URL` optional with note it is auto-derived from the secret key |

**Updated `validation.schema.ts` Clerk section**:

```typescript
CLERK_SECRET_KEY: Joi.string().required(), // SERVER-SIDE ONLY
CLERK_JWKS_URL: Joi.string().uri().optional().allow(''), // auto-derived from secret key
```

---

### Phase 3 — Common Types, Decorators, and Guard

**Goal**: Create the shared infrastructure that all modules will use.

| # | File | Action | Detail |
|---|------|--------|--------|
| T005 | `apps/api/src/common/types/request-context.type.ts` | Update | Change `tenantId: string` → `tenantId: string \| null` and `role: string` → `role: string \| null`; update JSDoc to note Feature 008 sets `userId`, Feature 009 populates `tenantId` |
| T006 | `apps/api/src/common/decorators/public.decorator.ts` | Create | `export const IS_PUBLIC_KEY = 'isPublic'; export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)` |
| T007 | `apps/api/src/common/decorators/current-user.decorator.ts` | Create | `createParamDecorator` reading `request.user as IRequestContext` |
| T008 | `apps/api/src/common/guards/clerk-jwt.guard.ts` | Create | Full guard — see implementation details below |
| T009 | `apps/api/src/common/guards/stub-bearer.guard.ts` | Update | Add `@deprecated` JSDoc comment: "Replaced by ClerkJwtGuard. Do not use." |

**`public.decorator.ts`** content:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
```

**`current-user.decorator.ts`** content:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IRequestContext } from '../types/request-context.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IRequestContext => {
    const request = ctx.switchToHttp().getRequest<Request & { user: IRequestContext }>();
    return request.user;
  },
);
```

**`clerk-jwt.guard.ts`** content:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IRequestContext } from '../types/request-context.type';
import { VerifyClerkTokenUseCase } from '../../modules/auth/application/verify-clerk-token.use-case';

@Injectable()
export class ClerkJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifyClerkToken: VerifyClerkTokenUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: IRequestContext }>();

    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException();
    }

    const userId = await this.verifyClerkToken.execute(token);
    request.user = { userId, tenantId: null, role: null };
    return true;
  }
}
```

---

### Phase 4 — Auth Module: Infrastructure + Application

**Goal**: Implement the Clerk token verifier service and use case.

| # | File | Action | Detail |
|---|------|--------|--------|
| T010 | `apps/api/src/modules/auth/infrastructure/clerk-token-verifier.service.ts` | Create | Wraps `@clerk/backend` `createClerkClient().verifyToken()`; catches all errors and rethrows as `UnauthorizedException` |
| T011 | `apps/api/src/modules/auth/application/verify-clerk-token.use-case.ts` | Create | Calls `ClerkTokenVerifierService.verify(token)` and returns `userId: string` |

**`clerk-token-verifier.service.ts`** content:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkTokenVerifierService {
  private readonly clerk: ReturnType<typeof createClerkClient>;

  constructor(private readonly config: ConfigService) {
    this.clerk = createClerkClient({
      secretKey: this.config.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
  }

  async verify(token: string): Promise<string> {
    try {
      const payload = await this.clerk.verifyToken(token);
      if (!payload.sub) {
        throw new UnauthorizedException();
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

**`verify-clerk-token.use-case.ts`** content:

```typescript
import { Injectable } from '@nestjs/common';
import { ClerkTokenVerifierService } from '../infrastructure/clerk-token-verifier.service';

@Injectable()
export class VerifyClerkTokenUseCase {
  constructor(private readonly verifier: ClerkTokenVerifierService) {}

  async execute(token: string): Promise<string> {
    return this.verifier.verify(token);
  }
}
```

---

### Phase 5 — Auth Module: Presentation + Module Registration

**Goal**: Create the `GET /me` endpoint and wire the global guard via `APP_GUARD`.

| # | File | Action | Detail |
|---|------|--------|--------|
| T012 | `apps/api/src/modules/auth/presentation/auth.controller.ts` | Create | `GET /me` with `@CurrentUser()`, `@ApiBearerAuth()`, `@ApiUnauthorizedResponse()` |
| T013 | `apps/api/src/modules/auth/auth.module.ts` | Update | Register `ClerkTokenVerifierService`, `VerifyClerkTokenUseCase`, `ClerkJwtGuard`, `AuthController`; provide `{ provide: APP_GUARD, useClass: ClerkJwtGuard }` |

**`auth.controller.ts`** content:

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IRequestContext } from '../../../common/types/request-context.type';

@ApiTags('Auth')
@Controller()
export class AuthController {
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user', description: 'Returns the authenticated Clerk userId from the verified JWT.' })
  @ApiOkResponse({ description: 'Authenticated user context', schema: { example: { userId: 'user_2abc123' } } })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  getMe(@CurrentUser() user: IRequestContext): { userId: string } {
    return { userId: user.userId };
  }
}
```

**`auth.module.ts`** content:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkJwtGuard } from '../../common/guards/clerk-jwt.guard';
import { ClerkTokenVerifierService } from './infrastructure/clerk-token-verifier.service';
import { VerifyClerkTokenUseCase } from './application/verify-clerk-token.use-case';
import { AuthController } from './presentation/auth.controller';

@Module({
  providers: [
    ClerkTokenVerifierService,
    VerifyClerkTokenUseCase,
    { provide: APP_GUARD, useClass: ClerkJwtGuard },
  ],
  controllers: [AuthController],
  exports: [VerifyClerkTokenUseCase],
})
export class AuthModule {}
```

---

### Phase 6 — Mark Health Endpoint Public

**Goal**: Ensure `GET /health` continues to respond without a token after the global guard is active.

| # | File | Action | Detail |
|---|------|--------|--------|
| T014 | `apps/api/src/modules/health/health.controller.ts` | Update | Add `@Public()` decorator to the `check()` method |

---

### Phase 7 — Verification Gates

**Goal**: Confirm all tooling passes and the full auth flow works end-to-end.

| # | Command / Action | Expected |
|---|-----------------|----------|
| T015 | `pnpm --filter @leaseKo/api typecheck` | Exit 0, zero TypeScript errors |
| T016 | `pnpm --filter @leaseKo/api lint` | Exit 0, zero lint errors |
| T017 | `pnpm --filter @leaseKo/api build` | Exit 0, successful build |
| T018 | `curl http://localhost:3001/api/v1/health` (no token) | `200 { status: "ok" }` |
| T019 | `curl http://localhost:3001/api/v1/me` (no token) | `401 Unauthorized` |
| T020 | `curl http://localhost:3001/api/v1/me -H "Authorization: Bearer invalid"` | `401 Unauthorized` |
| T021 | `curl http://localhost:3001/api/v1/me -H "Authorization: Bearer <valid-clerk-jwt>"` | `200 { userId: "user_..." }` |

### Phase 8 — README Update

| # | File | Action |
|---|------|--------|
| T022 | `README.md` | Add Clerk backend section: required env vars, how to get a JWT for testing, how to call `/me` |

---

## Authentication Flow

```
Client Request
  │
  ├─► ClerkJwtGuard.canActivate()
  │     │
  │     ├─ IS_PUBLIC_KEY set? ──yes──► allow (pass-through)
  │     │
  │     ├─ Authorization: Bearer <token>? ──no──► throw UnauthorizedException → 401
  │     │
  │     └─ VerifyClerkTokenUseCase.execute(token)
  │           └─► ClerkTokenVerifierService.verify(token)
  │                 └─► @clerk/backend verifyToken() ──fail──► throw UnauthorizedException → 401
  │                           │
  │                           ok
  │                           │
  │                     return payload.sub
  │
  ├─ request.user = { userId, tenantId: null, role: null }
  │
  └─► Controller.method(@CurrentUser() user)
```

---

## Environment Variables

| Variable | Required | Value | Notes |
|----------|----------|-------|-------|
| `CLERK_SECRET_KEY` | **Yes** | `sk_test_...` | SERVER-SIDE ONLY. Never expose to frontend. Fails startup if missing. |
| `CLERK_JWKS_URL` | No | — | Optional override. SDK derives JWKS URL from secret key automatically. |
| `DATABASE_URL` | Yes | existing | Unchanged |
| `REDIS_URL` | Yes | existing | Unchanged |
| `FRONTEND_URL` | Yes | existing | Unchanged |

---

## Route Protection Rules

| Route | Guard Behaviour | Decorator |
|-------|----------------|-----------|
| `GET /api/v1/health` | Bypassed | `@Public()` |
| `GET /api/v1/me` | Verified | `@ApiBearerAuth()` |
| All other routes | Verified (default) | None needed |

---

## Security Rules

1. `userId` comes exclusively from the verified JWT `sub` claim — never from request body, query params, headers, or cookies.
2. The `ClerkJwtGuard` fails closed on every error — missing token, malformed header, expired token, invalid signature all return `401` with a generic `"Unauthorized"` message.
3. Internal verification error details are never forwarded to the HTTP response.
4. `CLERK_SECRET_KEY` is accessed only via `ConfigService.getOrThrow()` — never via `process.env` directly in business code.
5. The stub guard (`stub-bearer.guard.ts`) is deprecated but not deleted — it is not registered anywhere once `APP_GUARD` uses `ClerkJwtGuard`.
6. Frontend route protection (`middleware.ts` in `apps/web`) is not relied upon for backend security. Every backend request is verified independently.

---

## Notes for Next Features

### Feature 009 — Tenant Context (orgId Extraction)

Update `ClerkJwtGuard` and `ClerkTokenVerifierService`:

```typescript
// In verify(): extract orgId from payload
const tenantId = payload.org_id ?? null;
return { userId: payload.sub, tenantId };

// In guard: set request.user.tenantId
request.user = { userId, tenantId, role: null };
```

Add a second guard or extend `ClerkJwtGuard` to reject requests with `tenantId === null` on tenant-required routes.

### Feature 010 — Backend Authorization / RBAC

- Add `role` field lookup from the database (Prisma) after JWT verification.
- Extend `IRequestContext` with `role: 'owner' | 'manager' | 'tenant_user'`.
- Create `@Roles(...)` decorator and `RolesGuard` for endpoint-level permission enforcement.

### Feature 011 — Prisma User Sync

- On first verified request, check if `userId` exists in the `User` table.
- If not, create a user record with `clerk_user_id = userId`.
- Wire this into `VerifyClerkTokenUseCase` as an optional side-effect (not blocking the auth flow).

