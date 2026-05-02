# Data Model: Clerk JWT Verification — NestJS Backend

**Feature**: 008-clerk-jwt-nestjs
**Date**: 2026-05-02

---

## Overview

This feature introduces no new database tables. The data model describes the **request context entity**, **environment configuration**, and **file artifact inventory** for the backend auth guard.

---

## Request Context Entity

### IRequestContext (updated)

The existing `IRequestContext` type at `apps/api/src/common/types/request-context.type.ts` is used as the canonical authenticated request user. This feature populates `userId` only. Future features populate `tenantId` and `role`.

| Field | Type | Source | Populated in |
|-------|------|--------|-------------|
| `userId` | `string` | JWT `sub` claim | Feature 008 (this) |
| `tenantId` | `string \| null` | JWT `org_id` claim | Feature 009 |
| `role` | `string \| null` | DB lookup or JWT custom claim | Feature 009+ |

**Rules**:
- `userId` comes exclusively from the verified JWT `sub` claim — never from request body, query params, cookies, or any frontend-provided field.
- `tenantId` and `role` are `null` until Feature 009 adds tenant extraction.
- The guard sets `request.user: IRequestContext` after successful verification.
- The `@CurrentUser()` decorator reads `request.user` and returns it typed as `IRequestContext`.

**Change required**: Update `IRequestContext` to make `tenantId` and `role` nullable (`string | null`) so the guard can legally set them to `null` in this feature.

---

## Token Verification Flow

```
HTTP Request
  └─► ClerkJwtGuard.canActivate()
        ├─ Check IS_PUBLIC_KEY metadata → if set, allow through
        ├─ Extract Authorization header → reject 401 if missing or not "Bearer ..."
        ├─ VerifyClerkTokenUseCase.execute(token)
        │     └─► ClerkTokenVerifierService.verify(token)
        │               └─► clerkClient.verifyToken(token)
        │                     ├─ Validates signature against JWKS
        │                     ├─ Validates expiry
        │                     ├─ Validates issuer
        │                     └─ Returns payload { sub, ... }
        ├─ On failure → throw UnauthorizedException (generic message)
        └─ On success → request.user = { userId: payload.sub, tenantId: null, role: null }
```

---

## Environment Configuration

### `apps/api/.env` (from `.env.example`)

| Variable | Required | Source | Notes |
|----------|----------|--------|-------|
| `CLERK_SECRET_KEY` | **Yes** (required at startup) | Clerk dashboard → API Keys → Secret key | Server-side only; never expose to frontend |
| `CLERK_JWKS_URL` | No (optional override) | Clerk dashboard | Only needed if default JWKS URL unreachable |
| `DATABASE_URL` | Yes | Docker/infra | Already required |
| `REDIS_URL` | Yes | Docker/infra | Already required |
| `FRONTEND_URL` | Yes | `.env` | Already required |

---

## Route Access Model

| Route | Method | Guard | Decorator | Notes |
|-------|--------|-------|-----------|-------|
| `/api/v1/health` | GET | Bypassed | `@Public()` | Infrastructure monitoring |
| `/api/v1/me` | GET | ClerkJwtGuard | `@ApiBearerAuth()` | Returns `{ userId }` from verified token |
| All other routes | * | ClerkJwtGuard | (none needed) | Protected by default via global guard |

---

## File Artifacts

| File | Status | Change |
|------|--------|--------|
| `apps/api/package.json` | Exists — update | Add `@clerk/backend` dependency |
| `apps/api/.env.example` | Exists — update | Mark `CLERK_SECRET_KEY` as required; clarify `CLERK_JWKS_URL` optional |
| `apps/api/src/common/config/validation.schema.ts` | Exists — update | `CLERK_SECRET_KEY`: `optional()` → `required()`; update `CLERK_JWKS_URL` comment |
| `apps/api/src/common/types/request-context.type.ts` | Exists — update | Make `tenantId` and `role` `string \| null` |
| `apps/api/src/common/guards/clerk-jwt.guard.ts` | Does not exist — create | Global auth guard using Reflector + VerifyClerkTokenUseCase |
| `apps/api/src/common/guards/stub-bearer.guard.ts` | Exists — deprecate | Add deprecation comment; do not delete yet |
| `apps/api/src/common/decorators/public.decorator.ts` | Does not exist — create | `@Public()` sets `IS_PUBLIC_KEY` metadata |
| `apps/api/src/common/decorators/current-user.decorator.ts` | Does not exist — create | `@CurrentUser()` reads `request.user` as `IRequestContext` |
| `apps/api/src/modules/auth/infrastructure/clerk-token-verifier.service.ts` | Does not exist — create | Wraps `@clerk/backend` `verifyToken()` |
| `apps/api/src/modules/auth/application/verify-clerk-token.use-case.ts` | Does not exist — create | Use case: calls verifier, normalises result to `{ userId }` |
| `apps/api/src/modules/auth/presentation/auth.controller.ts` | Does not exist — create | `GET /me` endpoint using `@CurrentUser()` |
| `apps/api/src/modules/auth/auth.module.ts` | Exists — update | Register services, controller, provide `APP_GUARD` |
| `apps/api/src/modules/health/health.controller.ts` | Exists — update | Add `@Public()` decorator |
| `README.md` | Exists — update | Add Clerk backend env var section and authenticated request guide |
