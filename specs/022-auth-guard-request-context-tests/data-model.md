# Data Model: Auth Guard and Request Context Tests

**Feature**: 022-auth-guard-request-context-tests
**Phase**: 1 — Design Artifacts
**Date**: 2026-05-06

## Overview

This feature is a **testing-only feature**. It introduces no new database tables,
no new Prisma models, and no new entities. The "entities" documented here are the
in-memory types and mock data structures used exclusively within the test suite.

---

## Existing Types (Read-Only — No Changes)

### `IRequestContext`

**File**: `apps/api/src/common/types/request-context.type.ts`  
**Status**: Existing — not modified by this feature

```typescript
interface IRequestContext {
  userId: string;
  tenantId: string | null;
  role: string | null;
}
```

**Significance**: This is the canonical shape attached to `request.user` after the
guard runs. All test assertions for request context target this shape.

---

## Test Data Definitions

These are the fixed mock values used across all test files in this feature.
They are safe, fictional values — no real Clerk user IDs, org IDs, or JWTs.

### Mock Verified Token Result — With Tenant

```typescript
const MOCK_USER_WITH_TENANT = {
  userId: "user_test_123",
  tenantId: "org_test_123",
};
```

### Mock Verified Token Result — No Tenant (User-Only)

```typescript
const MOCK_USER_NO_TENANT = {
  userId: "user_test_123",
  tenantId: null,
};
```

### Mock Request Context (post-guard)

```typescript
const MOCK_REQUEST_CONTEXT: IRequestContext = {
  userId: "user_test_123",
  tenantId: "org_test_123",
  role: null,
};
```

### Mock Token Strings

```typescript
const VALID_TOKEN = "valid-test-token";
const INVALID_TOKEN = "invalid-test-token";
```

---

## Mock Object Shapes

### Mock `VerifyClerkTokenUseCase`

```typescript
const mockVerifyClerkToken = {
  execute: jest.fn(),
};
```

**Variants**:
- **Success with tenant**: `.mockResolvedValue({ userId: "user_test_123", tenantId: "org_test_123" })`
- **Success without tenant**: `.mockResolvedValue({ userId: "user_test_123", tenantId: null })`
- **Failure**: `.mockRejectedValue(new UnauthorizedException())`

### Mock `Reflector`

```typescript
const mockReflector = {
  getAllAndOverride: jest.fn(),
};
```

**Usage pattern** (guard calls `getAllAndOverride` up to 3 times per invocation):

| Route Decoration | Call 1 (IS_PUBLIC_KEY) | Call 2 (IS_USER_ONLY_KEY) | Call 3 (IS_TENANT_REQUIRED_KEY) |
|---|---|---|---|
| `@Public()` | `true` | — (short-circuit) | — |
| Default (no decorator) | `false` | `false` | `false` |
| `@UserOnly()` | `false` | `true` | — (short-circuit) |
| `@RequiresTenant()` | `false` | `false` | `true` |

### Mock `ExecutionContext`

```typescript
function createMockContext(options: {
  authorization?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): ExecutionContext {
  const mockRequest = {
    headers: { authorization: options.authorization },
    body: options.body ?? {},
    query: options.query ?? {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => mockRequest }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}
```

---

## State Transitions

The guard implements a linear decision tree. Each node represents a state the
guard can reach:

```
canActivate() called
       │
       ▼
[1] Check IS_PUBLIC_KEY ──► true ──► return true (bypass)
       │ false
       ▼
[2] Extract Bearer token ──► null ──► throw UnauthorizedException
       │ token string
       ▼
[3] verifyClerkToken.execute(token)
       │ throws ──► propagate UnauthorizedException
       │ resolves { userId, tenantId }
       ▼
[4] Attach request.user = { userId, tenantId, role: null }
       │
       ▼
[5] Check IS_USER_ONLY_KEY ──► true ──► return true (skip tenant check)
       │ false
       ▼
[6] Check IS_TENANT_REQUIRED_KEY ──► true AND tenantId null ──► throw ForbiddenException
       │ false OR tenantId present
       ▼
[7] return true
```

---

## Files To Create (Implementation Phase)

| File | Purpose |
|---|---|
| `apps/api/src/common/guards/clerk-jwt.guard.spec.ts` | Guard unit tests (US1 + US2) |
| `apps/api/src/common/decorators/current-user.decorator.spec.ts` | CurrentUser decorator tests (US3) |
| `apps/api/src/common/decorators/current-tenant.decorator.spec.ts` | CurrentTenant decorator tests (US3) |

No new source files. No new database migrations. No schema changes.
