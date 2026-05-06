# Research: Swagger API Documentation Setup

**Feature**: `019-swagger-api-docs`
**Created**: 2026-05-06

---

## D-001: @nestjs/swagger is already installed

**Decision**: No installation step needed. `@nestjs/swagger ^7.0.0` is already in `apps/api/package.json`. `swagger-ui-express` is also already present (NestJS 10 bundles it).

**Rationale**: Running `pnpm --filter @leaseKo/api add @nestjs/swagger` again would be a no-op and is not needed.

**Alternatives considered**: Verify the installed version, upgrade if out of date — not necessary; v7 is the current major for NestJS 10.

---

## D-002: Swagger bootstrap is already in main.ts — only metadata update needed

**Decision**: The `DocumentBuilder` + `SwaggerModule.setup("api/docs", ...)` block already exists in `main.ts` inside `if (nodeEnv !== "production")`. Only two metadata values need updating:
- Title: `"LeaseKo API"` → `"Property Management SaaS API"`
- Version: `"1.0"` → `"1.0.0"`
- Description is already close enough but will be updated to match the spec exactly.

**Rationale**: The production-gating logic, Bearer auth support, `ignoreGlobalPrefix: true`, and the `/api/docs` endpoint are all correctly in place.

**Alternatives considered**: None — the existing setup matches best practices for NestJS + Swagger.

---

## D-003: Most controller Swagger decorators are already in place

**Decision**: A codebase audit found three gap points where `type: ErrorResponseDto` is missing from error response decorators:

| File | Decorator | Gap |
|---|---|---|
| `auth.controller.ts` | `@ApiUnauthorizedResponse` | Missing `type: ErrorResponseDto` |
| `tenant-context.controller.ts` | `@ApiUnauthorizedResponse` | Missing `type: ErrorResponseDto` |
| `tenant-context.controller.ts` | `@ApiForbiddenResponse` | Missing `type: ErrorResponseDto` |

`system.controller.ts` already uses `type: ErrorResponseDto` correctly and serves as the pattern to follow.

**Rationale**: Adding `type` makes the Swagger UI render the full standard error schema inline rather than showing no schema. This satisfies FR-008 (shared schema reference, no duplication).

**Alternatives considered**: Use `schema` inline — rejected, as it duplicates the schema definition rather than referencing `ErrorResponseDto`.

---

## D-004: ErrorResponseDto already reflects the standard shape from feature 018

**Decision**: `shared/dto/error-response.dto.ts` was updated in feature 018 to the `{ success: false, error: ApiErrorBodyDto }` shape. No changes needed to this file.

**Rationale**: The standard error shape is already documented and ready to be referenced.

---

## D-005: HealthController, SystemController, and TenantContextController already have full API tags and operation summaries

**Decision**: Only the missing `type` references on error responses need adding. No new `@ApiTags`, `@ApiOperation`, or `@ApiOkResponse` decorators are required.

**Rationale**: The controllers were already decorated in earlier features (002, 008, 016).

---

## D-006: Developer reference document is missing

**Decision**: Create `docs/api-documentation.md` as the developer reference for the Swagger documentation contract. This satisfies FR-011 and US3 (P2).

Content: Swagger UI URL, how to authorize with Bearer JWT, public vs protected endpoints table, how to document a new endpoint (copy-paste pattern for each of the three endpoint categories), DTO documentation pattern, clean architecture placement rules.

**Rationale**: Without a written reference, new module authors have inconsistent documentation practices.

---

## D-007: No SWAGGER_ENABLED env var needed in this feature

**Decision**: The `if (nodeEnv !== "production")` guard in `main.ts` already implements production gating. No `SWAGGER_ENABLED` config flag is added in this feature.

**Rationale**: The guard is already in place and working. Adding a second flag would be over-engineering without a concrete use case today.

---

## Summary of Changes

| File | Action | Reason |
|---|---|---|
| `apps/api/src/main.ts` | MODIFY — update Swagger metadata | Title, version, description alignment |
| `apps/api/src/modules/auth/presentation/auth.controller.ts` | MODIFY — add `type: ErrorResponseDto` | Missing schema reference |
| `apps/api/src/modules/tenant-context/presentation/tenant-context.controller.ts` | MODIFY — add `type: ErrorResponseDto` (×2) | Missing schema references |
| `docs/api-documentation.md` | CREATE — developer reference guide | Missing entirely |
| `BACKLOG.md` | MODIFY — mark US 6.1 tasks complete | Post-implementation update |
