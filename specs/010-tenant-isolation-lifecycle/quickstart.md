# Quickstart: Tenant Isolation Request Lifecycle Enforcement

**Feature**: 010-tenant-isolation-lifecycle
**Prerequisite features**: 001–009

## Prerequisites

1. Docker Desktop running (`pnpm db:up`)
2. `apps/api/.env` configured with `CLERK_SECRET_KEY`
3. A Clerk application with at least one organization

## Setup

```bash
# From repo root
pnpm install
pnpm --filter @leaseKo/api dev
```

API will be available at `http://localhost:3001`.

---

## Understanding the Decorator System

| Decorator | Requires Token | Requires Active Org | Use For |
|-----------|---------------|---------------------|---------|
| `@Public()` | No | No | Health checks, public system routes |
| `@UserOnly()` | Yes | No | Onboarding, org selection, pre-tenant flows |
| *(none)* | Yes | No | Default — same as user-only |
| `@RequiresTenant()` | Yes | **Yes** | All tenant-scoped business routes |

---

## Getting a Clerk JWT for Testing

### Without active organization (user-only JWT)
1. Sign in at http://localhost:3000 without selecting an organization
2. Open browser console:
```js
const token = await window.Clerk.session.getToken();
console.log(token);  // o claim will be absent → tenantId = null
```

### With active organization (tenant JWT)
1. Sign in and switch to an organization via the org switcher
2. Open browser console:
```js
const token = await window.Clerk.session.getToken();
console.log(token);  // o.id = "org_..." → tenantId populated
```

---

## Testing Tenant Enforcement

### Public route — no token needed
```bash
curl http://localhost:3001/api/v1/health
# → 200 { "status": "ok", "service": "api", "timestamp": "..." }
```

### Protected route — missing token → 401
```bash
curl http://localhost:3001/api/v1/tenant-context
# → 401 Unauthorized
```

### Protected route — invalid token → 401
```bash
curl http://localhost:3001/api/v1/tenant-context \
  -H "Authorization: Bearer invalid-token"
# → 401 Unauthorized
```

### Tenant-required route — valid JWT without org → 403
```bash
curl http://localhost:3001/api/v1/tenant-context \
  -H "Authorization: Bearer <user-only-jwt>"
# → 403 Forbidden
```

### Tenant-required route — valid JWT with org → 200
```bash
curl http://localhost:3001/api/v1/tenant-context \
  -H "Authorization: Bearer <tenant-jwt>"
# → 200 { "tenantId": "org_..." }
```

### User-only route — valid JWT without org → 200
```bash
# GET /auth/me is @RequiresTenant() — use any @UserOnly() route instead
# Default routes (no decorator) accept any valid JWT:
curl http://localhost:3001/api/v1/system/info \
  -H "Authorization: Bearer <user-only-jwt>"
# → 200 (tenantId may be null in context)
```

---

## Using @RequiresTenant() in a Business Route

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequiresTenant } from '../../../common/decorators/requires-tenant.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  @Get()
  @RequiresTenant()  // ← enforces tenantId before this method runs
  list(@CurrentTenant() tenantId: string) {
    // tenantId is guaranteed non-null here
    return this.propertyService.findAll(tenantId);
  }
}
```

## Using @UserOnly() for Pre-Tenant Routes

```typescript
import { Controller, Get } from '@nestjs/common';
import { UserOnly } from '../../../common/decorators/user-only.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IRequestContext } from '../../../common/types/request-context.type';

@Controller('onboarding')
export class OnboardingController {
  @Get('status')
  @UserOnly()  // ← JWT required, tenantId not required
  status(@CurrentUser() user: IRequestContext) {
    // user.tenantId may be null — user hasn't joined an org yet
    return { userId: user.userId, hasOrg: user.tenantId !== null };
  }
}
```

---

## Swagger UI

1. Start the API (`pnpm --filter @leaseKo/api dev`)
2. Open http://localhost:3001/api/docs
3. Click **Authorize** — paste a Clerk JWT (with or without org)
4. Try `GET /tenant-context`:
   - With org JWT → `200 { tenantId }`
   - With user-only JWT → `403 Forbidden`

---

## Future: Prisma Repository Pattern

Every tenant-scoped repository method must accept `tenantId` and filter all queries with it:

```typescript
// ✅ Correct — always filter by tenantId
async findAll(tenantId: string): Promise<Property[]> {
  return this.prisma.property.findMany({ where: { tenantId } });
}

// ❌ Forbidden — unscoped query leaks cross-tenant data
async findAll(): Promise<Property[]> {
  return this.prisma.property.findMany();
}
```

When Prisma repositories are introduced (Feature 011+), this rule becomes enforceable through repository interface contracts.
