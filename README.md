# LeaseKo

Property Management SaaS — multi-tenant platform for managing properties, units, leases, and payments.

## Prerequisites

| Tool           | Version   |
| -------------- | --------- |
| Node.js        | >= 20 LTS |
| pnpm           | >= 9      |
| Docker Desktop | >= 4      |

## Quickstart

```bash
# 1. Install all dependencies (once)
pnpm install

# 2. Copy environment files
cp apps/api/.env.example  apps/api/.env
cp apps/web/.env.example  apps/web/.env.local

# 3. Start infrastructure (PostgreSQL + Redis)
pnpm db:up

# 4. Start all apps
pnpm dev
```

## Apps

| App           | URL                                 | Description  |
| ------------- | ----------------------------------- | ------------ |
| Web (Next.js) | http://localhost:3000               | Frontend     |
| API (NestJS)  | http://localhost:3001               | Backend      |
| Health check  | http://localhost:3001/api/v1/health | API liveness |
| Adminer       | http://localhost:8080               | Database GUI |

## Workspace Commands

```bash
pnpm dev          # Start all apps
pnpm build        # Build all apps (with Turborepo cache)
pnpm lint         # Lint all apps and packages
pnpm typecheck    # Type-check all apps and packages
pnpm format       # Format all files with Prettier

# Infrastructure
pnpm db:up        # Start Docker services (PostgreSQL + Redis + Adminer)
pnpm db:down      # Stop all services (volumes preserved)
pnpm db:logs      # Tail logs for all services
pnpm db:ps        # Show container status and health
pnpm db:reset     # Stop services and destroy volumes (destructive)

# Run a single app
pnpm --filter @leaseKo/web dev
pnpm --filter @leaseKo/api dev
```

## Local Infrastructure

All backend services run as Docker containers defined in `infra/docker-compose.yml`.

### Services

| Service    | Image                | Port | Purpose                 |
| ---------- | -------------------- | ---- | ----------------------- |
| `postgres` | `postgres:16-alpine` | 5432 | Primary database        |
| `redis`    | `redis:7-alpine`     | 6379 | Queue broker (BullMQ)   |
| `adminer`  | `adminer:4`          | 8080 | Database GUI (dev only) |

### Adminer Login

Navigate to http://localhost:8080 and use:

| Field    | Value      |
| -------- | ---------- |
| System   | PostgreSQL |
| Server   | `postgres` |
| Username | `postgres` |
| Password | `postgres` |
| Database | `leaseKo`  |

### Environment Variables

The backend reads these from `apps/api/.env` (copy from `apps/api/.env.example`):

| Variable       | Local Default                                           | Required |
| -------------- | ------------------------------------------------------- | -------- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/leaseKo` | Yes      |
| `REDIS_URL`    | `redis://localhost:6379`                                | Yes      |
| `FRONTEND_URL` | `http://localhost:3000`                                 | Yes      |
| `PORT`         | `3001`                                                  | No       |
| `NODE_ENV`     | `development`                                           | No       |

The backend fails fast at startup if `DATABASE_URL` or `REDIS_URL` is missing.

### Troubleshooting

**Port already in use (5432 / 6379 / 8080)**

Another process is using the port. Stop it, or change the port in `infra/.env.docker`:

```bash
# infra/.env.docker
DB_PORT=5433
REDIS_PORT=6380
```

Then update `apps/api/.env` to match:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/leaseKo
REDIS_URL=redis://localhost:6380
```

**Backend fails with `"DATABASE_URL" is required`**

The `apps/api/.env` file is missing. Copy the example:

```bash
cp apps/api/.env.example apps/api/.env
```

**PostgreSQL container exits immediately**

Check logs:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs postgres
```

Common cause: a leftover `postmaster.pid` lock file. Reset the volume:

```bash
pnpm db:reset
pnpm db:up
```

**View logs for a specific service**

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs -f postgres
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker logs -f redis
```

### Next Steps

| Feature     | Description                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Feature 008 | BullMQ Queues — `REDIS_URL` connects queue workers to Redis; every job payload must include `tenantId` + `userId` |
| Feature 009 | Tenant-Aware Request Context — `tenantId` extracted from Clerk JWT `o.id` claim; `@RequiresTenant()` enforces org session; ready for Prisma row-level isolation |

## Clerk Authentication

The frontend uses `@clerk/nextjs` v5 for sign-up, sign-in, and route protection.

### Setup

1. Create an application at https://dashboard.clerk.com
2. Copy environment variables:

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. Fill in `apps/web/.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Environment Variables

| Variable | Exposure | Required | Source |
|----------|----------|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser + Server | Yes | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | **Server only** — never use `NEXT_PUBLIC_` prefix | Yes | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_API_URL` | Browser + Server | Yes | `http://localhost:3001` (local) |

### Routes

| Route | Access | Notes |
|-------|--------|-------|
| `/` | Public | Shows Sign In / Sign Up CTAs when signed out |
| `/sign-in` | Public | Clerk-hosted sign-in UI |
| `/sign-up` | Public | Clerk-hosted sign-up UI |
| `/dashboard` | Protected | Redirects to `/sign-in` if unauthenticated |

For full setup documentation see [specs/007-clerk-auth-nextjs/quickstart.md](specs/007-clerk-auth-nextjs/quickstart.md).

## Clerk JWT Verification (Backend)

The NestJS API verifies every request against Clerk's JWKS. A global `ClerkJwtGuard` is registered as `APP_GUARD` — all routes require a valid Clerk JWT unless decorated with `@Public()`.

### Required Environment Variable

Add to `apps/api/.env`:

```bash
CLERK_SECRET_KEY=sk_test_your_secret_here   # same key as the frontend
```

Obtain from https://dashboard.clerk.com → your application → **API Keys**.  
**Server-side only** — never expose this key to the browser.

### Get a Test JWT

1. Sign in to the web app at http://localhost:3000
2. Open the browser console and run:

```js
const token = await window.Clerk.session.getToken();
console.log(token);
```

3. Copy the token for use in `curl` or Swagger.

### Test the Endpoints

```bash
# Public — no token needed
curl http://localhost:3001/api/v1/health

# Protected — no token → 401
curl http://localhost:3001/api/v1/auth/me

# Protected — invalid token → 401
curl http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer bad"

# Protected — valid JWT without active org → 403
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <token-no-org>"

# Protected — valid Clerk JWT with active org → 200 { userId, tenantId }
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <paste-token-here>"
```

### Swagger UI

1. Open http://localhost:3001/api/docs
2. Click **Authorize** and paste a Clerk JWT
3. Requests will include the `Authorization: Bearer` header automatically

### Architecture Notes

- `ClerkJwtGuard` is registered via `{ provide: APP_GUARD, useClass: ClerkJwtGuard }` in `AuthModule` — this enables full NestJS DI (ConfigService, VerifyClerkTokenUseCase).
- `@Public()` decorator marks routes that bypass the guard (e.g. `GET /health`).
- `@CurrentUser()` param decorator provides typed `IRequestContext` in controllers.
- `@RequiresTenant()` decorator enforces an active organization session — routes decorated with it return `403` when `tenantId` is null.
- `request.user` is always set for authenticated requests; `tenantId` is `null` when no organization is active.

## Structure

```
apps/
  web/      Next.js 14 frontend
  api/      NestJS 10 backend
packages/
  config/   Shared TypeScript + ESLint configs
infra/
  docker-compose.yml   PostgreSQL 16 + Redis 7 + Adminer 4
  .env.docker          Docker service variable defaults (committed)
```

For full setup documentation see [specs/006-docker-local-infra/quickstart.md](specs/006-docker-local-infra/quickstart.md).

## Tenant Context

Every authenticated API request carries a `tenantId` extracted from the Clerk JWT. LeaseKo uses Clerk Organizations as tenants — a user signing in with an active organization session receives a JWT containing the `o` (organization) claim in v2 compact format.

### How It Works

1. `ClerkJwtGuard` calls `verifyToken()` to validate the JWT.
2. The `o.id` field inside the decoded payload becomes `request.user.tenantId`.
3. Routes decorated with `@RequiresTenant()` automatically return `403 Forbidden` when the user has no active organization session.

```typescript
// Require an active org session on any route
@Get('properties')
@RequiresTenant()
list(@CurrentUser() user: IRequestContext) {
  // user.tenantId is guaranteed non-null here
  return this.propertyService.findAll(user.tenantId!);
}

// Read tenantId directly as a parameter
@Get('properties')
@RequiresTenant()
list(@CurrentTenant() tenantId: string) {
  return this.propertyService.findAll(tenantId);
}
```

### Getting a JWT with an Organization Context

1. Sign in to http://localhost:3000 with a user that belongs to an organization.
2. Activate the organization in the Clerk UI (user menu → switch organization).
3. Get the token from the browser console:

```js
const token = await window.Clerk.session.getToken();
console.log(token); // contains o.id = "org_..."
```

### `IRequestContext` Shape

```typescript
interface IRequestContext {
  userId: string;        // Clerk user ID (e.g. "user_2abc...")
  tenantId: string | null; // Clerk org ID (e.g. "org_456...") — null if no active org
  role: string | null;   // Reserved for RBAC (Feature 010+)
}
```

### Prisma Row-Level Isolation (Future)

Every Prisma query on multi-tenant tables should filter by `tenantId`:

```typescript
// Pattern for future use — not yet implemented
this.prisma.property.findMany({ where: { tenantId: user.tenantId! } });
```

For full documentation see [specs/009-tenant-aware-request-context/plan.md](specs/009-tenant-aware-request-context/plan.md).
