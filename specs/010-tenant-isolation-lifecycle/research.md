# Research: Tenant Isolation Request Lifecycle Enforcement

**Feature**: 010-tenant-isolation-lifecycle
**Date**: 2026-05-03

## Resolved Unknowns

### 1. Clerk JWT Tenant Claim (CONFIRMED)

**Decision**: `payload.o?.id` — the v2 compact format organization claim object
**Already implemented in**: `apps/api/src/modules/auth/infrastructure/clerk-token-verifier.service.ts`

```typescript
const orgClaim = (payload as Record<string, Record<string, string> | undefined>).o;
const tenantId = orgClaim?.id ?? null;
```

There is NO top-level `org_id` field in Clerk v2 JWTs. The `o` claim is an object; `o.id` holds the organization ID (e.g. `org_...`). The `o` claim is absent when the user has no active org session, yielding `tenantId = null`.

**Source**: Verified in `@clerk/shared` jwtPayloadParser + current implementation.

---

### 2. Guard Architecture (CONFIRMED)

**Decision**: Option C — `@RequiresTenant()` opt-in decorator. Already implemented in Feature 009.

The `ClerkJwtGuard` (registered as `APP_GUARD` via `{ provide: APP_GUARD, useClass: ClerkJwtGuard }` in `AuthModule`) already:
- Bypasses entirely for `@Public()` routes
- Sets `request.user = { userId, tenantId, role: null }` on every authenticated request
- Checks `IS_TENANT_REQUIRED_KEY` metadata and throws `ForbiddenException()` when required + `tenantId` is null

**Gap**: `@UserOnly()` decorator does not yet exist. The guard currently treats routes without `@RequiresTenant()` as "user-only by default" but there is no explicit opt-in decorator for routes that **must not** be accidentally upgraded to tenant-required.

---

### 3. @UserOnly() Decorator (NEW — NEEDS CREATION)

**Decision**: Create `IS_USER_ONLY_KEY = 'isUserOnly'` + `@UserOnly()` as `SetMetadata(IS_USER_ONLY_KEY, true)`.

Guard behavior change: When `IS_USER_ONLY_KEY` is set, skip the `IS_TENANT_REQUIRED_KEY` check entirely (even if someone adds `@RequiresTenant()` accidentally — user-only wins).

**Location**: `apps/api/src/common/decorators/user-only.decorator.ts`

---

### 4. TenantContext Endpoint (NEW — NEEDS CREATION)

**Decision**: New `TenantContextModule` at `apps/api/src/modules/tenant-context/`.

Endpoint: `GET /api/v1/tenant-context`
Decorator: `@RequiresTenant()`
Response: `{ tenantId: string }`
Uses: `@CurrentTenant()`
No DB access, no business logic.

**Why a new module**: Follows the Modular Monolith pattern. Auth module owns Clerk JWT verification; tenant-context verification belongs in a separate bounded context.

---

### 5. Existing Infrastructure Status

| Artifact | Status | Notes |
|----------|--------|-------|
| `ClerkJwtGuard` | ✅ Complete | Features 008+009. Checks `@Public()` + `@RequiresTenant()`. |
| `@Public()` | ✅ Complete | `IS_PUBLIC_KEY = 'isPublic'`, bypasses guard entirely. |
| `@RequiresTenant()` | ✅ Complete | `IS_TENANT_REQUIRED_KEY = 'isTenantRequired'`, 403 on null tenantId. |
| `@CurrentTenant()` | ✅ Complete | Reads `request.user?.tenantId ?? null`. |
| `@CurrentUser()` | ✅ Complete | Reads full `IRequestContext` from `request.user`. |
| `IRequestContext` | ✅ Complete | `{ userId, tenantId: string \| null, role: string \| null }` |
| `GlobalExceptionFilter` | ✅ Complete | Formats `HttpException` safely, no JWT claim leakage. |
| `GET /auth/me` | ✅ Complete | `@RequiresTenant()`, returns `{ userId, tenantId }`. |
| `GET /health` | ✅ Complete | `@Public()`, bypasses guard. |
| `StubBearerGuard` | ⚠️ Deprecated | File exists but never registered. No action needed. |
| `@UserOnly()` | ❌ Missing | Must be created (this feature). |
| `GET /tenant-context` | ❌ Missing | Must be created (this feature). |
| `TenantContextModule` | ❌ Missing | Must be created (this feature). |

---

### 6. Guard Default Behavior (No Decorator)

The current guard, with no decorator on a route, defaults to:
- Require valid JWT → `401` if missing/invalid
- Set `request.user` with `tenantId` (may be `null`)
- **Does NOT** enforce `tenantId` being non-null

This means undecorated protected routes are effectively "user-or-tenant" — they accept any authenticated request. Business routes must explicitly add `@RequiresTenant()` to enforce isolation.

**This is correct behavior** — it matches the constitution's rule that `@RequiresTenant()` is the enforcement mechanism, not a global default.

---

### 7. Constitution Compliance Assessment

| Constitution Rule | Status |
|-------------------|--------|
| Tenant enforcement before business logic | ✅ Guard runs before any controller method |
| `tenantId` only from verified JWT | ✅ `ClerkJwtGuard` → `VerifyClerkTokenUseCase` → `ClerkTokenVerifierService` |
| `tenantId` never from body/query/header | ✅ No such code path exists |
| Controllers must not manually enforce `tenantId` | ✅ Guard handles it |
| `@Public()` bypass | ✅ Implemented |
| Clean Architecture: guard in `common/guards` | ✅ |
| No Prisma in this feature | ✅ No DB work required |

**Gaps** (must be resolved by this feature):
- `@UserOnly()` decorator missing — risk: no explicit way to mark user-only routes; a future developer could inadvertently add `@RequiresTenant()` to what should be user-only
- `GET /tenant-context` missing — verification endpoint required by spec US4
- `IRequestContext` JSDoc is stale (says "null until Feature 009" — Feature 009 is done)

---

### 8. Alternatives Considered

**Alternative: Global tenant enforcement by default (all routes require tenantId)**
- Rejected: Breaks `GET /auth/me` if a user signs in without an org. Some initial onboarding flows must work pre-tenant.
- Rejected: Would require every non-tenant route to carry `@UserOnly()` — high ceremony.

**Alternative: Separate `TenantGuard` as a second `APP_GUARD`**
- Rejected: NestJS processes multiple `APP_GUARD` providers in order; complexity increases. Current single-guard approach with metadata is simpler and already works.

**Alternative: Middleware for tenant enforcement**
- Rejected: NestJS middleware cannot access route metadata (`@RequiresTenant()`). Guards are the correct place for metadata-driven enforcement in NestJS.
