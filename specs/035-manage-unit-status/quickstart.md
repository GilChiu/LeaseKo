# Quickstart: Manage Unit Status Lifecycle

**Feature**: `specs/035-manage-unit-status/spec.md`  
**Endpoint**: `PATCH /api/v1/units/:id`  
**Auth**: Clerk Bearer JWT (orgId → tenantId)

---

## Status Lifecycle

```
                 ┌─────────────────────────────┐
                 ▼                             │
AVAILABLE ──► OCCUPIED ──► AVAILABLE ◄─ MAINTENANCE
    │                          │                 │
    └──► MAINTENANCE ──────────┘                 │
    │                                            │
    └──► INACTIVE ◄──────────────────────────────┘
         (terminal)
```

**Permitted transitions**:

| From | Allowed Next States |
|---|---|
| AVAILABLE | OCCUPIED, MAINTENANCE, INACTIVE |
| OCCUPIED | AVAILABLE, MAINTENANCE |
| MAINTENANCE | AVAILABLE, INACTIVE |
| INACTIVE | *(none — terminal state)* |

**Same-status update**: always succeeds (200) — idempotent no-op.

---

## Scenario 1 — Tenant moves in (AVAILABLE → OCCUPIED)

```http
PATCH /api/v1/units/unit_001
Authorization: Bearer <clerk_jwt>
Content-Type: application/json

{
  "status": "OCCUPIED"
}
```

**Response 200**:
```json
{
  "id": "unit_001",
  "tenantId": "org_2abc123",
  "propertyId": "property_001",
  "unitNumber": "101",
  "status": "OCCUPIED",
  "floorArea": 75.5,
  "bedrooms": 2,
  "bathrooms": 1,
  "monthlyRent": 15000,
  "description": "Corner unit",
  "createdAt": "2026-06-04T10:00:00.000Z",
  "updatedAt": "2026-06-05T09:00:00.000Z"
}
```

---

## Scenario 2 — Tenant vacates and rent updated simultaneously (OCCUPIED → AVAILABLE)

```http
PATCH /api/v1/units/unit_001
Authorization: Bearer <clerk_jwt>
Content-Type: application/json

{
  "status": "AVAILABLE",
  "monthlyRent": 16000
}
```

**Response 200**: unit with `status: "AVAILABLE"` and `monthlyRent: 16000`.

---

## Scenario 3 — Decommission a unit (AVAILABLE → INACTIVE)

```http
PATCH /api/v1/units/unit_001
Authorization: Bearer <clerk_jwt>
Content-Type: application/json

{
  "status": "INACTIVE"
}
```

**Response 200**: unit with `status: "INACTIVE"`.

---

## Scenario 4 — Invalid transition (OCCUPIED → INACTIVE)

```http
PATCH /api/v1/units/unit_001
Authorization: Bearer <clerk_jwt>
Content-Type: application/json

{
  "status": "INACTIVE"
}
```
*(unit_001 is currently OCCUPIED)*

**Response 422**:
```json
{
  "statusCode": 422,
  "message": "Unit status cannot transition from OCCUPIED to INACTIVE.",
  "error": "Unprocessable Entity"
}
```

---

## Scenario 5 — Attempting to reactivate an INACTIVE unit

```http
PATCH /api/v1/units/unit_001
Authorization: Bearer <clerk_jwt>
Content-Type: application/json

{
  "status": "AVAILABLE"
}
```
*(unit_001 is currently INACTIVE)*

**Response 422**:
```json
{
  "statusCode": 422,
  "message": "Unit status cannot transition from INACTIVE to AVAILABLE.",
  "error": "Unprocessable Entity"
}
```

---

## Scenario 6 — Non-status update on an INACTIVE unit (allowed)

```http
PATCH /api/v1/units/unit_001
Authorization: Bearer <clerk_jwt>
Content-Type: application/json

{
  "description": "Archived — structural damage"
}
```
*(unit_001 is currently INACTIVE — no status field in body)*

**Response 200**: unit with updated `description`. Status remains INACTIVE.

---

## Scenario 7 — Unknown status string (validation error)

```http
{
  "status": "RENTED"
}
```

**Response 400** (validation error — runs before transition check):
```json
{
  "statusCode": 400,
  "message": ["status must be one of the following values: AVAILABLE, OCCUPIED, MAINTENANCE, INACTIVE"]
}
```

---

## Error Reference

| HTTP | When |
|---|---|
| 200 | Successful update or same-status no-op |
| 400 | Invalid field values, empty payload, or unrecognised status string |
| 404 | Unit not found or belongs to another tenant |
| 409 | Unit number already exists under this property |
| 422 | Status transition not permitted by lifecycle rules |
| 401 | Missing/invalid JWT |
| 403 | No active tenant context in JWT |
