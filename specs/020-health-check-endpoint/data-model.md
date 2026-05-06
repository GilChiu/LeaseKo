# Data Model: Health Check Endpoint

**Feature**: `020-health-check-endpoint`
**Created**: 2026-05-06

---

## No New Database Entities

This feature introduces no new database tables, Prisma schemas, or domain entities. The health response is generated in-memory on every request.

---

## Updated Response Schema

### HealthResponseDto (MODIFY — `modules/health/presentation/dto/health-response.dto.ts`)

| Field | Type | Required | Source | Example |
|---|---|---|---|---|
| `status` | `string` | Yes | hardcoded `"ok"` | `"ok"` |
| `service` | `string` | Yes | hardcoded `"api"` | `"api"` |
| `timestamp` | `string` | Yes | `new Date().toISOString()` | `"2026-05-06T12:00:00.000Z"` |
| `uptime` | `number` | **NEW** | `process.uptime()` (rounded to 2dp) | `42.37` |
| `environment` | `string` | **NEW** | `ConfigService → appConfig.nodeEnv` | `"development"` |

**Before**:
```typescript
{ status: string; service: string; timestamp: string }
```

**After**:
```typescript
{ status: string; service: string; timestamp: string; uptime: number; environment: string }
```

---

## Controller State (after this feature)

### HealthController (MODIFY)

```
HealthController
├── constructor(configService: ConfigService)         ← NEW — was no-arg
├── @Get("health") @Public()
└── check(): HealthResponseDto
    ├── status: "ok"
    ├── service: "api"
    ├── timestamp: new Date().toISOString()
    ├── uptime: Math.round(process.uptime() * 100) / 100   ← NEW
    └── environment: appConfig.nodeEnv                     ← NEW
```

---

## Route Reference

| Route (HTTP) | Swagger UI | Auth | Description |
|---|---|---|---|
| `GET /api/v1/health` | `GET /health` | None (public) | API liveness check |

> Swagger shows `/health` because `ignoreGlobalPrefix: true` is set in `main.ts`.

---

## Files Created / Modified

| Status | File | Description |
|---|---|---|
| MODIFY | `apps/api/src/modules/health/presentation/dto/health-response.dto.ts` | Add `uptime` and `environment` fields |
| MODIFY | `apps/api/src/modules/health/presentation/health.controller.ts` | Inject `ConfigService`, return new fields |
| MODIFY | `apps/api/src/modules/health/health.controller.spec.ts` | Mock `ConfigService`, add 2 new test cases |
| MODIFY | `BACKLOG.md` | Mark US 6.2 tasks `[x]` |
