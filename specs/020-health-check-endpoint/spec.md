# Feature Specification: Health Check Endpoint

**Feature Branch**: `020-health-check-endpoint`
**Created**: 2026-05-06
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Operations team verifies the API is running and reachable without needing a user account or JWT token (Priority: P1)

An operations engineer has just deployed the API to a staging environment. They need to confirm the process started and is handling requests. They call `GET /health` with no authentication headers and receive a `200 OK` response with the service name, a current timestamp, and the process uptime in seconds. The call takes under 100ms. They do this from a monitoring agent, a browser, or a simple `curl` command.

**Why this priority**: Knowing the API is alive is the most fundamental system observable. Without a public health endpoint, there is no fast, auth-free way to verify the service is responding.

**Independent Test**: Call `GET /health` with no `Authorization` header. Verify: `200 OK`, `status: "ok"`, `service: "api"`, `timestamp` is a valid ISO 8601 string, `uptime` is a positive number.

**Acceptance Scenarios**:

1. **Given** the API is running, **When** `GET /health` is called without any authentication header, **Then** the response is `200 OK` with a JSON body containing `status`, `service`, `timestamp`, and `uptime`.
2. **Given** the API is running, **When** the `uptime` field is inspected, **Then** it is a positive number representing the number of seconds the process has been running.
3. **Given** the API is running, **When** the `timestamp` field is inspected, **Then** it is a valid ISO 8601 date-time string reflecting the time the request was handled.
4. **Given** the API is running in development mode, **When** the `environment` field is present, **Then** it reflects the current `NODE_ENV` value (`"development"`, `"staging"`, or `"production"`).
5. **Given** a health monitoring tool polls `GET /health` every 30 seconds, **When** multiple calls are made in succession, **Then** every response is `200 OK` and the `uptime` value increases between calls.

---

### User Story 2 — Frontend developer discovers and tests the health endpoint directly from the Swagger documentation UI (Priority: P2)

A frontend developer opens the Swagger UI to understand the available endpoints. They see `GET /health` listed under the "System" group — it shows no authentication requirement, no lock icon, and the response schema with all fields and example values. They click "Try it out" and "Execute" without entering any token and receive the live response directly in the browser.

**Why this priority**: Since Swagger documentation is already established for this project, every endpoint should appear in it. The `/health` endpoint is P2 only because it already exists and works without documentation — documentation improves discoverability but does not affect system availability.

**Independent Test**: Open `http://localhost:3001/api/docs`. Find `GET /health` under "System". Click "Try it out" → "Execute" without setting any Bearer token. Verify `200` response with all expected fields visible.

**Acceptance Scenarios**:

1. **Given** the Swagger UI is open, **When** the developer finds `GET /health`, **Then** it shows no Bearer auth requirement, no lock icon, and a documented response schema with `status`, `service`, `timestamp`, `uptime`, and `environment` fields.
2. **Given** the Swagger UI is open, **When** the developer executes the request without entering a token, **Then** the response is `200 OK` with the correct JSON body.
3. **Given** the Swagger response schema is displayed, **When** the developer reads the field descriptions, **Then** each field has a clear example value and description.

---

### Edge Cases

- What if the API is starting up when health is polled? → The process is alive when `GET /health` responds; any in-flight startup would prevent the server from handling the request at all, which is the correct behavior.
- What if `NODE_ENV` is not set? → The `environment` field defaults to `"development"` — no error is thrown and no empty value is returned.
- Will `/health` eventually check database or Redis connectivity? → No — this feature is for liveness only (`GET /health/live` or a future `GET /health/ready` endpoint would cover dependency checks). A note is left in the documentation.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `GET /health` MUST return `200 OK` without requiring an `Authorization` header.
- **FR-002**: The response MUST include `status` (always `"ok"` when the process is alive), `service` (always `"api"`), and `timestamp` (ISO 8601 string of the current time).
- **FR-003**: The response MUST include `uptime` — a positive numeric value representing the number of seconds the process has been running.
- **FR-004**: The response MUST include `environment` — a safe string value reflecting the current runtime environment (`"development"`, `"staging"`, or `"production"`), never exposing any secret values.
- **FR-005**: The endpoint MUST NOT require tenant context, organization context, or any user identity.
- **FR-006**: The endpoint MUST NOT perform any database queries, cache lookups, or external service calls.
- **FR-007**: The endpoint MUST be documented in the Swagger UI with operation summary, response schema with examples, and no Bearer auth requirement shown.
- **FR-008**: The endpoint MUST respond within 100 milliseconds under normal conditions.
- **FR-009**: The response DTO MUST document all fields with descriptions and example values for Swagger visibility.

### Key Entities

- **Health Response**: A snapshot of API liveness state — `{ status, service, timestamp, uptime, environment }`. Not stored anywhere; generated fresh on each request.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `GET /health` called without any headers returns `200 OK` in under 100 milliseconds, 100% of the time when the process is running.
- **SC-002**: The response body always contains all five fields: `status`, `service`, `timestamp`, `uptime`, `environment` — zero missing fields.
- **SC-003**: The `uptime` value increases monotonically between successive calls — confirming it reflects actual process runtime, not a static value.
- **SC-004**: The endpoint appears in the Swagger UI under the "System" group with no authentication requirement visible.
- **SC-005**: The endpoint remains accessible and returns `200 OK` even when the database is unreachable — confirming it does not depend on any external service.

---

## Assumptions

- The global API prefix is `/api/v1` — the full path is `GET /api/v1/health` when using the prefix, but the Swagger UI is configured with `ignoreGlobalPrefix: true` so it may appear as `GET /health` in the documentation.
- `NODE_ENV` is always set in the runtime environment via the centralized config module validated at startup; this feature uses the already-resolved value, not raw `process.env`.
- Deep dependency health checks (database ping, Redis ping) are explicitly out of scope for this feature; a future `GET /health/ready` endpoint would cover readiness probing.
- The existing `HealthController` and `HealthResponseDto` are the correct location for the changes — no new module is needed.
- Process uptime from the platform's built-in process monitoring is safe to expose since it reveals no secrets and is useful for operators.
