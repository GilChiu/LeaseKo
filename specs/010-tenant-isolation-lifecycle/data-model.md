# Data Model: Tenant Isolation Request Lifecycle Enforcement

**Feature**: 010-tenant-isolation-lifecycle
**Date**: 2026-05-03

> This feature introduces **no new database entities**. Tenant isolation enforcement operates entirely within the HTTP request lifecycle — it is a runtime infrastructure concern, not a persistence concern.

---

## Request Context (In-Memory, Per Request)

The sole data structure this feature works with is `IRequestContext`, already defined in `apps/api/src/common/types/request-context.type.ts`.

### IRequestContext

```typescript
interface IRequestContext {
  userId: string;           // Clerk user ID: "user_2abc..."
  tenantId: string | null;  // Clerk org ID: "org_456..." — null when no active org
  role: string | null;      // Reserved for RBAC (Feature 010+) — always null for now
}
```

**Lifecycle**:
1. `ClerkJwtGuard` runs on every non-public request
2. `VerifyClerkTokenUseCase` → `ClerkTokenVerifierService` → `verifyToken()` → extracts `sub` + `o.id`
3. `request.user` is set to `IRequestContext` before any controller executes
4. `@CurrentUser()` / `@CurrentTenant()` decorators surface this to controllers

**Constraints**:
- `tenantId` is ONLY populated from `payload.o?.id` in the verified Clerk JWT
- `tenantId` is NEVER read from body, query, or arbitrary headers
- `role` remains `null` — role resolution is deferred to a future feature

---

## New Metadata Keys

Two metadata keys exist; one is new.

| Key | Constant | Decorator | Existing? |
|-----|----------|-----------|-----------|
| `"isPublic"` | `IS_PUBLIC_KEY` | `@Public()` | ✅ Feature 007 |
| `"isTenantRequired"` | `IS_TENANT_REQUIRED_KEY` | `@RequiresTenant()` | ✅ Feature 009 |
| `"isUserOnly"` | `IS_USER_ONLY_KEY` | `@UserOnly()` | ❌ **NEW — Feature 010** |

---

## Route Decoration Matrix

| Route Type | Required Decorator | Guard Behavior |
|-----------|-------------------|----------------|
| System/infrastructure (health, docs) | `@Public()` | Bypass entirely — no JWT check |
| Business route requiring org context | `@RequiresTenant()` | JWT required + `tenantId` non-null, else `403` |
| Protected route not needing org context | `@UserOnly()` | JWT required, `tenantId` may be null |
| Default (no decorator, no `@Public()`) | *(none)* | JWT required, `tenantId` may be null |

> **Note**: The "default" row is functionally identical to `@UserOnly()`. The explicit `@UserOnly()` decorator is provided for routes that intentionally do NOT require tenant context, making developer intent clear and preventing accidental future addition of `@RequiresTenant()`.

---

## Guard Decision Tree

```
Request arrives
    │
    ├─ @Public()? → ✅ Allow (no JWT check)
    │
    ├─ No Authorization header? → ❌ 401 Unauthorized
    ├─ JWT invalid/expired? → ❌ 401 Unauthorized
    ├─ payload.sub absent? → ❌ 401 Unauthorized
    │
    ├─ Set request.user = { userId, tenantId, role: null }
    │
    ├─ @RequiresTenant()? AND tenantId === null? → ❌ 403 Forbidden
    │
    └─ ✅ Allow (pass to controller)
```

---

## Future Entities (Out of Scope — Documentation Only)

### Tenant (future Prisma model)
Fields to include when created: `id`, `clerk_org_id` (unique), `name`, `plan`, `created_at`, `updated_at`

### TenantUser (future Prisma model)
Fields: `tenant_id` (FK), `user_id` (Clerk user ID), `role` (`owner | manager | tenant_user`), `created_at`

> **Rule**: Every future entity that stores tenant-scoped data MUST have `tenant_id TEXT NOT NULL` with a database index.

---

## BullMQ Job Context Shape (Future Rule — Documentation Only)

Every job created from a tenant-scoped request must pass this payload:

```typescript
interface TenantJobPayload {
  tenantId: string;  // From request.user.tenantId
  userId: string;    // From request.user.userId
  // ...job-specific data
}
```

This is documented here as a readiness note; no queue implementation is part of this feature.
