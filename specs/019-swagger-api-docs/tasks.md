# Tasks: Swagger API Documentation Setup

**Feature**: `019-swagger-api-docs`
**Branch**: `019-swagger-api-docs`
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)
**Generated**: 2026-05-06

---

## Overview

Close the three documentation gaps identified in the codebase audit: update Swagger
metadata in `main.ts`, add `type: ErrorResponseDto` to missing error response
decorators in two controllers, and create the developer reference document
`docs/api-documentation.md`. No new packages required — all dependencies already
in place.

**Total tasks**: 9
**Phases**: Setup → Foundational → US1/US2 → US3 → Polish

---

## Phase 1: Setup

> Confirm current state before making any changes.

- [X] T001 Verify `@nestjs/swagger` is installed in `apps/api/package.json` and Swagger bootstrap exists in `apps/api/src/main.ts` with production gate (`if (nodeEnv !== "production")`)
- [X] T002 [P] Verify all three target controllers exist: `apps/api/src/modules/auth/presentation/auth.controller.ts`, `apps/api/src/modules/tenant-context/presentation/tenant-context.controller.ts`, `apps/api/src/modules/system/presentation/system.controller.ts`
- [X] T003 [P] Verify `ErrorResponseDto` exists at `apps/api/src/shared/dto/error-response.dto.ts` with the standard `{ success: false, error: ApiErrorBodyDto }` shape from feature 018

---

## Phase 2: Foundational — No foundational tasks

> All dependencies are already in place. Proceeding directly to user story phases.

---

## Phase 3: User Story 1 & 2 — Accessible UI with Full Error Schema (P1/P1)

> US1: Developer opens the docs UI and sees all endpoints with their schemas.
> US2: Frontend developer sees consistent error schemas on all protected endpoints.
> **Independent test**: Start server, open `http://localhost:3001/api/docs` — all endpoints visible; inspect any 401/403 response — `ErrorResponseDto` schema rendered with `success`, `error.code`, `error.message`, etc.

- [X] T004 [US1] [US2] Update `apps/api/src/main.ts` — change Swagger metadata: title `"LeaseKo API"` → `"Property Management SaaS API"`, description → `"API documentation for the multi-tenant Property Management SaaS backend."`, version `"1.0"` → `"1.0.0"`
- [X] T005 [P] [US1] [US2] Update `apps/api/src/modules/auth/presentation/auth.controller.ts` — add `import { ErrorResponseDto }` from `shared/dto/error-response.dto` and add `type: ErrorResponseDto` to the existing `@ApiUnauthorizedResponse` decorator
- [X] T006 [P] [US1] [US2] Update `apps/api/src/modules/tenant-context/presentation/tenant-context.controller.ts` — add `import { ErrorResponseDto }` from `shared/dto/error-response.dto` and add `type: ErrorResponseDto` to both the `@ApiUnauthorizedResponse` and `@ApiForbiddenResponse` decorators

---

## Phase 4: User Story 3 — Developer Reference Document (P2)

> US3: Backend developer follows an established pattern to document a new endpoint.
> **Independent test**: Open `docs/api-documentation.md` — find copy-paste decorator patterns for public, user-protected, and tenant-protected endpoints within 5 minutes.

- [X] T007 [US3] Create `docs/api-documentation.md` — developer reference covering: Swagger UI URL (`http://localhost:3001/api/docs`), OpenAPI JSON URL (`/api/docs-json`), Bearer JWT authorization steps, current endpoint table (health/me/auth-me/tenant-context with auth status), three copy-paste endpoint decorator patterns (public / user-protected / tenant-protected), response DTO pattern with `@ApiProperty`, error response pattern with `type: ErrorResponseDto`, clean architecture placement rules (allowed: `presentation/`, forbidden: `domain/`, `application/`, `infrastructure/`)

---

## Phase 5: Polish — Backlog Update and Validation

- [X] T008 [P] Update `BACKLOG.md` — mark US 6.1 tasks complete: `[x] Setup Swagger in NestJS` and `[x] Document sample endpoints`
- [X] T009 [P] Run `pnpm --filter @leaseKo/api build` — confirm exit 0; then start `pnpm --filter @leaseKo/api start:dev` and verify `http://localhost:3001/api/docs` loads, all 4 endpoints appear, 401/403 error schemas render the `ErrorResponseDto` shape

---

## Dependency Graph

```
T001 (verify bootstrap) ──────────────────────────────────────► T004 (update metadata)
T002 (verify controllers) ─┐
                            ├──► T005 (fix auth.controller.ts)
                            └──► T006 (fix tenant-context.controller.ts)
T003 (verify ErrorResponseDto) ──► T005 + T006

T004 + T005 + T006 ──────────────────────────────────────────► T009 (validation)
T007 (docs) ─────────────────────────── independent ─────────► T009 (informational)
T008 (backlog) ─────────────────────── independent ──────────► (any time after T004)
```

---

## Parallel Execution Opportunities

**Batch A** (fully independent — run together):
- T001, T002, T003 (setup audit)

**Batch B** (after T002 + T003 confirmed):
- T004, T005, T006 (all target different files — safe to run together)

**Batch C** (independent of B — any time):
- T007 (docs reference)
- T008 (backlog update)

**Batch D** (after T004 + T005 + T006 complete):
- T009 (build + live validation)

---

## Implementation Strategy

**MVP scope**: T001 → T006 + T008. Completes US1 and US2 (P1): accessible docs UI, correct metadata, all error schemas rendered. Documentation reference (T007) is P2 and can follow.

**Suggested execution order for an LLM agent**:
1. T001, T002, T003 in parallel (audit)
2. T004, T005, T006 in parallel (all independent file edits)
3. T007, T008 in parallel (docs + backlog — independent)
4. T009 (build + live validation last)

---

## Validation Checklist

- [ ] `pnpm --filter @leaseKo/api build` exits 0
- [ ] `pnpm --filter @leaseKo/api test` — all 4 suites / 18 tests pass
- [ ] `http://localhost:3001/api/docs` loads the Swagger UI
- [ ] UI title shows "Property Management SaaS API"
- [ ] `GET /health` visible — no auth badge
- [ ] `GET /me` (System) visible — Bearer auth badge shown
- [ ] `GET /auth/me` visible — 401 response renders `ErrorResponseDto` schema
- [ ] `GET /tenant-context` visible — 401 and 403 responses both render `ErrorResponseDto` schema
- [ ] `http://localhost:3001/api/docs-json` returns valid JSON
- [ ] No secrets in Swagger UI or OpenAPI JSON output
- [ ] `docs/api-documentation.md` created and contains all three endpoint patterns
- [ ] `BACKLOG.md` US 6.1 tasks marked `[x]`
