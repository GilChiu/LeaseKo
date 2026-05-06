# Quickstart: Health Check Endpoint

**Feature**: `020-health-check-endpoint`
**Created**: 2026-05-06

---

## Prerequisites

- Docker running (`docker compose up -d` in `infra/`)
- `.env` file present in `apps/api/`
- `pnpm install` completed at repo root

---

## Start the API

```powershell
pnpm --filter @leaseKo/api start:dev
```

---

## Call the Health Endpoint

```powershell
curl http://localhost:3001/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-05-06T12:00:00.000Z",
  "uptime": 42.37,
  "environment": "development"
}
```

> The global prefix `api/v1` is applied by `app.setGlobalPrefix("api/v1")` in `main.ts`. The Swagger UI displays the route as `GET /health` (due to `ignoreGlobalPrefix: true`), but the actual HTTP path is `/api/v1/health`.

---

## Verify in Swagger UI

1. Open `http://localhost:3001/api/docs`
2. Find `GET /health` under the **System** group
3. No lock icon — no auth required
4. Click **Try it out** → **Execute** (no token needed)
5. Verify `200` response with all 5 fields

---

## Verify Without Database

Stop the PostgreSQL container:

```powershell
docker stop leaseKo-postgres
```

Call the endpoint again:

```powershell
curl http://localhost:3001/api/v1/health
```

Expected: still `200 OK` — confirms the endpoint has no database dependency.

---

## Validation Commands

```powershell
pnpm --filter @leaseKo/api build   # TypeScript compile check
pnpm --filter @leaseKo/api test    # All test suites pass
```

---

## Future: Readiness Endpoint

A future `GET /health/ready` endpoint would check:
- PostgreSQL connectivity
- Redis connectivity
- BullMQ queue health

That endpoint is out of scope for this feature.
