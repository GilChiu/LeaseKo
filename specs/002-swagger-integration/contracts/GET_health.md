# API Contract: GET /health

**Module**: System
**Tag**: `System`
**Auth**: None (public)
**Feature**: `002-swagger-integration`

---

## Endpoint

```
GET /api/v1/health
```

---

## Description

Returns the liveness status of the API. Used by infrastructure health probes, uptime monitors, and developers to verify the API is running. This endpoint is intentionally public — no authentication required.

---

## Request

**Headers**: None required.

**Query Parameters**: None.

**Request Body**: None.

---

## Response

### 200 OK

**Content-Type**: `application/json`

**Schema** (`HealthResponseDto`):

```json
{
  "status": "ok",
  "timestamp": "2026-05-02T12:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Always `"ok"` when the endpoint responds |
| `timestamp` | `string` | ISO 8601 UTC timestamp of the response |

---

## Error Responses

This endpoint has no expected error responses. If the API is unhealthy, it will not respond at all (connection refused or 503 from infrastructure).

---

## Swagger Annotations

```
@ApiTags('System')
@ApiOperation({ summary: 'Health check', description: 'Returns API liveness status. Public — no authentication required.' })
@ApiOkResponse({ type: HealthResponseDto, description: 'API is healthy' })
```

---

## Notes

- No authentication guard applied.
- Rate limiting is not required for this endpoint at this stage (internal/infrastructure use only).
- Future: if this endpoint is exposed externally, consider adding request rate limiting.
