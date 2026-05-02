# Tasks: Local Infrastructure — Docker, PostgreSQL, Redis

**Input**: Design documents from `specs/006-docker-local-infra/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup — Docker Compose Fix

**Purpose**: Pin the unpinned `adminer:latest` image tag to satisfy the version-pinning requirement. All other Docker services are already correctly pinned.

- [x] T001 [US1] Pin `adminer:latest` → `adminer:4` in `infra/docker-compose.yml`

---

## Phase 2: Root Scripts Completion

**Purpose**: Add the three missing infrastructure lifecycle scripts to `package.json` so developers have the full command set defined in the spec.

- [x] T002 [US4] Add `db:logs`, `db:ps`, and `db:reset` scripts to root `package.json`

---

## Phase 3: User Story 1 — Start Local Infrastructure (Priority: P1) 🎯 MVP

**Goal**: PostgreSQL and Redis containers start healthy with a single command; data persists across restarts.

**Independent Test**: Run `pnpm db:up`, observe both postgres and redis reach `(healthy)` status within 60 seconds, run `pnpm db:down` then `pnpm db:up` again, and confirm PostgreSQL data survives the cycle.

- [x] T003 [P] [US1] Verify `infra/docker-compose.yml` — confirm postgres (16-alpine), redis (7-alpine), adminer (4) are all correctly defined with healthchecks, named volumes, and restart policies
- [x] T004 [P] [US1] Verify `infra/.env.docker` — confirm `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `REDIS_PORT` are present with safe local development defaults
- [ ] T005 [US1] Run `pnpm db:up` and confirm all three containers start and reach healthy state
- [ ] T006 [US1] Run `pnpm db:ps` and confirm leaseKo-postgres, leaseKo-redis, leaseKo-adminer are shown as running
- [ ] T007 [US1] Run `docker exec leaseKo-redis redis-cli ping` and confirm response is `PONG`

---

## Phase 4: User Story 2 — Backend Connection Validation (Priority: P1)

**Goal**: NestJS backend validates `DATABASE_URL` and `REDIS_URL` at startup; missing variables cause immediate, descriptive failure.

**Independent Test**: Start the backend without `DATABASE_URL` in `apps/api/.env` and confirm a clear error message naming the missing variable appears within 5 seconds.

- [x] T008 [P] [US2] Verify `apps/api/.env.example` — confirm `DATABASE_URL` and `REDIS_URL` are present with values that connect to local Docker defaults
- [x] T009 [P] [US2] Verify `apps/api/src/common/config/validation.schema.ts` — confirm `DATABASE_URL` and `REDIS_URL` are `Joi.string().required()` with no `.allow('')`
- [x] T010 [US2] Copy `apps/api/.env.example` to `apps/api/.env`, start the backend with `pnpm --filter @leaseKo/api dev`, and confirm startup succeeds without validation errors
- [x] T011 [US2] Remove `REDIS_URL` from `apps/api/.env`, attempt backend start, confirm exit with error naming `REDIS_URL`, then restore the value

---

## Phase 5: User Story 3 — Environment Setup Documentation (Priority: P2)

**Goal**: `README.md` contains a complete local infrastructure section so a developer onboarding from a clean clone can start all services without external help.

**Independent Test**: Read only the `README.md` and follow its steps from scratch — the documented commands must be sufficient to start PostgreSQL, Redis, and the backend API.

- [x] T012 [US3] Expand `README.md` with a comprehensive **Local Infrastructure** section covering: all `pnpm db:*` commands with descriptions, Adminer login credentials, `DATABASE_URL` and `REDIS_URL` format examples with Docker defaults, troubleshooting steps (port conflicts, missing `.env`, volume reset), and forward references to Feature 007 (Prisma) and Feature 008 (BullMQ)

---

## Phase 6: User Story 4 + End-to-End Validation (Priority: P2)

**Goal**: Confirm lifecycle commands work and the full stack (Docker → NestJS → health endpoint) operates correctly end-to-end.

**Independent Test**: Execute each `pnpm db:*` command and verify the expected effect. Confirm the health endpoint returns `200 OK` with the correct response body while the backend is running.

- [ ] T013 [P] [US4] Run `pnpm db:logs` and confirm log output streams from all running containers
- [ ] T014 [US1] Run `curl http://localhost:3001/api/v1/health` and confirm response: `{ "status": "ok", "service": "api", "timestamp": "<ISO_DATE>" }`
- [ ] T015 [US4] Run `pnpm db:down` and confirm all containers stop gracefully with no data-loss errors
- [ ] T016 [US4] Run `pnpm db:reset` (`down -v`) and confirm volumes are destroyed; run `pnpm db:up` and confirm fresh containers start cleanly

---

## Dependencies

```
T001 → T003 (docker-compose.yml must be fixed before verification)
T002 → T006 (db:ps script must exist before running it)
T002 → T013 (db:logs must exist before running it)
T002 → T015 (db:down already exists — no dep)
T002 → T016 (db:reset must exist before running it)
T005 → T006 → T007 → T010 → T013 → T014 → T015 → T016 (sequential container lifecycle)
T008, T009 (independent read-only verifications — parallel)
T003, T004 (independent read-only verifications — parallel)
```

**Parallel execution within phases**:

- Phase 3: T003 and T004 are read-only verifications and can run in parallel
- Phase 4: T008 and T009 are read-only verifications and can run in parallel
- Phase 6: T013 requires containers to be running (after T005); T014 requires backend running (after T010)

---

## Implementation Strategy

**MVP scope (US1 + US2)**: T001 → T002 → T003–T007 → T008–T011 — delivers working local infrastructure with backend validation  
**Full scope (US3 + US4)**: T012 → T013–T016 — adds documentation and lifecycle management verification

**Suggested execution order**:

1. T001 (pin adminer tag) — 1 file edit
2. T002 (add scripts) — 1 file edit
3. T003–T004 (read-only verifications, parallel)
4. T005–T007 (start containers and verify)
5. T008–T009 (read-only verifications, parallel)
6. T010–T011 (backend validation smoke tests)
7. T012 (README update)
8. T013–T016 (lifecycle validation)
