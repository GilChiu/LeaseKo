# Data Model: NestJS API Foundation Setup

**Feature**: 004-nestjs-api-setup
**Date**: 2026-05-02

---

## Overview

This feature introduces **no new database entities**. The Prisma integration task (Feature 005) will define the first real database schema.

This document captures the TypeScript types and interfaces that form the data contracts for the API foundation layer.

---

## 1. Request Context Interface

Represents the authenticated caller's identity attached to every request by the auth guard.

```typescript
// src/common/types/request-context.type.ts

export interface IRequestContext {
  userId: string; // Clerk sub claim from verified JWT (stub: 'stub_user_001')
  tenantId: string; // Clerk org_id claim mapped to tenant (stub: 'stub_tenant_001')
  role: string; // Resolved from application DB after JWT verification (stub: 'stub')
}
```

**Source of truth**: Populated by the auth guard (`StubBearerGuard` now; `ClerkJwtGuard` in Epic 2).
**Usage**: Injected into controllers via `@Req() req: Request & { user: IRequestContext }` until a custom `@CurrentUser()` decorator is introduced.
**Constraint**: NEVER populated by client-supplied data — only by verified JWT claims.

---

## 2. Application Configuration Interface

Represents the validated, typed environment configuration read at startup.

```typescript
// src/common/config/app.config.ts

export interface AppConfig {
  nodeEnv: string; // NODE_ENV — 'development' | 'production' | 'test'
  port: number; // PORT — API HTTP port (default: 3001)
  frontendUrl: string; // FRONTEND_URL — CORS allowed origin
  databaseUrl: string; // DATABASE_URL — PostgreSQL connection string
  redisUrl: string; // REDIS_URL — Redis connection string
  clerkSecretKey: string | undefined; // CLERK_SECRET_KEY — optional until Epic 2
  clerkJwksUrl: string | undefined; // CLERK_JWKS_URL — optional until Epic 2
}
```

**Validation**: All required fields validated by Joi schema at startup. Missing required fields cause immediate process exit with a descriptive error.

---

## 3. Standardized Error Envelope

Shape of every API error response (4xx and 5xx).

```typescript
// src/shared/dto/error-response.dto.ts (already exists)

{
  statusCode: number;   // HTTP status code
  message: string;      // Human-readable error summary
  error?: string;       // Optional additional error detail
}
```

**Enforcement**: `GlobalExceptionFilter` guarantees this shape for ALL error responses. The `ValidationPipe` produces 400 responses; the filter normalizes them. Unknown runtime errors produce 500 responses without stack trace exposure.

---

## 4. Health Response Shape

```typescript
// src/modules/health/presentation/dto/health-response.dto.ts (UPDATED in this feature)

{
  status: string; // Always 'ok' when the endpoint responds
  service: string; // Always 'api' — identifies the service
  timestamp: string; // ISO 8601 UTC timestamp of the response
}
```

**Change from Feature 002**: `service` field added as required by FR-003 and the spec acceptance criteria.

---

## Entity Relationships

No database entities in this feature. The relationship diagram will be populated by Feature 005 (Prisma Integration) which will introduce:

- `Tenant` (maps to Clerk organization)
- `User` (maps to Clerk user, scoped to a tenant)

All future entities will carry a `tenant_id` foreign key as mandated by the constitution.

---

## Module Ownership Map

| Module     | Bounded Context                     | DB Entity (Future) |
| ---------- | ----------------------------------- | ------------------ |
| `auth`     | Identity & authentication           | `User`             |
| `tenants`  | Organization/tenant management      | `Tenant`           |
| `health`   | System observability                | None               |
| `system`   | Developer/debug utilities           | None               |
| `database` | Data access infrastructure          | N/A                |
| `queues`   | Async job processing infrastructure | N/A                |

Future modules (properties, units, leases, payments, etc.) will be scaffolded in later features following the same four-layer pattern established here.
