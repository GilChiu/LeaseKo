# API Contracts: NestJS API Foundation

**Feature**: 004-nestjs-api-setup
**Date**: 2026-05-02

---

## 1. Health Check Endpoint

### `GET /api/v1/health`

**Purpose**: Public liveness probe. No authentication required.

**Request**

```
GET /api/v1/health
```

No headers, query parameters, or body required.

**Response — 200 OK**

```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-05-02T12:00:00.000Z"
}
```

| Field       | Type     | Description                                       |
| ----------- | -------- | ------------------------------------------------- |
| `status`    | `string` | Always `"ok"` when the endpoint responds.         |
| `service`   | `string` | Always `"api"` — identifies the service instance. |
| `timestamp` | `string` | ISO 8601 UTC timestamp at time of response.       |

**No error responses.** If the process is down, the client receives a connection error.

---

## 2. Standardized Error Envelope

**Applies to**: All `4xx` and `5xx` responses across every endpoint.

```json
{
  "statusCode": 400,
  "message": "Validation failed: name must be a string",
  "error": "Bad Request"
}
```

| Field        | Type     | Required | Description                                                                              |
| ------------ | -------- | -------- | ---------------------------------------------------------------------------------------- |
| `statusCode` | `number` | Yes      | HTTP status code (400, 401, 403, 404, 500, etc.)                                         |
| `message`    | `string` | Yes      | Human-readable error summary. For validation errors, lists the first failing constraint. |
| `error`      | `string` | No       | Short error category (e.g., `"Bad Request"`, `"Unauthorized"`).                          |

**Common status codes**:
| Code | Cause |
|---|---|
| `400 Bad Request` | Payload validation failure (missing required field, wrong type) |
| `401 Unauthorized` | Missing or invalid Bearer token |
| `403 Forbidden` | Authenticated but not authorized |
| `404 Not Found` | Unknown route |
| `422 Unprocessable Entity` | Business rule violation |
| `500 Internal Server Error` | Unhandled runtime exception (stack trace never exposed) |

---

## 3. Authenticated Endpoints (Stub)

### `GET /api/v1/me`

**Purpose**: Returns the request context for the authenticated caller. Used to verify that the auth guard is working.

**Request**

```
GET /api/v1/me
Authorization: Bearer <any-non-empty-token>
```

**Response — 200 OK**

```json
{
  "userId": "stub_user_001",
  "tenantId": "stub_tenant_001"
}
```

**Response — 401 Unauthorized**

```json
{
  "statusCode": 401,
  "message": "Missing or invalid Bearer token",
  "error": "Unauthorized"
}
```

**Note**: Stub implementation only. Real Clerk JWT verification replaces this in Epic 2.

---

## 4. Request Context Interface (Internal Contract)

Defines the shape attached to every authenticated request by the auth guard.

```typescript
interface IRequestContext {
  userId: string; // Clerk sub claim
  tenantId: string; // Clerk org_id mapped to tenantId
  role: string; // Resolved from application DB
}
```

**Extended Express Request type**:

```typescript
// Usage in controllers:
@Get('example')
@UseGuards(ClerkJwtGuard)  // Future
example(@Req() req: Request & { user: IRequestContext }): void {
  const { userId, tenantId } = req.user;
}
```

---

## 5. API Versioning

All endpoints are prefixed with `/api/v1` (set globally in `main.ts` via `app.setGlobalPrefix('api/v1')`).

Swagger UI is available at `/api/docs` (development only, bypasses global prefix via `ignoreGlobalPrefix: true`).

---

## 6. CORS Policy

| Environment | Allowed Origin                               |
| ----------- | -------------------------------------------- |
| Development | `http://localhost:3000` (Next.js dev server) |
| Production  | Value of `FRONTEND_URL` environment variable |

All cross-origin requests from origins other than the configured `FRONTEND_URL` are rejected at the HTTP layer.

---

## Future Contracts (Next Features)

| Feature              | Endpoints                                                                |
| -------------------- | ------------------------------------------------------------------------ |
| Epic 2 — Clerk Auth  | `POST /api/v1/auth/verify`, JWT-protected endpoints                      |
| Feature 005 — Prisma | Internal only; no new endpoints                                          |
| Epic 3 — Tenants     | `GET /api/v1/tenants/me`, `PATCH /api/v1/tenants/me`                     |
| Epic 4 — Properties  | `GET/POST /api/v1/properties`, `GET/PATCH/DELETE /api/v1/properties/:id` |
