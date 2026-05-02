# Quickstart: Swagger (OpenAPI) Integration

**Feature**: `002-swagger-integration`
**Branch**: `002-swagger-integration`
**Last Updated**: 2026-05-02

---

## Prerequisites

Feature 001 (Monorepo Initialization) must be complete and the API must start successfully.

```bash
# Verify API starts on feature 001 baseline
pnpm --filter @leaseKo/api dev
# → API running on http://localhost:3001
```

---

## Setup

### 1. Install new dependencies in apps/api

```bash
pnpm --filter @leaseKo/api add @nestjs/swagger class-validator class-transformer
```

> `@nestjs/swagger` bundles `swagger-ui-express`. No separate install needed.

### 2. Copy environment variables (if not done already)

```bash
cp .env.example .env
```

Verify `NODE_ENV=development` is set — Swagger UI is only enabled when `NODE_ENV` is not `production`.

---

## Running the API with Swagger

```bash
# From repo root
pnpm --filter @leaseKo/api dev

# Or start all services
pnpm dev
```

Once running, open:

| URL                                 | What                                      |
| ----------------------------------- | ----------------------------------------- |
| http://localhost:3001/api/docs      | Swagger UI (interactive docs)             |
| http://localhost:3001/api/docs-json | Raw OpenAPI JSON spec                     |
| http://localhost:3001/api/v1/health | Health check (public)                     |
| http://localhost:3001/api/v1/me     | Identity endpoint (requires Bearer token) |

---

## Using Swagger UI

### Browse endpoints

1. Open http://localhost:3001/api/docs
2. Endpoints are grouped by tag — **System** contains `/health` and `/me`
3. Click any endpoint to expand it and see the request/response schema

### Test the public health endpoint

1. Expand `GET /api/v1/health`
2. Click **Try it out** → **Execute**
3. Confirm `200 OK` response with `{ "status": "ok", "timestamp": "..." }`

### Test the authenticated /me endpoint

1. Click the **Authorize** button (🔒) at the top right of the Swagger UI
2. In the `bearerAuth` field, paste any non-empty string (in this phase, any value is accepted by the stub guard)
   - Example: `my-test-token`
   - In Epic 2, paste a real Clerk JWT here
3. Click **Authorize** then **Close**
4. Expand `GET /api/v1/me` → **Try it out** → **Execute**
5. Confirm `200 OK` response with `{ "userId": "stub_user_001", "tenantId": "stub_tenant_001" }`

### Test 401 Unauthorized

1. Click **Authorize** → **Logout** to clear the token
2. Execute `GET /api/v1/me` again
3. Confirm `401 Unauthorized` response with error envelope

---

## Verifying Swagger is Disabled in Production

```bash
# Temporarily set NODE_ENV to production
NODE_ENV=production pnpm --filter @leaseKo/api dev

# Attempt to access docs
curl http://localhost:3001/api/docs
# → 404 Not Found (endpoint does not exist)
```

Restore `NODE_ENV=development` before continuing.

---

## File Overview

| File                                                                  | Change                                         |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| `apps/api/src/main.ts`                                                | Added Swagger bootstrap, global ValidationPipe |
| `apps/api/src/shared/dto/error-response.dto.ts`                       | New — reusable error envelope DTO              |
| `apps/api/src/common/guards/stub-bearer.guard.ts`                     | New — stub auth guard for /me                  |
| `apps/api/src/modules/health/health.controller.ts`                    | Updated — Swagger decorators added             |
| `apps/api/src/modules/health/presentation/dto/health-response.dto.ts` | New — health response DTO                      |
| `apps/api/src/modules/system/system.controller.ts`                    | New — GET /me controller                       |
| `apps/api/src/modules/system/system.module.ts`                        | New — System module                            |
| `apps/api/src/modules/system/presentation/dto/me-response.dto.ts`     | New — /me response DTO                         |

---

## Extending Swagger for New Modules

When adding a new module (e.g., `properties`):

1. **Tag the controller**: Add `@ApiTags('Properties')` to the controller class
2. **Protect the controller**: Add `@ApiBearerAuth()` if it's a protected module
3. **Document each method**: Add `@ApiOperation()`, `@ApiOkResponse()`, and all applicable error decorators
4. **Create DTOs**: Add `@ApiProperty()` to every field alongside `class-validator` decorators
5. **Register the module**: Import the new module in `AppModule`

No changes to `main.ts` or the Swagger bootstrap are needed. New tags appear automatically in the Swagger UI.

---

## Next Steps

Once this feature is complete:

1. **Epic 2 (Clerk Authentication)**: Replace `StubBearerGuard` with real Clerk JWKS verification. The `/me` endpoint, `MeResponseDto`, and controller require no changes — only the guard's internal logic is replaced.
2. **Epic 4 (Prisma Data Layer)**: Add `User` and `Tenant` models. Start documenting CRUD endpoints on new modules.
3. **All new modules**: Follow the decorator pattern established here — `@ApiTags()`, `@ApiBearerAuth()`, full `@ApiResponse()` coverage.
