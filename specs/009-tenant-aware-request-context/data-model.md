# Data Model: Tenant-Aware Request Context

**Feature**: `009-tenant-aware-request-context`
**Date**: 2026-05-03

> No new database tables are introduced in this feature. The data model covers runtime-only context objects and updated type signatures.

---

## Entity: `IRequestContext` (runtime only — not persisted)

Attached to `request.user` by `ClerkJwtGuard` on every authenticated request.

| Field | Type | Source | Feature |
|-------|------|--------|---------|
| `userId` | `string` | JWT `sub` claim | Feature 008 |
| `tenantId` | `string \| null` | JWT `o.id` claim (Clerk org ID) | Feature 009 ← |
| `role` | `string \| null` | Database lookup (future) | Feature 010+ |

### Validation Rules

- `userId` — never null; `UnauthorizedException` thrown by guard if absent.
- `tenantId` — null when JWT has no active org context; `ForbiddenException` thrown by guard when `@RequiresTenant()` is present and `tenantId` is null.
- `role` — always null in this feature; populated in a future feature.

### State Transitions

```
Request arrives
  │
  ├─► @Public() → request.user = undefined (guard exits early)
  │
  ├─► No/invalid token → 401 UnauthorizedException
  │
  └─► Valid JWT
        ├─► org not active → tenantId = null
        │     ├─► @RequiresTenant() → 403 ForbiddenException
        │     └─► (no @RequiresTenant) → request.user = { userId, tenantId: null, role: null }
        │
        └─► org active → tenantId = "org_..."
              └─► request.user = { userId, tenantId: "org_...", role: null }
```

---

## Updated Artifact: `ClerkTokenVerifierService.verify()` Return Type

**Previous** (Feature 008):
```typescript
verify(token: string): Promise<string>  // returns userId only
```

**Updated** (Feature 009):
```typescript
verify(token: string): Promise<{ userId: string; tenantId: string | null }>
```

Claim extraction:
- `userId = payload.sub`
- `tenantId = (payload as any).o?.id ?? null`  // Clerk v2 compact JWT format

---

## Updated Artifact: `VerifyClerkTokenUseCase.execute()` Return Type

**Previous** (Feature 008):
```typescript
execute(token: string): Promise<string>
```

**Updated** (Feature 009):
```typescript
execute(token: string): Promise<{ userId: string; tenantId: string | null }>
```

---

## New Artifact: `IS_TENANT_REQUIRED_KEY` Metadata

| Key | Value | Set by |
|-----|-------|--------|
| `IS_TENANT_REQUIRED_KEY` | `"isTenantRequired"` | `@RequiresTenant()` decorator |

Used by `ClerkJwtGuard` via `this.reflector.getAllAndOverride<boolean>(IS_TENANT_REQUIRED_KEY, [...])`.

---

## New Files

| File | Type | Purpose |
|------|------|---------|
| `src/common/decorators/requires-tenant.decorator.ts` | Decorator | Sets `IS_TENANT_REQUIRED_KEY` metadata |
| `src/common/decorators/current-tenant.decorator.ts` | Decorator | Reads `request.user.tenantId` |

## Modified Files

| File | Change |
|------|--------|
| `src/common/guards/clerk-jwt.guard.ts` | Extract `tenantId` from `o.id`; enforce `@RequiresTenant()` |
| `src/modules/auth/infrastructure/clerk-token-verifier.service.ts` | Return `{ userId, tenantId }` |
| `src/modules/auth/application/verify-clerk-token.use-case.ts` | Return `{ userId, tenantId }` |
| `src/modules/auth/presentation/auth.controller.ts` | Return `{ userId, tenantId }`; add `@RequiresTenant()` |
