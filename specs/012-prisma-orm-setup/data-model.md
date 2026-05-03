# Data Model: Prisma ORM Setup

**Feature**: 012 — Prisma ORM Installation and Database Connection
**Created**: 2026-05-03

---

## Overview

This feature introduces no new business domain entities. It establishes the infrastructure layer that future business models will be built upon.

The two infrastructure entities modified or created in this feature are:

1. **`schema.prisma`** — Prisma schema file (datasource + generator only)
2. **`PrismaService`** — NestJS service that manages the Prisma client lifecycle

---

## `schema.prisma`

**File**: `apps/api/prisma/schema.prisma`

```prisma
// Prisma schema — LeaseKo backend
// https://www.prisma.io/docs/concepts/components/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────────────────────────────────────────
// MODELS
//
// Feature 013 (Base Schema Models) will add:
//   - User      (global — no tenantId)
//   - Tenant    (global — no tenantId)
//   - TenantMembership (junction — tenantId as FK, not isolation field)
//
// Feature 014+ (Business Modules) will add tenant-scoped models:
//   - Property, Unit, Lease, Payment, MaintenanceRequest, etc.
//   All must include: tenantId String @map("tenant_id") + @@index([tenantId])
//   See: docs/tenant-isolation.md
// ──────────────────────────────────────────────────────────────────────────────
```

**Why generator before datasource**: Prisma convention places `generator` first. Enforced by `prisma format`.

---

## `PrismaService`

**File**: `apps/api/src/database/prisma/prisma.service.ts`

Replaces the existing placeholder.

```typescript
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — manages the Prisma client lifecycle inside NestJS.
 *
 * Architecture rule (NON-NEGOTIABLE):
 * This service MUST only be imported by repository implementations inside
 * the `infrastructure/` layer of each module.
 * NEVER import PrismaService in:
 *   - controllers (presentation layer)
 *   - use cases (application layer)
 *   - domain services or entities (domain layer)
 *
 * @see docs/tenant-isolation.md — tenant-safe query patterns
 * @see apps/api/src/common/utils/tenant-filter.util.ts — required for all repository queries
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('PrismaService connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('PrismaService disconnected from PostgreSQL');
  }
}
```

**Key decisions**:
- `OnModuleInit.$connect()` — eager connection on startup; surfaces `DATABASE_URL` errors immediately at boot rather than on first query.
- `OnModuleDestroy.$disconnect()` — clean shutdown; prevents open connection pool during graceful restart.
- No tenant middleware in this service — tenant filtering is handled at repository level via `tenantFilter(tenantId)` utility.
- No `enableShutdownHooks()` — `OnModuleDestroy` is sufficient when NestJS lifecycle is managed by `app.close()`.

---

## `DatabaseModule` (No Change)

**File**: `apps/api/src/database/prisma/prisma.module.ts`

The existing module already has the correct structure. **No changes needed** to this file.

```typescript
// Already correct — no edits required
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

---

## Clean Architecture Layer Rules

| What | Layer | May use PrismaService? |
|------|-------|----------------------|
| `PrismaService` | Infrastructure | Yes — it IS Prisma |
| Prisma repository (future) | Infrastructure | Yes — inject via constructor |
| Use case | Application | No — depends on repository interface only |
| Controller | Presentation | No — depends on use case only |
| Domain entity / service | Domain | No — no external imports allowed |

---

## Environment Variables

| Variable | Required | Example | Used by |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/leaseKo` | Prisma schema, PrismaService |

`DATABASE_URL` is already validated by the Joi schema in `apps/api/src/common/config/validation.schema.ts` — no changes needed there.

---

## State Transitions

Not applicable — this feature introduces lifecycle state in `PrismaService` (disconnected → connected → disconnected) but no business state machines.
