# Quickstart: Auth Guard and Request Context Tests

**Feature**: 022-auth-guard-request-context-tests
**Date**: 2026-05-06

## Overview

This guide explains how to run the auth guard and request context test suite after
implementation is complete.

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- No database, no Redis, no Clerk credentials required

---

## Running the Tests

### All API unit tests (includes new guard/decorator specs)

```bash
pnpm --filter @leaseKo/api test
```

### Watch mode (re-runs on file change)

```bash
pnpm --filter @leaseKo/api test -- --watch
```

### Run only the guard spec

```bash
pnpm --filter @leaseKo/api test -- --testPathPattern="clerk-jwt.guard.spec"
```

### Run only the decorator specs

```bash
pnpm --filter @leaseKo/api test -- --testPathPattern="decorator.spec"
```

### With coverage

```bash
pnpm --filter @leaseKo/api test -- --coverage
```

---

## New Test Files (after implementation)

| File | Tests |
|---|---|
| `apps/api/src/common/guards/clerk-jwt.guard.spec.ts` | 12 cases — guard behavior, all metadata permutations, tenant injection security |
| `apps/api/src/common/decorators/current-user.decorator.spec.ts` | 2 cases — full context and null-safe read |
| `apps/api/src/common/decorators/current-tenant.decorator.spec.ts` | 2 cases — tenantId present and null |

---

## What Is Mocked

| Dependency | Mocked As |
|---|---|
| `VerifyClerkTokenUseCase` | `{ execute: jest.fn() }` — returns `{ userId, tenantId }` or throws |
| `Reflector` | `{ getAllAndOverride: jest.fn() }` — returns metadata booleans |
| `ExecutionContext` | Plain object via `createMockContext()` factory |
| HTTP `Request` | Plain object — `{ headers, body, query }` |

## What Is NOT Required

- No Clerk secret key or JWKS URL
- No `DATABASE_URL` or PostgreSQL container
- No Redis connection
- No `.env` file
- No Docker Compose
- No network access

---

## Key Auth Guard Behaviors (What the Tests Verify)

| Scenario | Expected Result |
|---|---|
| `@Public()` route, no token | `true` — bypass |
| Protected route, no header | `UnauthorizedException` |
| `Authorization: token123` (no prefix) | `UnauthorizedException` |
| `Authorization: Bearer ` (empty) | `UnauthorizedException` |
| `Authorization: Bearer invalid-token` | `UnauthorizedException` (verifier rejects) |
| Valid token, `tenantId: "org_test_123"` | `true`, `request.user` attached |
| `@UserOnly()`, valid token, `tenantId: null` | `true` (tenant not required) |
| `@RequiresTenant()`, valid token, `tenantId: null` | `ForbiddenException` |
| `@RequiresTenant()`, valid token, `tenantId` present | `true` |
| Body/query/header `tenantId` injection | Ignored — `request.user.tenantId` from JWT only |

---

## Validation Commands

After implementation, run these to confirm everything still passes:

```bash
# Unit tests
pnpm --filter @leaseKo/api test

# TypeScript typecheck
pnpm --filter @leaseKo/api typecheck

# Lint
pnpm --filter @leaseKo/api lint

# Build
pnpm --filter @leaseKo/api build
```

All four must exit 0.
