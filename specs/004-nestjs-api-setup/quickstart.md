# Quickstart: NestJS API (apps/api)

**Feature**: 004-nestjs-api-setup
**Date**: 2026-05-02

---

## Prerequisites

- Node.js ≥20
- pnpm ≥9 (`npm install -g pnpm`)
- Docker Desktop (optional — needed for PostgreSQL + Redis connections; API starts without them in placeholder mode)

---

## 1. Install dependencies

From the monorepo root:

```bash
pnpm install
```

---

## 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

The `.env.example` provides development defaults for all required variables. The API starts without PostgreSQL or Redis running — the database and queue modules are placeholders until Feature 005 and Feature 007.

---

## 3. Start the API (development)

**App-level** (hot reload via `nest start --watch`):
```bash
pnpm --filter @leaseKo/api dev
```

**Monorepo root** (all apps via Turborepo):
```bash
pnpm dev
```

The API starts at `http://localhost:3001`.

---

## 4. Verify the API is running

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-05-02T12:00:00.000Z"
}
```

---

## 5. Verify the auth stub

```bash
curl -H "Authorization: Bearer any-token-here" http://localhost:3001/api/v1/me
```

Expected response:
```json
{
  "userId": "stub_user_001",
  "tenantId": "stub_tenant_001"
}
```

Without a token:
```json
{
  "statusCode": 401,
  "message": "Missing or invalid Bearer token",
  "error": "Unauthorized"
}
```

---

## 6. View Swagger UI

Open in browser (development only):
```
http://localhost:3001/api/docs
```

---

## 7. Build

```bash
# App-level
pnpm --filter @leaseKo/api build

# Monorepo root
pnpm build
```

Compiled output is written to `apps/api/dist/`.

---

## 8. Lint

```bash
# App-level
pnpm --filter @leaseKo/api lint

# Monorepo root
pnpm lint
```

---

## 9. Run tests

```bash
# App-level
pnpm --filter @leaseKo/api test

# Watch mode
pnpm --filter @leaseKo/api test:watch
```

---

## 10. Start (production mode)

After building:

```bash
pnpm --filter @leaseKo/api start
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `3001` | HTTP port the API listens on |
| `FRONTEND_URL` | **Yes** | `http://localhost:3000` | CORS allowed origin (Next.js frontend URL) |
| `DATABASE_URL` | **Yes** | See `.env.example` | PostgreSQL connection string |
| `REDIS_URL` | **Yes** | `redis://localhost:6379` | Redis connection string |
| `CLERK_SECRET_KEY` | Optional* | — | Clerk secret key (required when Clerk is integrated — Epic 2) |
| `CLERK_JWKS_URL` | Optional* | — | Clerk JWKS endpoint URL (required when Clerk is integrated — Epic 2) |

*Optional for this feature; will become required when Clerk authentication is integrated.

---

## Troubleshooting

**API fails to start with "Configuration validation error"**
→ A required environment variable is missing. Check the error message for the variable name, then add it to `apps/api/.env`.

**Port 3001 already in use**
→ Change `PORT` in `apps/api/.env` to another port.

**`nest` command not found**
→ Run `pnpm install` from the monorepo root to install `@nestjs/cli` locally.
