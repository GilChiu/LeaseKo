# Quickstart: Prisma ORM Setup

**Feature**: 012 — Prisma ORM Installation and Database Connection

---

## First-Time Setup (after this feature is merged)

```bash
# 1. Install dependencies (includes prisma devDep + @prisma/client dep)
pnpm install

# 2. Start Docker PostgreSQL
pnpm db:up

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and confirm DATABASE_URL matches Docker Compose

# 4. Generate Prisma client
pnpm --filter api prisma:generate
# Or from root:
pnpm db:generate

# 5. Validate schema
pnpm --filter api prisma:validate
# Or from root:
pnpm db:validate

# 6. Build and start the API
pnpm --filter api build
pnpm --filter api dev
```

---

## Available Prisma Scripts

### From `apps/api`

| Script | Command | Purpose |
|--------|---------|---------|
| `prisma:generate` | `prisma generate` | Generate/regenerate Prisma client after schema changes |
| `prisma:validate` | `prisma validate` | Validate schema syntax and datasource connectivity |
| `prisma:format` | `prisma format` | Auto-format schema.prisma |
| `prisma:studio` | `prisma studio` | Open Prisma Studio GUI |
| `prisma:migrate` | `prisma migrate dev` | Run pending migrations (Feature 013+) |

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:validate
pnpm --filter api prisma:format
pnpm --filter api prisma:studio
pnpm --filter api prisma:migrate
```

### From root workspace

```bash
pnpm db:generate   # → pnpm --filter @leaseKo/api prisma:generate
pnpm db:migrate    # → pnpm --filter @leaseKo/api prisma:migrate
pnpm db:studio     # → pnpm --filter @leaseKo/api prisma:studio
pnpm db:validate   # → pnpm --filter @leaseKo/api prisma:validate
pnpm db:format     # → pnpm --filter @leaseKo/api prisma:format
```

---

## Injecting PrismaService in a Repository

`DatabaseModule` is `@Global()` — PrismaService is available in any module without re-importing `DatabaseModule`.

```typescript
// apps/api/src/modules/properties/infrastructure/prisma-property.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { tenantFilter } from '@/common/utils/tenant-filter.util';

@Injectable()
export class PrismaPropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string) {
    return this.prisma.property.findMany({
      where: { ...tenantFilter(tenantId) },
    });
  }
}
```

**Never do this in a controller or use case:**

```typescript
// ❌ FORBIDDEN — controller importing PrismaService
import { PrismaService } from '@/database/prisma/prisma.service'; // NEVER in controllers
```

---

## What Comes Next

| Feature | Content |
|---------|---------|
| Feature 013 | Add `User`, `Tenant`, `TenantMembership` models to schema + run first migration |
| Feature 014 | Add first business model (`Property`) with tenant_id + repository implementation |
