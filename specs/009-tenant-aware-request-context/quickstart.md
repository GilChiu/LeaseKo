# Developer Quickstart: Tenant-Aware Request Context

**Feature**: `009-tenant-aware-request-context`
**Date**: 2026-05-03

---

## Prerequisites

- Feature 008 implementation complete (Clerk JWT verification, `APP_GUARD`, `@Public()`, `@CurrentUser()`)
- `CLERK_SECRET_KEY` set in `apps/api/.env`
- Docker running (`pnpm db:up`) — API requires Redis + Postgres for startup
- A Clerk application with Organizations enabled at https://dashboard.clerk.com

---

## 1. Set Up a Test User with an Active Organization

1. Open http://localhost:3000 and sign in with a Clerk account.
2. In the Clerk Dashboard → your app → **Organizations** — create an organization.
3. Ensure the signed-in user is a member of the organization.
4. The user's Clerk session token will now contain an `o.id` (org ID) claim.

---

## 2. Get a Session Token from the Frontend

Open the browser console on http://localhost:3000 after signing in:

```js
const token = await window.Clerk.session.getToken();
console.log(token);
```

Copy the token. It is a short-lived JWT (~60s by default). Re-run if it expires.

---

## 3. Verify the Token Contains Org Context

Decode the JWT at https://jwt.io (paste the token). Confirm the payload contains:

```json
{
  "sub": "user_2abc...",
  "o": {
    "id": "org_456...",
    "slg": "my-org",
    "rol": "admin"
  }
}
```

> If there is no `o` field, the user does not have an active organization. Return to step 1.

---

## 4. Test `GET /auth/me`

```bash
# Start the API (separate terminal)
pnpm --filter @leaseKo/api dev

# Test with valid token + active org → 200
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <paste-token>"

# Expected:
# { "userId": "user_2abc...", "tenantId": "org_456..." }
```

---

## 5. Test Error Cases

```bash
# No token → 401
curl http://localhost:3001/api/v1/auth/me

# Invalid token → 401
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer bad-token"

# Valid token, no active org → 403
# (Obtain a token from a user who is not a member of any org)
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <token-without-org>"
```

---

## 6. Verify Health Endpoint Still Works

```bash
# No token → 200 (public route, unaffected by tenant guard)
curl http://localhost:3001/api/v1/health
```

---

## 7. Test via Swagger UI

1. Open http://localhost:3001/api/docs
2. Click **Authorize** → paste your Clerk session token
3. `GET /auth/me` → Execute → should return `200 { userId, tenantId }`
4. Click **Logout** from Authorize → `GET /auth/me` → Execute → `401`

---

## Using `@CurrentTenant()` in a Controller

```typescript
import { Controller, Get } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequiresTenant } from '../../common/decorators/requires-tenant.decorator';

@Controller('example')
export class ExampleController {
  @Get()
  @RequiresTenant()
  getExample(@CurrentTenant() tenantId: string): { tenantId: string } {
    return { tenantId };
  }
}
```

---

## Future: Passing `tenantId` to Repositories

When Prisma is added (Feature 010+), repositories must receive `tenantId` explicitly from use cases:

```typescript
// ✅ Correct — tenantId comes from verified request context
async execute({ tenantId }: { tenantId: string }) {
  return this.propertyRepo.findAll({ tenantId });
}

// ❌ WRONG — never derive tenantId from client input
async execute(req: Request) {
  const tenantId = req.body.tenantId; // FORBIDDEN
}
```

---

## Future: Including `tenantId` in BullMQ Jobs

```typescript
// ✅ Correct — capture from verified context at job creation time
await this.queue.add('process-payment', {
  tenantId: user.tenantId,
  userId: user.userId,
  paymentId,
});
```
