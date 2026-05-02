# Implementation Plan: Tenant-Aware Request Context

**Branch**: `009-tenant-aware-request-context` | **Date**: 2026-05-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/009-tenant-aware-request-context/spec.md`

## Summary

Extend the existing `ClerkJwtGuard` to extract the Clerk organization ID (`o.id` claim in the v2 JWT compact format) and set it as `tenantId` on `request.user`. Add a `@RequiresTenant()` decorator that causes the guard to throw `403 ForbiddenException` when `tenantId` is null. Add `@CurrentTenant()` parameter decorator for controller access. Update `ClerkTokenVerifierService`, `VerifyClerkTokenUseCase`, `ClerkJwtGuard`, and `AuthController.me()` accordingly. No new NestJS modules, no database access, no Prisma.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS, NestJS 10
**Primary Dependencies**: `@clerk/backend@3.x` (already installed); no new packages required
**Storage**: N/A — no database access in this feature
**Testing**: `pnpm typecheck`, `pnpm lint`, `pnpm build` + manual curl/Swagger verification
**Target Platform**: NestJS on Node.js (server, HTTP)
**Project Type**: Backend request context middleware
**Performance Goals**: No additional async operations; context extraction is O(1) on the already-verified payload
**Constraints**: No Prisma; no roles/permissions; no new packages; must not break Feature 008 auth flow
**Scale/Scope**: `apps/api` only; 6 files modified, 2 files created

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [x] Module follows four-layer Clean Architecture: `domain / application / infrastructure / presentation`
  > `ClerkTokenVerifierService` → infrastructure. `VerifyClerkTokenUseCase` → application. `AuthController` → presentation. Guard → common/guards (shared infrastructure). Domain layer has no domain entities for this feature — correct.
- [x] Domain layer imports no NestJS or Prisma packages
  > No domain layer files introduced or modified.
- [x] Controllers are thin — all logic delegated to use cases
  > `AuthController.me()` receives `IRequestContext` via `@CurrentUser()` and returns it — zero logic.
- [x] Cross-module interaction uses explicit interfaces or events only
  > Decorators and guard live in `common/` — consumed via import, not cross-module service injection.

**Multi-Tenancy (CRITICAL)**

- [N/A] All new DB tables include `tenant_id` column with index
  > No DB tables introduced.
- [N/A] All repository queries filter by `tenant_id`
  > No repository queries in this feature.
- [x] Request context (`userId`, `tenantId`, `role`) is injected via guard before any business logic
  > `ClerkJwtGuard` (global APP_GUARD) now sets both `userId` AND `tenantId` (from `o.id`) before any controller runs. This is the central correctness requirement of this feature.

**Authentication & Authorization**

- [x] Clerk JWT is verified against JWKS — client-supplied identity is never trusted
  > Same `@clerk/backend` `verifyToken()` call as Feature 008. `tenantId` comes from the same verified payload — not from client input.
- [x] Role/permission checks are enforced in backend guards, not in frontend
  > No role checks in this feature. Guard enforces tenant presence — not authorization. Correct scope.

**Data Layer**

- [N/A] All DB access goes through repository interfaces
  > No DB access.
- [N/A] Prisma schema changes include `tenant_id` index
  > No schema changes.

**API & Async**

- [x] All new endpoints documented with Swagger/OpenAPI decorators
  > `GET /auth/me` updates: `@ApiForbiddenResponse` added alongside existing `@ApiBearerAuth`, `@ApiOkResponse`, `@ApiUnauthorizedResponse`.
- [x] All DTOs use `class-validator` decorators
  > No request DTOs. Response is inline `{ userId: string; tenantId: string }`.
- [N/A] Heavy operations offloaded to BullMQ
  > Tenant ID extraction is O(1) on the already-decoded payload.
- [N/A] BullMQ jobs are idempotent
  > No queues.

**Testing**

- [N/A] Unit tests cover domain and application layer logic
  > No automated tests in this feature scope; manual curl + Swagger verification.
- [N/A] Integration tests cover repository interactions
  > No repositories.
- [N/A] E2E tests cover new API endpoints
  > Manual verification with real Clerk JWTs is the specified approach.

**Security**

- [x] No secrets or credentials in source code
  > `CLERK_SECRET_KEY` from env vars only.
- [N/A] Rate limiting on new public-facing endpoints
  > `GET /auth/me` is protected; `GET /health` already existed.
- [x] All inputs validated and sanitised before processing
  > `tenantId` is never read from client input — exclusively from verified JWT `o.id` claim. Empty string `o.id` treated as null. `UnauthorizedException` / `ForbiddenException` for all failure cases with no internal detail exposed.

**Constitution Check Result**: ✅ PASS — All applicable gates pass. The multi-tenancy gate is the central correctness requirement: `tenantId` comes exclusively from the JWKS-verified JWT `o.id` claim and is never accepted from client input.

## Project Structure

### Documentation (this feature)

```text
specs/009-tenant-aware-request-context/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: D1–D7 decisions
├── data-model.md        # Runtime context type + modified artifacts
├── quickstart.md        # Developer testing guide
├── contracts/
│   └── api-endpoints.md # GET /auth/me + GET /health contracts
└── tasks.md             # Generated by /speckit.tasks
```

### Files Modified or Created (`apps/api`)

```text
apps/api/src/
├── common/
│   ├── decorators/
│   │   ├── requires-tenant.decorator.ts    CREATE — @RequiresTenant() sets IS_TENANT_REQUIRED_KEY
│   │   ├── current-tenant.decorator.ts     CREATE — @CurrentTenant() reads request.user.tenantId
│   │   └── current-user.decorator.ts       (unchanged — already returns full IRequestContext)
│   └── guards/
│       └── clerk-jwt.guard.ts              UPDATE — extract o.id → tenantId; enforce @RequiresTenant
└── modules/
    └── auth/
        ├── infrastructure/
        │   └── clerk-token-verifier.service.ts  UPDATE — return { userId, tenantId }
        ├── application/
        │   └── verify-clerk-token.use-case.ts   UPDATE — return { userId, tenantId }
        └── presentation/
            └── auth.controller.ts               UPDATE — return { userId, tenantId }; @RequiresTenant()
```

**Structure Decision**: All changes within `apps/api/src`. No new modules, packages, or monorepo-level files.

## Complexity Tracking

> No constitution violations — all applicable gates pass.

---

## Implementation Phases

### Phase 1 — New Decorators

**Goal**: Create `@RequiresTenant()` and `@CurrentTenant()` before modifying the guard (no dependencies needed).

#### T001 — Create `@RequiresTenant()` decorator

**File**: `apps/api/src/common/decorators/requires-tenant.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_TENANT_REQUIRED_KEY = 'isTenantRequired';
export const RequiresTenant = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_TENANT_REQUIRED_KEY, true);
```

#### T002 — Create `@CurrentTenant()` decorator

**File**: `apps/api/src/common/decorators/current-tenant.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IRequestContext } from '../types/request-context.type';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: IRequestContext }>();
    return request.user?.tenantId ?? null;
  },
);
```

---

### Phase 2 — Infrastructure: Update Token Verifier

**Goal**: Return both `userId` and `tenantId` from `ClerkTokenVerifierService.verify()`.

#### T003 — Update `ClerkTokenVerifierService`

**File**: `apps/api/src/modules/auth/infrastructure/clerk-token-verifier.service.ts`

**Change**: Return type from `Promise<string>` → `Promise<{ userId: string; tenantId: string | null }>`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkTokenVerifierService {
  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<{ userId: string; tenantId: string | null }> {
    try {
      const payload = await verifyToken(token, {
        secretKey: this.config.getOrThrow<string>('CLERK_SECRET_KEY'),
      });
      if (!payload.sub) {
        throw new UnauthorizedException();
      }
      // Clerk v2 JWT compact format: org context is in the 'o' claim object
      // o.id = organization ID (e.g. "org_..."), absent if no active org
      const tenantId = (payload as Record<string, Record<string, string> | undefined>).o?.id ?? null;
      return { userId: payload.sub, tenantId: tenantId ?? null };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

---

### Phase 3 — Application: Update Use Case

**Goal**: Thread the `{ userId, tenantId }` return type through the use case.

#### T004 — Update `VerifyClerkTokenUseCase`

**File**: `apps/api/src/modules/auth/application/verify-clerk-token.use-case.ts`

**Change**: Return type from `Promise<string>` → `Promise<{ userId: string; tenantId: string | null }>`

```typescript
import { Injectable } from '@nestjs/common';
import { ClerkTokenVerifierService } from '../infrastructure/clerk-token-verifier.service';

@Injectable()
export class VerifyClerkTokenUseCase {
  constructor(private readonly verifier: ClerkTokenVerifierService) {}

  async execute(token: string): Promise<{ userId: string; tenantId: string | null }> {
    return this.verifier.verify(token);
  }
}
```

---

### Phase 4 — Guard: Attach Tenant Context + Enforce `@RequiresTenant()`

**Goal**: `ClerkJwtGuard` sets `tenantId` on `request.user` and enforces `@RequiresTenant()` with `403`.

#### T005 — Update `ClerkJwtGuard`

**File**: `apps/api/src/common/guards/clerk-jwt.guard.ts`

**Changes**:
1. Import `ForbiddenException` and `IS_TENANT_REQUIRED_KEY`
2. Destructure `{ userId, tenantId }` from use case result
3. Check `@RequiresTenant()` metadata after setting context — throw `ForbiddenException` if required and null

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_TENANT_REQUIRED_KEY } from '../decorators/requires-tenant.decorator';
import { VerifyClerkTokenUseCase } from '../../modules/auth/application/verify-clerk-token.use-case';
import { IRequestContext } from '../types/request-context.type';

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

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const { userId, tenantId } = await this.verifyClerkToken.execute(token);

    const user: IRequestContext = {
      userId,
      tenantId,
      role: null,
    };

    (request as Request & { user: IRequestContext }).user = user;

    const isTenantRequired = this.reflector.getAllAndOverride<boolean>(
      IS_TENANT_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isTenantRequired && !tenantId) {
      throw new ForbiddenException();
    }

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.slice(7);
  }
}
```

---

### Phase 5 — Presentation: Update `AuthController.me()`

**Goal**: Return `{ userId, tenantId }` and enforce tenant requirement.

#### T006 — Update `AuthController`

**File**: `apps/api/src/modules/auth/presentation/auth.controller.ts`

**Changes**:
1. Add `@RequiresTenant()` to `me()` method
2. Update return type to `{ userId: string; tenantId: string }`
3. Add `@ApiForbiddenResponse` Swagger decorator

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { IRequestContext } from '../../../common/types/request-context.type';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('me')
  @RequiresTenant()
  @ApiOperation({ summary: 'Get current user and tenant context' })
  @ApiOkResponse({
    description: 'Authenticated user and tenant context.',
    schema: { example: { userId: 'user_2abc123', tenantId: 'org_456xyz' } },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token.' })
  @ApiForbiddenResponse({ description: 'Authenticated but no active organization context.' })
  me(@CurrentUser() user: IRequestContext): { userId: string; tenantId: string } {
    return { userId: user.userId, tenantId: user.tenantId as string };
  }
}
```

---

### Phase 6 — Verification Gates

**Goal**: Confirm all tooling passes and the full tenant context flow works end-to-end.

| # | Command / Action | Expected |
|---|-----------------|----------|
| T007 | `pnpm --filter @leaseKo/api typecheck` | Exit 0, zero TypeScript errors |
| T008 | `pnpm --filter @leaseKo/api lint` | Exit 0, zero ESLint errors |
| T009 | `pnpm --filter @leaseKo/api build` | Successful production build |
| T010 | `curl /api/v1/health` (no token) | `200 { status: "ok" }` — public route unaffected |
| T011 | `curl /api/v1/auth/me` (no token) | `401 Unauthorized` |
| T012 | `curl /api/v1/auth/me` (invalid token) | `401 Unauthorized` |
| T013 | `curl /api/v1/auth/me` (valid JWT, no org) | `403 Forbidden` |
| T014 | `curl /api/v1/auth/me` (valid JWT, with org) | `200 { userId, tenantId }` |
| T015 | Swagger UI: Authorize → `GET /auth/me` | `200 { userId, tenantId }` |
| T016 | Update README.md | Add tenant context section |

---

## Tenant Context Extraction Flow

```
HTTP Request
     │
     ▼
ClerkJwtGuard.canActivate()
     │
     ├─► isPublic? ──YES──► return true (no user context)
     │
     ├─► No/malformed Bearer token ──► 401 UnauthorizedException
     │
     └─► verifyClerkToken.execute(token)
               │
               ▼
         ClerkTokenVerifierService.verify(token)
               │
               ├─► verifyToken(token, { secretKey }) ──FAIL──► 401 UnauthorizedException
               │
               └─► payload.sub → userId
                   (payload as any).o?.id → tenantId | null
                   return { userId, tenantId }
               │
               ▼
     request.user = { userId, tenantId, role: null }
               │
     isTenantRequired? ──YES── tenantId === null? ──YES──► 403 ForbiddenException
               │
               └─► return true → controller runs
```

---

## Route Protection Rules

| Route | `@Public()` | `@RequiresTenant()` | Auth | Tenant | Response on missing token | Response on no org |
|-------|:-----------:|:-------------------:|:----:|:------:|:------------------------:|:-----------------:|
| `GET /health` | ✓ | — | No | No | 200 | 200 |
| `GET /auth/me` | — | ✓ | Yes | Yes | 401 | 403 |
| Any future protected route | — | — | Yes | No | 401 | 200 (tenantId null) |
| Any future tenant-scoped route | — | ✓ | Yes | Yes | 401 | 403 |

---

## Error Behavior

| Scenario | HTTP Status | Guard Action |
|----------|:-----------:|--------------|
| `Authorization` header absent | 401 | `UnauthorizedException()` |
| Malformed `Authorization` header | 401 | `UnauthorizedException()` |
| Token expired or invalid signature | 401 | `UnauthorizedException()` caught in service |
| Valid token, no `o.id` claim, `@RequiresTenant()` set | 403 | `ForbiddenException()` |
| Valid token, no `o.id` claim, no `@RequiresTenant()` | 200 | `tenantId: null` on context |
| Valid token, `o.id` present | 200 | `tenantId: "org_..."` on context |
| `@Public()` route, any or no token | 200 | Guard exits early |

---

## Security Rules

1. `tenantId` MUST come from `payload.o?.id` of the JWKS-verified JWT — never from request body, query params, or headers.
2. Empty string from `o.id` is treated as null (same as absent).
3. `ForbiddenException()` and `UnauthorizedException()` are thrown with no detail to prevent information leakage.
4. Controllers MUST NOT re-parse the `Authorization` header — they use `@CurrentUser()` or `@CurrentTenant()` exclusively.
5. Services and use cases MUST NOT access `request` objects — context is passed as explicit parameters.
6. `@RequiresTenant()` MUST be applied to all tenant-scoped business endpoints.

---

## Future Readiness Notes

### Prisma Tenant Isolation (Feature 010+)

Every tenant-scoped repository method MUST accept `tenantId` as an explicit parameter:

```typescript
// ✅ Correct pattern
findAll(tenantId: string): Promise<Property[]>

// ❌ WRONG — never derive tenantId inside a repository
findAll(req: Request): Promise<Property[]>
```

Use cases will receive `tenantId` from `IRequestContext` and pass it down. No repository may execute an unscoped query.

### BullMQ Job Payloads (Feature future)

Every job dispatched from an authenticated request MUST capture `{ userId, tenantId }` at dispatch time:

```typescript
await this.queue.add('process-lease', {
  tenantId: user.tenantId,  // from @CurrentUser() or @CurrentTenant()
  userId: user.userId,
  leaseId,
});
```

Workers treat `tenantId` as a required field — jobs without it are rejected.

---

## Validation Checklist

- [ ] Clerk `o.id` claim is identified as the org ID source
- [ ] `tenantId = payload.o?.id ?? null` extraction implemented in service
- [ ] `ClerkTokenVerifierService.verify()` returns `{ userId, tenantId }`
- [ ] `VerifyClerkTokenUseCase.execute()` returns `{ userId, tenantId }`
- [ ] `ClerkJwtGuard` sets `request.user.tenantId` from use case result
- [ ] `@RequiresTenant()` decorator created with `IS_TENANT_REQUIRED_KEY`
- [ ] Guard checks `IS_TENANT_REQUIRED_KEY` and throws `403` when tenant is null
- [ ] `@CurrentTenant()` decorator reads `request.user.tenantId`
- [ ] `AuthController.me()` decorated with `@RequiresTenant()` and returns `{ userId, tenantId }`
- [ ] `GET /health` returns `200` with no token (unaffected by changes)
- [ ] `GET /auth/me` returns `401` with no token
- [ ] `GET /auth/me` returns `401` with invalid token
- [ ] `GET /auth/me` returns `403` with valid token missing org context
- [ ] `GET /auth/me` returns `200 { userId, tenantId }` with valid org token
- [ ] `tenantId` is never accepted from request body, query, or custom header
- [ ] No Prisma logic added
- [ ] No RBAC/role logic added
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass
