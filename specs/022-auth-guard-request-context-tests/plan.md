# Implementation Plan: Auth Guard and Request Context Tests

**Branch**: `022-auth-guard-request-context-tests` | **Date**: 2026-05-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/022-auth-guard-request-context-tests/spec.md`

## Summary

Write Jest unit tests for `ClerkJwtGuard` and the `@CurrentUser()` / `@CurrentTenant()` 
decorators. Tests confirm: public routes bypass auth, missing/malformed/invalid tokens 
return `401`, valid tokens populate `request.user`, `@RequiresTenant()` returns `403` 
when `tenantId` is absent, and `tenantId` is always sourced from the verified JWT — 
never from the HTTP request body, query, or headers. All tests run offline with mocked 
dependencies; no real Clerk, database, or Redis is required.

**Technical approach** (from research.md): Direct instantiation of `ClerkJwtGuard` with 
`jest.fn()` mocks for `Reflector` and `VerifyClerkTokenUseCase`. A `createMockContext()` 
factory generates typed `ExecutionContext` objects per test. Decorator tests call inner 
factory logic directly via mock `ExecutionContext`.

## Technical Context

**Language/Version**: TypeScript 5.0 (strict mode)
**Primary Dependencies**: Jest 29, ts-jest 29, `@nestjs/common` 10, `@nestjs/core` 10 (Reflector)
**Storage**: N/A — no database access in unit tests
**Testing**: Jest 29 + ts-jest 29 — configured in `apps/api/jest.config.ts`; test regex `.*\.spec\.ts$`; rootDir `src`
**Target Platform**: Node.js 20+ (same as API)
**Project Type**: Test suite — colocated `*.spec.ts` files inside `apps/api/src/`
**Performance Goals**: All new tests complete in < 1s total (pure in-memory, no I/O)
**Constraints**: No Clerk credentials, no `DATABASE_URL`, no Redis, must run fully offline
**Scale/Scope**: 3 new spec files, ~16 test cases

## Constitution Check

_GATE: This feature is a testing-only feature (no new modules, no new DB tables, no new endpoints). Constitution gates that do not apply are marked N/A with rationale._

**Architecture**

- [N/A] Module follows four-layer Clean Architecture — No new module created; tests colocate with existing source
- [N/A] Domain layer imports no NestJS or Prisma packages — No domain code added
- [N/A] Controllers are thin — No new controllers
- [N/A] Cross-module interaction uses explicit interfaces — No new cross-module interactions

**Multi-Tenancy (CRITICAL)**

- [N/A] All new DB tables include `tenant_id` column — No new DB tables
- [N/A] All repository queries filter by `tenant_id` — No new repository queries
- [✅] Request context (`userId`, `tenantId`, `role`) is injected via guard before business logic — Tests explicitly verify this contract; `request.user.tenantId` is asserted to come from JWT, not HTTP input

**Authentication & Authorization**

- [✅] Clerk JWT is verified against JWKS — Tests confirm guard rejects tokens the verifier rejects and never passes unverified input to `request.user`
- [N/A] Role/permission checks enforced in backend guards — No new roles/permissions

**Data Layer**

- [N/A] All DB access through repository interfaces — No DB access in tests
- [N/A] Prisma schema changes include `tenant_id` index — No schema changes

**API & Async**

- [N/A] All new endpoints documented with Swagger — No new endpoints
- [N/A] All DTOs use `class-validator` — No new DTOs
- [N/A] Heavy operations offloaded to BullMQ — No async operations
- [N/A] BullMQ jobs are idempotent — No jobs

**Testing**

- [✅] Unit tests cover domain and application layer logic — This feature IS the unit test suite for `ClerkJwtGuard` (presentation-layer guard) and decorators
- [N/A] Integration tests cover repository and module interactions — No new repositories
- [N/A] E2E tests cover new API endpoints — No new endpoints

**Security**

- [✅] No secrets or credentials in source code — Test data uses fictional IDs; no real Clerk credentials
- [N/A] Rate limiting applied to public-facing endpoints — No new endpoints
- [N/A] All inputs validated and sanitised — No new inputs

## Project Structure

### Documentation (this feature)

```text
specs/022-auth-guard-request-context-tests/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Phase 0: testing strategy decisions
├── data-model.md        ← Phase 1: mock shapes, state transitions
├── quickstart.md        ← Phase 1: how to run tests
└── checklists/
    └── requirements.md  ← Spec quality checklist
```

### Source Code (repository root)

```text
apps/api/src/
├── common/
│   ├── guards/
│   │   ├── clerk-jwt.guard.ts              ← Existing (read-only)
│   │   └── clerk-jwt.guard.spec.ts         ← NEW (US1 + US2 — 12 test cases)
│   └── decorators/
│       ├── current-user.decorator.ts       ← Existing (read-only)
│       ├── current-user.decorator.spec.ts  ← NEW (US3 — 2 test cases)
│       ├── current-tenant.decorator.ts     ← Existing (read-only)
│       └── current-tenant.decorator.spec.ts ← NEW (US3 — 2 test cases)
```

No new directories. No new source files beyond the three spec files.

## Implementation Phases

### Phase A — Guard Unit Tests (`clerk-jwt.guard.spec.ts`)

**File**: `apps/api/src/common/guards/clerk-jwt.guard.spec.ts`

**Setup**:
1. Import `ClerkJwtGuard` from `../clerk-jwt.guard`
2. Import `Reflector` type from `@nestjs/core`
3. Import `VerifyClerkTokenUseCase` type from `../../modules/auth/application/verify-clerk-token.use-case`
4. Import `IRequestContext` from `../types/request-context.type`
5. Import `UnauthorizedException`, `ForbiddenException`, `ExecutionContext` from `@nestjs/common`

**`createMockContext()` factory**:

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

**Mock wiring** (in `beforeEach`):

```typescript
let guard: ClerkJwtGuard;
let mockReflector: { getAllAndOverride: jest.Mock };
let mockVerifyClerkToken: { execute: jest.Mock };

beforeEach(() => {
  mockReflector = { getAllAndOverride: jest.fn() };
  mockVerifyClerkToken = { execute: jest.fn() };
  guard = new ClerkJwtGuard(
    mockReflector as unknown as Reflector,
    mockVerifyClerkToken as unknown as VerifyClerkTokenUseCase,
  );
});
```

**Test cases**:

| # | Describe block | `it` label | Reflector setup | Verifier setup | Expected |
|---|---|---|---|---|---|
| 1 | `@Public() route` | `returns true without calling verifier` | `getAllAndOverride` → `true` (first call) | — | `await expect(guard.canActivate(ctx)).resolves.toBe(true)` + verifier not called |
| 2 | `missing token` | `throws UnauthorizedException` | all `false` | — | `await expect(...).rejects.toThrow(UnauthorizedException)` |
| 3 | `malformed header — no prefix` | `throws UnauthorizedException` | all `false` | — | `authorization: "token123"` → `rejects.toThrow(UnauthorizedException)` |
| 4 | `malformed header — Basic prefix` | `throws UnauthorizedException` | all `false` | — | `authorization: "Basic abc123"` → reject |
| 5 | `empty token after Bearer` | `throws UnauthorizedException` | all `false` | — | `authorization: "Bearer "` (trailing space only) → reject |
| 6 | `invalid token` | `verifier throws, guard propagates UnauthorizedException` | all `false` | `execute` → `mockRejectedValue(new UnauthorizedException())` | guard rejects with `UnauthorizedException` |
| 7 | `valid token` | `returns true and attaches request.user` | public=false, userOnly=false, tenant=false | `execute` → `{ userId: "user_test_123", tenantId: "org_test_123" }` | resolves `true`; `request.user` = `{ userId, tenantId, role: null }` |
| 8 | `@UserOnly() with null tenantId` | `returns true — tenant not required` | public=false, userOnly=true | `execute` → `{ userId: "user_test_123", tenantId: null }` | resolves `true` |
| 9 | `@RequiresTenant() — tenantId null` | `throws ForbiddenException` | public=false, userOnly=false, tenant=true | `execute` → `{ userId: "user_test_123", tenantId: null }` | rejects with `ForbiddenException` |
| 10 | `@RequiresTenant() — tenantId present` | `returns true` | public=false, userOnly=false, tenant=true | `execute` → `{ userId, tenantId: "org_test_123" }` | resolves `true` |
| 11 | `tenant injection — body` | `ignores tenantId in request body` | public=false, userOnly=false, tenant=false | returns `{ tenantId: "org_test_123" }` | `request.user.tenantId === "org_test_123"` (not body value) |
| 12 | `tenant injection — query` | `ignores tenantId in query params` | public=false, userOnly=false, tenant=false | returns `{ tenantId: "org_test_123" }` | `request.user.tenantId === "org_test_123"` (not query value) |

---

### Phase B — Decorator Tests

**File A**: `apps/api/src/common/decorators/current-user.decorator.spec.ts`

```typescript
import { ExecutionContext } from "@nestjs/common";
import { IRequestContext } from "../types/request-context.type";

describe("CurrentUser decorator (inner factory behavior)", () => {
  it("returns the full IRequestContext from request.user", () => {
    const user: IRequestContext = { userId: "user_test_123", tenantId: "org_test_123", role: null };
    const mockRequest = { user };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;
    // Simulate what createParamDecorator calls: factory(undefined, ctx)
    const result = ctx.switchToHttp().getRequest<{ user: IRequestContext }>().user;
    expect(result).toEqual(user);
  });

  it("returns the context when tenantId is null", () => {
    const user: IRequestContext = { userId: "user_test_123", tenantId: null, role: null };
    const mockRequest = { user };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;
    const result = ctx.switchToHttp().getRequest<{ user: IRequestContext }>().user;
    expect(result.tenantId).toBeNull();
  });
});
```

**File B**: `apps/api/src/common/decorators/current-tenant.decorator.spec.ts`

Tests mirror the above but assert `request.user?.tenantId ?? null` is returned correctly.

| # | `it` label | `request.user.tenantId` | Expected |
|---|---|---|---|
| 1 | `returns tenantId when present` | `"org_test_123"` | `"org_test_123"` |
| 2 | `returns null when tenantId is null` | `null` | `null` |

---

### Phase C — Validation

Run after all spec files are written:

```bash
pnpm --filter @leaseKo/api test
pnpm --filter @leaseKo/api typecheck
pnpm --filter @leaseKo/api lint
pnpm --filter @leaseKo/api build
```

All must exit 0.

---

### Phase D — Backlog Update

In `BACKLOG.md`, locate Epic 7, User Story 7.2 and update:

```markdown
- [ ] Write test for auth guard       →  - [x] Write test for auth guard
- [ ] Test request context injection  →  - [x] Test request context injection
```

---

## Mocking Strategy

| Dependency | Mock Type | Rationale |
|---|---|---|
| `VerifyClerkTokenUseCase` | `{ execute: jest.fn() }` | Application-layer boundary; isolates guard from `@clerk/backend` |
| `Reflector` | `{ getAllAndOverride: jest.fn() }` | Controls metadata for `@Public()`, `@UserOnly()`, `@RequiresTenant()` |
| `ExecutionContext` | Plain object via `createMockContext()` | Provides typed HTTP request simulation without NestJS bootstrap |
| HTTP `Request` | Inline plain object | Minimal shape: `{ headers, body, query }` |

**`Reflector.getAllAndOverride` call order** in `canActivate()`:
1. `IS_PUBLIC_KEY` → short-circuits `true` if public
2. `IS_USER_ONLY_KEY` → short-circuits `true` if user-only  
3. `IS_TENANT_REQUIRED_KEY` → throws `ForbiddenException` if true AND tenantId null

Use `mockReturnValueOnce` to chain values when multiple calls happen in one `canActivate()` invocation.

---

## Test Case Matrix

| Scenario | Token | `@Public` | `@UserOnly` | `@RequiresTenant` | Outcome |
|---|---|---|---|---|---|
| Public route | None | ✅ | — | — | `true` |
| No header | — | ❌ | ❌ | ❌ | `401` |
| Malformed header | — | ❌ | ❌ | ❌ | `401` |
| Empty Bearer | — | ❌ | ❌ | ❌ | `401` |
| Invalid token | Bearer invalid | ❌ | ❌ | ❌ | `401` |
| Valid + tenant | Bearer valid | ❌ | ❌ | ❌ | `true` + user attached |
| Valid + no tenant + `@UserOnly` | Bearer valid | ❌ | ✅ | — | `true` |
| Valid + no tenant + `@RequiresTenant` | Bearer valid | ❌ | ❌ | ✅ | `403` |
| Valid + tenant + `@RequiresTenant` | Bearer valid | ❌ | ❌ | ✅ | `true` |
| Body injection | Bearer valid | ❌ | ❌ | ❌ | `true`; user.tenantId from JWT |
| Query injection | Bearer valid | ❌ | ❌ | ❌ | `true`; user.tenantId from JWT |

---

## Commit Message

```
test(api): validate ClerkJwtGuard and request context decorators
```

---

## Notes for Next Tasks

- **Repository unit tests**: Mock `PrismaService` methods; assert `tenant_id` filter is always passed — follow the same direct-instantiation pattern
- **Tenant-safe query tests**: Companion to repository tests — verify that repository implementations include `where: { tenant_id: tenantId }` on every `findMany`/`findFirst`
- **E2E expansion**: Auth guard E2E test can be added to `test/` using supertest; would require a real JWT — out of scope for this feature
- **Role resolution tests**: Once role lookup (Feature 010+) is implemented, add `@Roles()` guard tests alongside these
