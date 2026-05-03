# Quickstart: Feature 013 — Prisma Base Models

**Branch**: `013-prisma-base-models`

## Developer Setup

### Prerequisites

```bash
# 1. Ensure Docker is running and PostgreSQL container is up
pnpm db:up
pnpm db:ps   # verify leaseKo_postgres is running

# 2. Ensure .env is configured
# apps/api/.env must contain:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo
```

### Schema Update Workflow

```bash
# 1. Validate schema after editing
pnpm --filter api prisma:validate

# 2. Format schema (safe to run any time)
pnpm --filter api prisma:format

# 3. Run migration (Docker must be running)
cd apps/api
pnpm prisma:migrate
# When prompted: enter migration name → init_base_identity_tenant_models

# 4. Regenerate client
pnpm --filter api prisma:generate

# 5. Typecheck and build
pnpm --filter api typecheck
pnpm --filter api build
```

---

## Script Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `pnpm --filter api prisma:validate` | `prisma validate` | Validate schema syntax + datasource |
| `pnpm --filter api prisma:format` | `prisma format` | Auto-format schema.prisma |
| `pnpm --filter api prisma:migrate` | `prisma migrate dev` | Apply pending migrations |
| `pnpm --filter api prisma:generate` | `prisma generate` | Regenerate Prisma client |
| `pnpm db:validate` | delegates to above | Root convenience alias |
| `pnpm db:generate` | delegates to above | Root convenience alias |

---

## Verification

After migration, confirm tables exist:

```bash
# Connect to PostgreSQL via Docker
docker exec -it leaseKo_postgres psql -U postgres -d leaseKo -c "\dt"
# Expected output includes: users, tenants, tenant_memberships
```

Or use Prisma Studio:

```bash
pnpm --filter api prisma:studio
# Open http://localhost:5555
# Confirm Users, Tenants, TenantMemberships collections are visible
```

---

## Using PrismaService in Repositories

```typescript
// CORRECT — inject PrismaService in infrastructure repositories only
@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByClerkUserId(clerkUserId: string) {
    return this.prisma.user.findUnique({
      where: { clerkUserId },
    });
  }
}

// FORBIDDEN — never import PrismaService in controllers, use cases, or domain
// FORBIDDEN — never query prisma.user without correct scoping
// FORBIDDEN — never use tenantId from request body/query as trusted data
```

---

## Future Tenant-Scoped Models

Every business model added after this feature MUST follow this pattern:

```prisma
model Property {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  // ... business fields ...
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("properties")
}
```

And repositories MUST use `tenantFilter()`:

```typescript
import { tenantFilter } from '@/common/utils/tenant-filter.util';

async findMany(tenantId: string): Promise<Property[]> {
  return this.prisma.property.findMany({
    where: tenantFilter(tenantId),
  });
}
```
