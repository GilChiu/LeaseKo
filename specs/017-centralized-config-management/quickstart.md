# Quickstart: Centralized Config Management

**Feature**: 017-centralized-config-management

This guide describes how to set up the API environment for local development after
feature 017 is implemented. The config system validates all required variables at
startup — the API refuses to start if any required variable is missing or invalid.

---

## Prerequisites

- Docker running (PostgreSQL + Redis containers from `infra/docker-compose.yml`)
- Clerk account at [dashboard.clerk.com](https://dashboard.clerk.com)
- Node.js 20+, pnpm 8+

---

## Step 1: Create your `.env` file

```bash
# From the repo root
cp apps/api/.env.example apps/api/.env
```

---

## Step 2: Fill in required values

Open `apps/api/.env` in an editor:

```env
# ─────────────────────────────────────────────────────
# Runtime
# ─────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001

# ─────────────────────────────────────────────────────
# CORS — Next.js dev server origin
# ─────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000

# ─────────────────────────────────────────────────────
# PostgreSQL (Docker — see infra/docker-compose.yml)
# ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo

# ─────────────────────────────────────────────────────
# Redis (Docker — see infra/docker-compose.yml)
# ─────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─────────────────────────────────────────────────────
# Clerk — https://dashboard.clerk.com → API Keys
# ─────────────────────────────────────────────────────
CLERK_SECRET_KEY=sk_test_...         # ← REQUIRED: paste from Clerk dashboard
CLERK_JWKS_URL=                      # ← optional: leave empty (auto-derived)
CLERK_ISSUER=                        # ← optional: leave empty for single-domain
CLERK_AUDIENCE=                      # ← optional: leave empty for default setup
```

**Required variables** (API will not start without these):

| Variable | Where to get it |
|---|---|
| `FRONTEND_URL` | Use `http://localhost:3000` for local dev |
| `DATABASE_URL` | Use the Docker default shown above |
| `REDIS_URL` | Use the Docker default shown above |
| `CLERK_SECRET_KEY` | Clerk Dashboard → Your App → API Keys → **Secret keys** |

**Optional variables** (safe to leave empty):

| Variable | Default | When to set |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` in deployed environments |
| `PORT` | `3001` | Change if port 3001 is already in use |
| `CLERK_JWKS_URL` | Auto-derived | Only for private-network Clerk overrides |
| `CLERK_ISSUER` | `undefined` | Multi-domain JWT validation setups |
| `CLERK_AUDIENCE` | `undefined` | Audience-restricted JWT validation setups |

---

## Step 3: Start infrastructure

```bash
# From repo root — starts PostgreSQL and Redis in Docker
docker compose -f infra/docker-compose.yml up -d
```

---

## Step 4: Run the API

```bash
pnpm --filter @leaseKo/api start:dev
```

**Successful startup** looks like:
```
API running on http://localhost:3001
Swagger UI available at http://localhost:3001/api/docs
```

**Failed startup (missing variable)** looks like:
```
[ExceptionHandler] Config validation error: "CLERK_SECRET_KEY" is required
```
Fix: open `apps/api/.env`, add the missing variable, restart.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `"CLERK_SECRET_KEY" is required` | Missing from `.env` | Paste from Clerk Dashboard |
| `"FRONTEND_URL" must be a valid uri` | Invalid URL format | Must include `http://` or `https://` |
| `"PORT" must be a number` | Non-numeric PORT value | Use an integer, e.g. `3001` |
| `"NODE_ENV" must be one of [development, production, test]` | Invalid value | Use one of the three allowed values |
| API starts but JWT verification fails | Wrong `CLERK_SECRET_KEY` | Verify it matches the Clerk Dashboard secret |

---

## Config Access Pattern (for module authors)

When writing a new infrastructure service that needs config, inject `ConfigService`
and access the typed namespace:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisConfig } from '../../../common/config/redis.config';

@Injectable()
export class MyQueueService {
  constructor(private readonly config: ConfigService) {}

  getRedisUrl(): string {
    return this.config.getOrThrow<string>('redis.url');
  }
}
```

**Never** access `process.env` directly outside `apps/api/src/common/config/`.

---

## Config Namespace Reference

| Namespace | Access Pattern | File |
|---|---|---|
| `app` | `config.get<AppConfig>('app')` | `common/config/app.config.ts` |
| `database` | `config.get<DatabaseConfig>('database')` | `common/config/database.config.ts` |
| `redis` | `config.get<RedisConfig>('redis')` | `common/config/redis.config.ts` |
| `clerk` | `config.get<ClerkConfig>('clerk')` | `common/config/clerk.config.ts` |
