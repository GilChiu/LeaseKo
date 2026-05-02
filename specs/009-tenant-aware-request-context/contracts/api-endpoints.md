# API Endpoints: Tenant-Aware Request Context

**Feature**: `009-tenant-aware-request-context`
**Date**: 2026-05-03

---

## POST / Verification Principle

All endpoint contracts below apply to routes in `apps/api` under the global prefix `api/v1`.

---

## GET /auth/me

**Description**: Returns the verified userId and tenantId from the authenticated request context. No database access.

**Authentication**: Required — Bearer JWT

**Tenant Required**: Yes — `@RequiresTenant()` enforced

**Route**: `GET /api/v1/auth/me`

### Request

```
GET /api/v1/auth/me
Authorization: Bearer <clerk-session-token>
```

No request body or query parameters.

### Responses

#### 200 OK

```json
{
  "userId": "user_2abc123",
  "tenantId": "org_456xyz"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Clerk user ID from verified JWT `sub` claim |
| `tenantId` | `string` | Clerk org ID from verified JWT `o.id` claim |

#### 401 Unauthorized

Missing or invalid Bearer token.

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

Triggers when:
- `Authorization` header is absent
- Token is malformed, expired, or fails JWKS verification

#### 403 Forbidden

Authenticated but no active organization context.

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

Triggers when:
- JWT is valid, `userId` is present, but `o.id` is absent (user not in an org or no active org)

---

## GET /health

**Description**: API liveness check. Public — no authentication required.

**Authentication**: None

**Tenant Required**: No — `@Public()` decorated

**Route**: `GET /api/v1/health`

### Responses

#### 200 OK

```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-05-03T00:00:00.000Z"
}
```

---

## Route Protection Matrix

| Route | Auth Required | Tenant Required | 401 | 403 |
|-------|:---:|:---:|:---:|:---:|
| `GET /health` | No | No | — | — |
| `GET /api/docs` | No | No | — | — |
| `GET /auth/me` | Yes | Yes | ✓ | ✓ |
| All other routes | Yes | No* | ✓ | — |

*Future business routes will add `@RequiresTenant()` as they are implemented.

---

## Security Contract

- `tenantId` is NEVER accepted from request body, query parameters, or custom headers.
- `tenantId` comes exclusively from the verified JWT `o.id` claim.
- Error responses MUST NOT include raw JWT claims, token payload, or Clerk internals.
- All `401` and `403` responses use NestJS default `UnauthorizedException` / `ForbiddenException` bodies.
