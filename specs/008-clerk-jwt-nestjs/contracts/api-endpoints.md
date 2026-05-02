# API Contracts: Clerk JWT Verification

**Feature**: 008-clerk-jwt-nestjs
**Date**: 2026-05-02

---

## GET /api/v1/me

**Purpose**: Verify that the NestJS backend can verify a Clerk JWT and extract the authenticated `userId` from it. Returns the authenticated user context. No database query is performed.

**Authentication**: Required — Bearer token in `Authorization` header.

### Request

```http
GET /api/v1/me HTTP/1.1
Host: localhost:3001
Authorization: Bearer <clerk-jwt>
```

### Response — 200 OK

```json
{
  "userId": "user_2abc123def456"
}
```

| Field | Type | Source |
|-------|------|--------|
| `userId` | string | JWT `sub` claim from verified Clerk token |

### Response — 401 Unauthorized (missing token)

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Response — 401 Unauthorized (invalid/expired token)

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Security note**: The error body is identical for all 401 cases. Internal verification failure reasons are never exposed in the response.

---

## GET /api/v1/health (unchanged — public)

**Purpose**: Infrastructure liveness probe. Public — no authentication required.

**Authentication**: None.

### Request

```http
GET /api/v1/health HTTP/1.1
Host: localhost:3001
```

### Response — 200 OK

```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-05-02T10:00:00.000Z"
}
```

**Verification**: This endpoint must continue to return `200` with no `Authorization` header after the global `ClerkJwtGuard` is enabled. Failure here means `@Public()` is not working correctly.
