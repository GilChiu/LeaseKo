# Quickstart: Swagger API Documentation

**Feature**: `019-swagger-api-docs`
**Created**: 2026-05-06

---

## Prerequisites

- Docker running (`pnpm docker:up` or `docker compose up -d` in `infra/`)
- `.env` file present in `apps/api/` with valid values
- `pnpm install` completed at repo root

---

## Start the API in Development Mode

```powershell
pnpm --filter @leaseKo/api start:dev
```

---

## Open the Swagger UI

Navigate to:

```
http://localhost:3001/api/docs
```

> The port is controlled by `PORT` in `apps/api/.env` (default: `3001`).

---

## Authorize with a Bearer Token

1. Click the **Authorize** button (lock icon, top-right of the Swagger UI).
2. In the **BearerAuth** field, paste a valid Clerk-issued JWT (obtain from the frontend session or Clerk dashboard).
3. Click **Authorize** → **Close**.
4. All protected endpoints will now send `Authorization: Bearer <token>` automatically.

---

## Verify Endpoints in the UI

| Endpoint | Group | Auth Required |
|---|---|---|
| `GET /health` | System | No |
| `GET /me` | System | Bearer JWT |
| `GET /auth/me` | auth | Bearer JWT |
| `GET /tenant-context` | tenant-context | Bearer JWT + active org |

---

## Verify the OpenAPI JSON

The raw OpenAPI spec is available at:

```
http://localhost:3001/api/docs-json
```

This URL is generated automatically by `@nestjs/swagger`.

---

## Production Mode Check

When `NODE_ENV=production`, the Swagger UI is **not served**. Attempting to access `/api/docs` returns a `404`. This is intentional.

---

## Validation Commands

```powershell
# TypeScript compile check
pnpm --filter @leaseKo/api build

# All tests pass
pnpm --filter @leaseKo/api test
```
