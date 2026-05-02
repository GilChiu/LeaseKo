# Research: Tenant-Aware Request Context

**Feature**: `009-tenant-aware-request-context`
**Date**: 2026-05-03
**Status**: Complete — all decisions resolved

---

## D1 — Clerk JWT Organization Claim Key

**Decision**: Use `payload.o?.id` to extract the organization ID from the verified Clerk token.

**Rationale**: Clerk's session token v2 format stores org context in a compact nested `o` object:
- `o.id` → Organization ID (`org_...`)
- `o.slg` → Organization slug
- `o.rol` → Role
- `o.per` → Permissions

The `@clerk/backend` SDK's `__experimental_JWTPayloadToAuthObjectProperties()` maps `claims.o?.id` to `orgId` in its auth objects. Confirmed via `node_modules/.pnpm/@clerk+shared@4.9.0/…/jwtPayloadParser.js`:
```js
orgId = claims.o?.id;
```

The `JwtPayload` type from `@clerk/shared/types` (returned by `verifyToken()` in `@clerk/backend@3.x`) includes the raw `o` claim. There is no top-level `org_id` field in v2 tokens.

**Alternatives considered**:
- `payload.org_id` (v1 token format) — Not applicable to this Clerk SDK version.
- Custom JWT template claim — Not required; standard Clerk org claim is sufficient.
- Calling Clerk Backend API to fetch org membership — Overkill; the JWT already contains org context when the user has an active org session.

**Normalized as**: `tenantId = payload.o?.id ?? null`

---

## D2 — Handling Missing Tenant Context

**Decision**: `ClerkJwtGuard` extracts and stores `tenantId` (may be `null`). A new `@RequiresTenant()` decorator marks routes that mandate non-null `tenantId`. The guard checks this metadata and throws `ForbiddenException` when the decorator is present and `tenantId` is null.

**Rationale**:
- Not all authenticated routes need tenant context (e.g. a future `/profile` endpoint might not). Defaulting all authenticated routes to require tenant is too restrictive and would require opting out everywhere.
- The `@RequiresTenant()` opt-in approach mirrors the existing `@Public()` opt-out pattern, keeping the guard contract consistent.
- `401` for missing/invalid token, `403` for valid token without org context — semantically correct per HTTP standards.

**Alternatives considered**:
- Make all authenticated routes require tenant by default — Too aggressive; some authenticated routes are tenant-agnostic (future profile management).
- Use a separate `TenantGuard` registered after `ClerkJwtGuard` — Two guards is more complex than one guard with metadata; rejected.
- Middleware approach — Middleware runs before guards; cannot access NestJS route metadata; rejected.

---

## D3 — Signature of `ClerkTokenVerifierService.verify()`

**Decision**: Change return type from `Promise<string>` to `Promise<{ userId: string; tenantId: string | null }>`. This keeps claim extraction in the infrastructure layer where it belongs.

**Rationale**: The service already reads the JWT payload. Returning both `userId` and `tenantId` avoids a second parse of the token higher up the stack. The application layer (use case) and guard simply pass the result through without re-parsing.

**Alternatives considered**:
- Return raw `JwtPayload` from service, extract in guard — Leaks Clerk internals through the application layer; rejected.
- Add a separate `extractTenantId(token)` method — Redundant verification; rejected.

---

## D4 — `@CurrentTenant()` Decorator Behaviour on Public Routes

**Decision**: `@CurrentTenant()` returns `tenantId` from `request.user`. On public routes where `request.user` is undefined, it returns `undefined`. Controllers on public routes must not call `@CurrentTenant()` for business logic.

**Rationale**: The decorator is a thin reader — it should not throw. Route-level enforcement is the guard's responsibility via `@RequiresTenant()`. Throwing in a decorator would make it a guard, which breaks the NestJS decorator contract.

---

## D5 — `AuthController.me()` Response Shape

**Decision**: `GET /auth/me` returns `{ userId: string; tenantId: string }`. The route is decorated with `@RequiresTenant()` so a request without org context returns `403` before the controller runs.

**Rationale**: Returning `tenantId: null` from `/me` would require the caller to handle null, which is confusing for a tenant-aware endpoint. The guard ensures `tenantId` is always non-null when the endpoint executes.

---

## D6 — `IRequestContext` Type Shape

**Decision**: Keep `IRequestContext` as-is (`tenantId: string | null`). The type represents the maximum possible context — some routes may have null tenantId. Narrowing to `tenantId: string` happens at the controller level via `@RequiresTenant()` enforcement (guard throws before null is read).

**Rationale**: A single type for all request contexts avoids type proliferation. The guard + decorator enforce the runtime constraint; TypeScript narrowing is the caller's responsibility downstream.

---

## D7 — `org_id` Claim Type in `@clerk/backend@3.x`

**Decision**: The `JwtPayload` type from `@clerk/backend`'s exported `verifyToken()` has the org claim at `payload.o` (an object) with `id` as the organization ID. Access as `payload.o?.id`. Cast to `string | undefined` since the type definition may not expose `o.id` directly.

**Evidence**: Source code in `@clerk/shared` jwtPayloadParser.js confirms `orgId = claims.o?.id`. The `JwtPayload` type definition imports from a bundled `.js` file (`index-BgHD4yD8.js`) — the `o` property is likely typed as `Record<string, any>` or a partial interface.

**Implementation note**: Use a type cast `(payload as Record<string, Record<string, string> | undefined>).o?.id` or simply `(payload as any).o?.id` with a comment explaining the Clerk v2 compact JWT format.
