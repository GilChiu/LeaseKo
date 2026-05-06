# Tasks: Global Exception Filter and Standard API Error Responses

**Feature**: `018-global-exception-filter`
**Branch**: `018-global-exception-filter`
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)
**Generated**: 2026-05-06

---

## Overview

Refactor the existing `GlobalExceptionFilter` in-place to emit a standard
`{ success: false, error: { code, message, statusCode, timestamp, path, details? } }`
shape. Create the `ErrorCode` registry, `ApiErrorResponse` interface, `PrismaErrorMapper`,
an updated Swagger `ErrorResponseDto`, a unit test, and `docs/api-errors.md`.

**Total tasks**: 13
**Phases**: Setup → Foundational → US1 → US2 → US3/US4 → Polish

---

## Phase 1: Setup

> Verify the current state before making changes.

- [X] T001 Confirm `GlobalExceptionFilter` exists at `apps/api/src/common/filters/global-exception.filter.ts` and is registered as `app.useGlobalFilters(new GlobalExceptionFilter())` in `main.ts`
- [X] T002 [P] Confirm `ErrorResponseDto` exists at `apps/api/src/shared/dto/error-response.dto.ts` and is referenced by existing Swagger decorators in controllers
- [X] T003 [P] Confirm `@prisma/client` is installed and `PrismaClientKnownRequestError` is already used in existing repositories — identifying which Prisma error codes are already handled at the repository layer

---

## Phase 2: Foundational — Error Code Registry and Interfaces

> Create the typed foundation that the filter, Swagger DTO, and all future modules
> depend on. These must exist before the filter is refactored.

- [X] T004 [P] Create `apps/api/src/common/errors/error-codes.ts` — `ErrorCode` const object (`VALIDATION_ERROR`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `TENANT_CONTEXT_REQUIRED`, `NOT_FOUND`, `CONFLICT`, `DATABASE_CONSTRAINT_ERROR`, `SERVICE_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`) plus derived `ErrorCode` type
- [X] T005 [P] Create `apps/api/src/common/types/api-error-response.interface.ts` — `ApiErrorDetails`, `ApiError`, and `ApiErrorResponse` interfaces with optional `details` and `requestId` fields

---

## Phase 3: User Story 1 — Standard Error Response Shape (P1)

> US1: Frontend receives a predictable, structured error response from every endpoint.
> **Independent test**: Call any endpoint without auth — response must be `{ success: false, error: { code: "UNAUTHORIZED", statusCode: 401, timestamp: "...", path: "..." } }`.

- [X] T006 [US1] Create `apps/api/src/common/errors/prisma-error.mapper.ts` — pure `mapPrismaError(error: unknown): MappedPrismaError | null` function mapping `PrismaClientKnownRequestError` (P2002→409 CONFLICT, P2025→404 NOT_FOUND, P2003→409 CONFLICT, default→500) and `PrismaClientInitializationError` (→503 SERVICE_UNAVAILABLE)
- [X] T007 [US1] Refactor `apps/api/src/common/filters/global-exception.filter.ts` in-place — add `constructor(private readonly nodeEnv: string)`, emit `ApiErrorResponse` shape on all branches: HttpException with status→code mapping, array-message detection→`VALIDATION_ERROR`+`details.fields`, Prisma mapper branch, unknown error branch (dev: original message, prod: generic message); log only unhandled 5xx errors
- [X] T008 [US1] Update `apps/api/src/main.ts` — change `new GlobalExceptionFilter()` to `new GlobalExceptionFilter(nodeEnv)` (one-line change; `nodeEnv` already destructured from `ConfigService`)

---

## Phase 4: User Story 2 — Production Safety / No Sensitive Leaks (P1)

> US2: Production unhandled errors return a generic message; no Prisma internals, stack traces, or JWT details reach the client.
> **Independent test**: In prod mode, trigger any unhandled error — response `message` must be `"An unexpected error occurred"` with no stack trace.

- [X] T009 [US2] Update `apps/api/src/shared/dto/error-response.dto.ts` — replace old `{ statusCode, message, error? }` shape with new `{ success: false, error: ApiErrorBodyDto }` Swagger DTO where `ApiErrorBodyDto` has `code`, `message`, `statusCode`, `timestamp`, `path`, optional `details`

---

## Phase 5: User Story 3 & 4 — Developer Ergonomics and Custom Codes (P2/P3)

> US3: Developer throws `ConflictException` and it maps to `409 CONFLICT` automatically — no per-controller response logic.
> US4: Developer can add a custom error code to the registry and the filter picks it up from `ForbiddenException` body.
> **Independent test (US3)**: `throw new ConflictException("Unit is already occupied")` → `{ code: "CONFLICT", message: "Unit is already occupied", statusCode: 409 }`.
> **Independent test (US4)**: `throw new ForbiddenException({ code: "TENANT_CONTEXT_REQUIRED", message: "..." })` → `error.code: "TENANT_CONTEXT_REQUIRED"`.

- [X] T010 [P] [US3] [US4] Create `apps/api/src/common/filters/global-exception.filter.spec.ts` — unit tests covering: HttpException 400 BAD_REQUEST, HttpException 401 UNAUTHORIZED, HttpException 404 NOT_FOUND, array-message ValidationPipe → VALIDATION_ERROR + details.fields, unknown Error dev mode → original message, unknown Error prod mode → generic message, Prisma P2002 → 409 CONFLICT, every response has `success: false` + `timestamp` + `path`

---

## Phase 6: Polish — Documentation and Validation

- [X] T011 [P] Create `docs/api-errors.md` — canonical error contract documentation covering: standard response format with annotated example, error code reference table, validation error `details.fields` example, auth/tenant error behavior, Prisma error mapping table, production vs development behavior, logging safety rules, and how to throw errors in new modules
- [X] T012 [P] Run `pnpm --filter @leaseKo/api build` — confirm exit 0 (TypeScript compile check)
- [X] T013 [P] Run `pnpm --filter @leaseKo/api test` — confirm all 4 suites pass (3 existing + new filter spec)

---

## Dependency Graph

```
T001 (audit filter) ──────────────────────────────────────────► T007 (refactor filter)
T002 (audit ErrorResponseDto) ────────────────────────────────► T009 (update DTO)
T003 (audit Prisma usage) ────────────────────────────────────► T006 (Prisma mapper)
T004 (error-codes.ts) ──┐
                        ├──► T006 (prisma-error.mapper.ts)
T005 (interfaces) ──────┘
T004 + T005 ────────────────────────────────────────────────► T007 (refactor filter)
T006 ────────────────────────────────────────────────────────► T007 (filter uses mapper)
T007 ────────────────────────────────────────────────────────► T008 (main.ts)
T007 + T008 ─────────────────────────────────────────────────► T010 (unit test)
T007 + T008 + T009 + T010 ───────────────────────────────────► T012 (build)
T011 (docs) ────────────────────────── independent ──────────► T013 (informational)
T012 (build) ────────────────────────────────────────────────► T013 (test)
```

---

## Parallel Execution Opportunities

**Batch A** (fully independent — run together):
- T001, T002, T003 (setup audit tasks)
- T004, T005 (create independent new files)

**Batch B** (after T004 + T005 complete):
- T006 (Prisma mapper — depends on `error-codes.ts`)

**Batch C** (after T006 complete):
- T007 (filter refactor — depends on T004, T005, T006)

**Batch D** (after T007 complete):
- T008 (main.ts — depends on T007)
- T009 (ErrorResponseDto — depends on T004/T005 for shape knowledge; can run in parallel with T008)
- T011 (docs — independent, can run any time)

**Batch E** (after T007 + T008 complete):
- T010 (unit test)

**Batch F** (after T008 + T009 + T010 complete):
- T012, T013 (build + test)

---

## Implementation Strategy

**MVP scope**: T001 → T008. Completes US1 and US2 (P1): standard shape on all error responses, production safety, Prisma mapping. No docs or unit test yet — but the core contract is working.

**Full scope**: Add T009 (Swagger DTO), T010 (unit test), T011 (docs), T012–T013 (validation).

**Suggested execution order for an LLM agent**:
1. T001, T002, T003 in parallel (audit)
2. T004, T005 in parallel (foundation files)
3. T006 (Prisma mapper)
4. T007 (filter refactor — the main task)
5. T008, T009, T011 in parallel (main.ts, DTO, docs)
6. T010 (unit test)
7. T012, T013 (build + test validation)

---

## Validation Checklist

- [ ] `pnpm --filter @leaseKo/api build` exits 0
- [ ] `pnpm --filter @leaseKo/api test` — 4 suites, all pass (filter spec + 3 existing)
- [ ] `GlobalExceptionFilter` class name and file path unchanged
- [ ] Calling `/api/v1/me` without token → `{ success: false, error: { code: "UNAUTHORIZED", ... } }`
- [ ] Sending invalid body → `{ success: false, error: { code: "VALIDATION_ERROR", details: { fields: [...] } } }`
- [ ] `success: false` present on every error response
- [ ] `timestamp` and `path` present on every error response
- [ ] Unknown error in prod mode → `message: "An unexpected error occurred"` (no internal details)
- [ ] No raw Prisma error fields in any client response
- [ ] Swagger UI at `/api/docs` shows `ErrorResponseDto` with new shape
- [ ] `docs/api-errors.md` created
- [ ] No business logic added
