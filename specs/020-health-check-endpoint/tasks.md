# Tasks: Health Check Endpoint

**Input**: Design documents from `specs/020-health-check-endpoint/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths included in descriptions

---

## Phase 1: Setup

*No new project initialization needed — `HealthModule`, `HealthController`, and `HealthResponseDto` already exist. No setup phase tasks required.*

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Extend `HealthResponseDto` with `uptime` and `environment` fields. US1 and US2 both depend on this DTO, so it must be complete before either story phase begins.

**⚠️ CRITICAL**: Both user stories depend on this phase completing first.

- [x] T001 Add `uptime: number` and `environment: string` fields to `HealthResponseDto` with `@ApiProperty` decorators in `apps/api/src/modules/health/presentation/dto/health-response.dto.ts`

**Checkpoint**: `HealthResponseDto` now declares all 5 fields — US1 and US2 implementation can begin.

---

## Phase 3: User Story 1 — Operations team verifies API liveness (Priority: P1) 🎯 MVP

**Goal**: `GET /api/v1/health` returns `200 OK` with all 5 fields (`status`, `service`, `timestamp`, `uptime`, `environment`) — no auth required.

**Independent Test**: `curl http://localhost:3001/api/v1/health` (no Authorization header) → `200 OK` with all 5 fields present; `uptime` is a positive number; `environment` matches `NODE_ENV`.

### Implementation for User Story 1

- [x] T002 [US1] Inject `ConfigService` into `HealthController` and return `uptime` and `environment` from `check()` in `apps/api/src/modules/health/presentation/health.controller.ts`
- [x] T003 [P] [US1] Update `health.controller.spec.ts` to pass a mock `ConfigService` to the constructor and add test cases for `uptime` and `environment` in `apps/api/src/modules/health/health.controller.spec.ts`

**Checkpoint**: `GET /api/v1/health` returns all 5 fields; `pnpm --filter @leaseKo/api test` shows all health spec tests passing (5 total).

---

## Phase 4: User Story 2 — Swagger documentation (Priority: P2)

**Goal**: `GET /health` appears in Swagger UI under "System" with no auth requirement and a response schema showing all 5 fields with descriptions and examples.

**Independent Test**: Open `http://localhost:3001/api/docs` → find `GET /health` under "System" → no lock icon → "Try it out" + "Execute" without a token → `200 OK` with all fields.

### Implementation for User Story 2

- [x] T004 [US2] Verify `@ApiProperty` decorators on `HealthResponseDto` include `description` and `example` values for `uptime` and `environment` — update if missing — in `apps/api/src/modules/health/presentation/dto/health-response.dto.ts`

> T004 is a verification-and-fix task. The `@ApiProperty` decorators were added in T001; this task confirms Swagger renders them correctly and applies any fixes needed after manual inspection.

**Checkpoint**: Swagger UI shows `GET /health` under "System" with no lock icon and response schema showing all 5 fields with examples.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T005 [P] Run `pnpm --filter @leaseKo/api build` and confirm exit 0
- [x] T006 [P] Run `pnpm --filter @leaseKo/api test` and confirm all test suites pass (expect 20 total — up from 18)
- [x] T007 Update `BACKLOG.md` to mark US 6.2 tasks `[x]`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on T001 (DTO updated)
- **US2 (Phase 4)**: Depends on T001 (DTO fields present so Swagger can render them)
- **Polish (Phase 5)**: Depends on Phase 3 and Phase 4 completion

### User Story Dependencies

- **US1 (P1)**: T002 and T003 are independent of each other (`[P]` on T003) — both depend only on T001
- **US2 (P2)**: T004 is a verification of T001 output — depends on T001 and T002 (controller generates the fields that Swagger will display)

### Within Phase 3

- T002 and T003 can run in parallel (different files, same dependency on T001)

### Parallel Opportunities

```bash
# After T001 completes, run T002 and T003 in parallel:
# T002: Update health.controller.ts
# T003: Update health.controller.spec.ts
```

---

## Implementation Strategy

**MVP scope**: US1 only (T001 + T002 + T003) — delivers the operational liveness check with all required fields.

**Full delivery**: US2 (T004) adds Swagger documentation visibility — low-effort verification task on top of the MVP.

**Execution order**:
1. T001 — DTO update (foundational)
2. T002 + T003 in parallel — controller + test update
3. T004 — Swagger verification
4. T005 + T006 in parallel — build + test validation
5. T007 — BACKLOG update

**Total tasks**: 7
**Tasks per user story**: US1 = 2 (T002, T003), US2 = 1 (T004)
**Parallel opportunities**: T002+T003, T005+T006
