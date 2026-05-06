# Data Model: Swagger API Documentation Setup

**Feature**: `019-swagger-api-docs`
**Created**: 2026-05-06

---

## No New Data Models

This feature introduces no new database tables, Prisma schemas, or domain entities.

---

## Swagger Schema Entities (Presentation Layer Only)

These are OpenAPI/Swagger schema types — they exist only in the API documentation contract, not in the database.

### ErrorResponseDto (existing — `shared/dto/error-response.dto.ts`)

Already updated in feature 018. **No changes.**

```
ErrorResponseDto
├── success: false                         (always false)
└── error: ApiErrorBodyDto
    ├── code: string                       (e.g. "UNAUTHORIZED")
    ├── message: string                    (human-readable)
    ├── statusCode: number                 (mirrors HTTP status)
    ├── timestamp: string                  (ISO 8601)
    ├── path: string                       (request URL)
    └── details?: object                   (field-level validation only)
```

### HealthResponseDto (existing — `modules/health/presentation/dto/health-response.dto.ts`)

No changes needed.

```
HealthResponseDto
├── status: string     ("ok")
├── service: string    ("api")
└── timestamp: string  (ISO 8601)
```

### MeResponseDto (existing — `modules/system/presentation/dto/me-response.dto.ts`)

No changes needed.

```
MeResponseDto
├── userId: string    (Clerk user ID)
└── tenantId: string  (Clerk org ID — mapped to tenant)
```

---

## Swagger Configuration State (after this feature)

| Setting | Before | After |
|---|---|---|
| Title | `"LeaseKo API"` | `"Property Management SaaS API"` |
| Description | `"LeaseKo Property Management SaaS API"` | `"API documentation for the multi-tenant Property Management SaaS backend."` |
| Version | `"1.0"` | `"1.0.0"` |
| Bearer auth | ✅ already configured | ✅ unchanged |
| Production gating | ✅ already configured | ✅ unchanged |
| Endpoint | `/api/docs` | `/api/docs` |

---

## Controller Swagger Decoration State (after this feature)

| Controller | Route | Tags | Auth | OK Response | Error Responses |
|---|---|---|---|---|---|
| `HealthController` | `GET /health` | `System` | Public | `HealthResponseDto` | — |
| `SystemController` | `GET /me` | `System` | Bearer | `MeResponseDto` | 401 → `ErrorResponseDto` ✅ |
| `AuthController` | `GET /auth/me` | `auth` | Bearer | inline schema | 401 → `ErrorResponseDto` (gap → **will fix**) |
| `TenantContextController` | `GET /tenant-context` | `tenant-context` | Bearer | inline schema | 401, 403 → `ErrorResponseDto` (gap → **will fix**) |

---

## Files Created / Modified

| Status | File | Description |
|---|---|---|
| MODIFY | `apps/api/src/main.ts` | Update Swagger title, description, version |
| MODIFY | `apps/api/src/modules/auth/presentation/auth.controller.ts` | Add `type: ErrorResponseDto` to `@ApiUnauthorizedResponse` |
| MODIFY | `apps/api/src/modules/tenant-context/presentation/tenant-context.controller.ts` | Add `type: ErrorResponseDto` to `@ApiUnauthorizedResponse` and `@ApiForbiddenResponse` |
| CREATE | `docs/api-documentation.md` | Developer reference for Swagger documentation patterns |
| MODIFY | `BACKLOG.md` | Mark US 6.1 tasks complete |
