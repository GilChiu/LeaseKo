# Research: Health Check Endpoint

**Feature**: `020-health-check-endpoint`
**Created**: 2026-05-06

---

## D-001: HealthController, HealthResponseDto, and HealthModule already exist — update in-place, no duplication

**Decision**: Extend the existing `HealthController` at `apps/api/src/modules/health/presentation/health.controller.ts` and `HealthResponseDto` at `apps/api/src/modules/health/presentation/dto/health-response.dto.ts`. The `HealthModule` is already registered in `AppModule`. No new module, controller, or file is created.

**Current state**:
- `HealthController.check()` returns `{ status: "ok", service: "api", timestamp }` — no args constructor, no DI
- `HealthResponseDto` has `status`, `service`, `timestamp` — no `uptime` or `environment`
- `health.controller.spec.ts` tests the 3 existing fields, constructs `controller = new HealthController()`

**Delta**: Add `uptime: number` (from `process.uptime()`) and `environment: string` (from `ConfigService`) to both the DTO and the controller return value.

**Rationale**: Updating in-place preserves the existing test as a base, avoids module duplication, and keeps the structure consistent with the plan prompt's guidance to update rather than duplicate.

---

## D-002: Inject ConfigService to read `nodeEnv` — no direct `process.env` reads

**Decision**: Change `HealthController` from a no-arg class to one that injects `ConfigService` and calls `configService.getOrThrow<AppConfig>("app").nodeEnv`. Since `ConfigModule` is global in `AppModule`, no additional module import is needed in `HealthModule`.

**Rationale**: Feature 017 established the rule that all config reads go through `ConfigService`. Using `process.env.NODE_ENV` directly in the controller would violate that convention. `ConfigService` injection is idiomatic NestJS and the same pattern used everywhere else in the codebase.

**Impact on test**: `health.controller.spec.ts` currently uses `new HealthController()` (no DI). Adding a constructor dependency requires updating the test to pass a mock `ConfigService`. The three existing test cases remain unchanged; two new ones are added for `uptime` and `environment`.

---

## D-003: `uptime` from `process.uptime()` — safe and no secrets

**Decision**: Use `Math.round(process.uptime() * 100) / 100` to return uptime in seconds with 2 decimal precision.

**Rationale**: `process.uptime()` is a platform-level observable with no security implications. Rounding to 2 decimal places avoids unnecessary precision noise.

**Alternatives considered**: `Date.now() - startTime` (requires storing start time) — rejected as more complex with no benefit over the built-in.

---

## D-004: The actual request path is `GET /api/v1/health` — Swagger shows `GET /health` (ignoreGlobalPrefix: true)

**Decision**: Document the actual curl path as `http://localhost:3001/api/v1/health`. The Swagger UI shows `GET /health` because `ignoreGlobalPrefix: true` is set in `SwaggerModule.createDocument()`.

**Rationale**: The controller uses `@Controller()` (no prefix) + `@Get("health")`, and `app.setGlobalPrefix("api/v1")` is applied globally in `main.ts`. The effective HTTP path is `/api/v1/health`.

---

## D-005: Update existing unit test — mock ConfigService, add 2 new test cases

**Decision**: Update `health.controller.spec.ts` to construct `HealthController` with a mock `ConfigService`. Add two new test cases: `uptime is a positive number` and `environment matches the nodeEnv config value`. Keep the 3 existing test cases unchanged.

**Rationale**: The existing 3 tests (status, service, timestamp) cover the already-working functionality. The 2 new tests protect the new fields from regression.

---

## Summary of Changes

| File | Action | Reason |
|---|---|---|
| `modules/health/presentation/dto/health-response.dto.ts` | MODIFY — add `uptime` and `environment` fields | New fields per FR-003, FR-004 |
| `modules/health/presentation/health.controller.ts` | MODIFY — inject `ConfigService`, return `uptime` and `environment` | Produce new fields in response |
| `modules/health/health.controller.spec.ts` | MODIFY — mock `ConfigService`, add 2 test cases | Protect new fields from regression |
| `BACKLOG.md` | MODIFY — mark US 6.2 tasks complete | Post-implementation update |
