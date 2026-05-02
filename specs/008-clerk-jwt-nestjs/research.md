# Research: Clerk JWT Verification — NestJS Backend

**Feature**: 008-clerk-jwt-nestjs
**Date**: 2026-05-02

---

## D1 — Clerk Backend Package

**Decision**: Install `@clerk/backend`

**Rationale**: `@clerk/backend` is the official low-level Clerk SDK for server environments. It provides `verifyToken()` which accepts a raw JWT and verifies it against Clerk's JWKS endpoint. It is framework-agnostic — not tied to Express or Next.js — making it the correct choice for NestJS.

**Alternatives considered**:
- `@clerk/express`: Express-specific middleware; would conflict with NestJS guard architecture and imposes framework coupling.
- `@nestjs/jwt` + `jwks-rsa`: Generic JWT + JWKS library pair. Works but requires manual JWKS caching and Clerk-specific claims mapping — more code for no benefit when the official SDK handles it.
- `@clerk/nextjs/server`: Already in the web app; wrong package for the API.

**Install command**: `pnpm --filter @leaseKo/api add @clerk/backend`

---

## D2 — Token Verification Strategy

**Decision**: Use `@clerk/backend` `createClerkClient()` → `verifyToken()` with `CLERK_SECRET_KEY`

**Rationale**: `@clerk/backend` `createClerkClient({ secretKey })` creates a Clerk client that internally resolves the JWKS URL from the secret key's instance identifier. `client.verifyToken(token)` validates signature, expiry, issuer, and audience in one call. This is simpler and more reliable than building a custom JWKS verifier.

The `secretKey` is sufficient — `CLERK_JWKS_URL` is an optional override for environments where Clerk's default JWKS URL is not reachable (private networks, enterprise proxies). Document it as optional.

**Verification failure behavior**: `verifyToken()` throws an error with a message code. The service catches all errors and rethrows as `UnauthorizedException` with a generic "Unauthorized" message — internal error details are never forwarded to the response.

**Alternatives considered**:
- Using the raw JWKS URL with `jose` library: Requires manual JWKS caching and rotation handling. No benefit over the SDK.
- Using Clerk's hosted identity endpoint: Network-dependent on every request; not suitable for high-throughput APIs.

---

## D3 — Guard Registration Strategy

**Decision**: Register `ClerkJwtGuard` as a global guard via `APP_GUARD` provider in `AuthModule`. Use `@Public()` decorator to opt routes out.

**Rationale**: Global-by-default with explicit opt-out is the constitution's security requirement — "all routes MUST be protected by authentication guards unless explicitly marked public." This prevents accidentally leaving a route unprotected by forgetting to add a guard decorator.

**Implementation**: In `AuthModule`, provide `{ provide: APP_GUARD, useClass: ClerkJwtGuard }`. This registers the guard at the application level. The guard checks for `IS_PUBLIC_KEY` Reflector metadata before verifying tokens.

**Alternatives considered**:
- Per-controller `@UseGuards(ClerkJwtGuard)`: Requires every future controller author to remember to add the guard. Too easy to omit. Violates the secure-by-default principle.
- `main.ts` `app.useGlobalGuards(new ClerkJwtGuard(...))`: Cannot inject dependencies (ConfigService, ClerkTokenVerifier) when instantiated via `useGlobalGuards`. Must use DI-based `APP_GUARD` instead.

---

## D4 — RequestUser Shape vs IRequestContext

**Decision**: `ClerkJwtGuard` sets `request.user` to the **existing `IRequestContext` interface** from `common/types/request-context.type.ts`, but only populates `userId` in this feature. `tenantId` and `role` will be `null` until Features 009+ add tenant extraction.

**Rationale**: `IRequestContext` is already defined, already has the right long-term shape (`userId`, `tenantId`, `role`), and is already referenced in architecture comments. Creating a separate `RequestUser` type would create a parallel type that needs to be merged later. Better to use the canonical type now and populate it incrementally.

**Implementation**: The guard sets `request.user = { userId, tenantId: null, role: null }`. The `@CurrentUser()` decorator returns `IRequestContext`.

**Alternatives considered**:
- Separate `RequestUser = { userId: string }` type: Creates a type migration burden in Feature 009. Rejected.
- Extending `IRequestContext` with optionals: The existing interface uses string types — updating to `string | null` is a compatible change that makes the partial-population intent clear.

---

## D5 — Environment Variable Requirements

**Decision**: Change `CLERK_SECRET_KEY` to `Joi.string().required()` in `validation.schema.ts`. Keep `CLERK_JWKS_URL` optional.

**Rationale**: Without `CLERK_SECRET_KEY`, the `ClerkTokenVerifier` cannot be instantiated. The app must fail fast at startup rather than silently running with a non-functional auth guard. `CLERK_JWKS_URL` is an optional override — the SDK derives the JWKS URL from the secret key by default.

**Migration note**: Update `apps/api/.env.example` to clearly mark `CLERK_SECRET_KEY` as required and `CLERK_JWKS_URL` as optional.

---

## D6 — Stub Guard Disposition

**Decision**: Keep `stub-bearer.guard.ts` as-is (do not delete it). The new `ClerkJwtGuard` will be registered as the `APP_GUARD` global guard, superseding the stub. The stub file will be marked deprecated with a comment directing developers to the new guard.

**Rationale**: Deleting a file requires coordination — other code might reference the stub (e.g., in tests). Leaving it with a deprecation notice is safer. It will be removed in a cleanup pass.

**Alternatives considered**:
- Delete the stub immediately: Risk of breaking any test or controller that references it. Cautious approach is better here.

---

## D7 — Clean Architecture Layer Placement

**Decision**:

| File | Layer | Reasoning |
|------|-------|-----------|
| `modules/auth/infrastructure/clerk-token-verifier.service.ts` | Infrastructure | Calls external Clerk SDK — infrastructure dependency |
| `modules/auth/application/verify-clerk-token.use-case.ts` | Application | Orchestrates verification flow, normalises result |
| `modules/auth/presentation/auth.controller.ts` | Presentation | `GET /me` endpoint |
| `common/guards/clerk-jwt.guard.ts` | Common infrastructure | Reusable across all modules, not auth-domain-specific |
| `common/decorators/public.decorator.ts` | Common | Framework decorator, not domain-specific |
| `common/decorators/current-user.decorator.ts` | Common | Framework decorator, not domain-specific |

**Rationale**: The guard belongs in `common/guards/` not `modules/auth/presentation/` because it is a cross-cutting concern that will be used by every module. Domain-specific auth logic (token verification, user extraction) stays in the `auth` module layers.

---

## D8 — Swagger Updates Required

**Decision**: `addBearerAuth()` is already in `main.ts`. Only controller decorators need updating:
- `AuthController.getMe()`: add `@ApiBearerAuth()` + `@ApiUnauthorizedResponse()`
- `HealthController.check()`: add `@ApiOperation` update noting it is public (description already says this — no code change needed)

**Rationale**: Swagger Bearer auth is already globally configured. The only work is per-endpoint `@ApiBearerAuth()` annotations so Swagger sends the token on those routes.
