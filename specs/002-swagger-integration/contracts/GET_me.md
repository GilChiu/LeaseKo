# API Contract: GET /me

**Module**: System
**Tag**: `System`
**Auth**: Bearer JWT (required)
**Feature**: `002-swagger-integration`

---

## Endpoint

```
GET /api/v1/me
```

---

## Description

Returns the identity context of the currently authenticated caller — their user ID and the tenant they are acting within. The tenant ID is derived exclusively from the JWT token; it is never a client-supplied value.

> **Phase note**: In this feature, the endpoint uses a stub guard that accepts any non-empty Bearer token and returns mock identity values. In Epic 2 (Clerk Authentication), the guard is replaced with real Clerk JWT verification. The endpoint path, response shape, and request contract are final and will not change.

---

## Request

### Headers

| Header          | Required | Description                             |
| --------------- | -------- | --------------------------------------- |
| `Authorization` | Yes      | `Bearer <jwt>` — Clerk-issued JWT token |

**Query Parameters**: None.

**Request Body**: None.

---

## Response

### 200 OK

**Content-Type**: `application/json`

**Schema** (`MeResponseDto`):

```json
{
  "userId": "user_abc123",
  "tenantId": "tenant_xyz789"
}
```

| Field      | Type     | Description                                                |
| ---------- | -------- | ---------------------------------------------------------- |
| `userId`   | `string` | Clerk user ID of the authenticated caller                  |
| `tenantId` | `string` | Tenant ID derived from Clerk organisation claim in the JWT |

---

## Error Responses

All error responses follow the standard `ErrorResponseDto` envelope.

### 401 Unauthorized

Returned when the `Authorization` header is absent, malformed, or the token is empty.

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Missing or invalid Bearer token"
}
```

**Triggers**:

- `Authorization` header is missing entirely
- Header is present but value is not `Bearer <token>` format
- Token string is empty after `Bearer ` prefix

---

## Swagger Annotations

```
@ApiTags('System')
@ApiBearerAuth()
@ApiOperation({
  summary: 'Get current user context',
  description: 'Returns the authenticated caller\'s user ID and tenant ID derived from the Bearer JWT. Tenant ID is never a manual input.'
})
@ApiOkResponse({ type: MeResponseDto, description: 'Authenticated user context' })
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid Bearer token' })
```

---

## Notes

- `tenantId` is derived from the JWT — never exposed as a query parameter or request body field (FR-013).
- In this phase, any non-empty Bearer string is accepted (stub guard). The response values are hardcoded mocks.
- In Epic 2, the guard is replaced with Clerk JWKS verification. The controller and DTO are unchanged.
- The Swagger Authorize button must be used to set the Bearer token before calling this endpoint from Swagger UI.
