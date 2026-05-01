# Tasks: Swagger (OpenAPI) Integration

**Input**: Design documents from `/specs/002-swagger-integration/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: No automated tests in this feature — manual verification via Swagger UI per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Can run in parallel (touches different files, no blocking dependencies)
- **[US#]**: Which user story this task belongs to
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Install `@nestjs/swagger` and its required peer packages into the NestJS app. This is a prerequisite for all subsequent phases.

- [X] T001 Add `@nestjs/swagger`, `class-validator`, and `class-transformer` as dependencies in `apps/api/package.json` and run `pnpm install` from the repo root

**Checkpoint**: `node_modules/@nestjs/swagger` exists in `apps/api`. TypeScript can import from `@nestjs/swagger`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that ALL user story phases depend on — the Swagger bootstrap and the error envelope DTO. No user story phase can be fully completed until this phase is done.

**⚠️ CRITICAL**: No user story work can be completed until T003 is done (no Swagger UI = no way to verify any story).

- [X] T002 [P] Create `ErrorResponseDto` class with `statusCode: number`, `message: string`, and optional `error?: string` properties, each decorated with `@ApiProperty()` — `apps/api/src/shared/dto/error-response.dto.ts`
- [X] T003 Update `main.ts` to: (1) add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`, (2) wrap a `DocumentBuilder` chain (.setTitle / .setDescription / .setVersion / .addBearerAuth) + `SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: true })` + `SwaggerModule.setup('api/docs', app, document)` in `if (process.env.NODE_ENV !== 'production')` — `apps/api/src/main.ts`

**Checkpoint**: API starts with `pnpm --filter @leaseKo/api dev`. Navigating to `http://localhost:3001/api/docs` renders the Swagger UI (empty, no endpoints yet). A 🔒 Authorize button is visible.

---

## Phase 3: User Story 1 — API Documentation Available to Developers (Priority: P1) 🎯 MVP

**Goal**: All existing endpoints (starting with `/health`) appear in Swagger UI grouped by tag, with complete request/response schema documentation.

> **Note**: US3 (Public Health Endpoint) is addressed within this phase — the health endpoint's public nature is a property of its `@ApiOperation` description and absence of any `@ApiBearerAuth()` decorator.

**Independent Test**: Start the API. Navigate to `http://localhost:3001/api/docs`. Confirm: (1) Swagger UI loads, (2) a "System" tag section is visible, (3) `GET /api/v1/health` is listed under System with a description, (4) the response schema shows `HealthResponseDto` fields. No `@ApiBearerAuth()` padlock icon appears on the health endpoint.

### Implementation for User Story 1

- [X] T004 [P] [US1] Create `HealthResponseDto` class with `status: string` and `timestamp: string`, both decorated with `@ApiProperty({ example: ... })` — `apps/api/src/modules/health/presentation/dto/health-response.dto.ts`
- [X] T005 [US1] Update `HealthController.check()` to: (1) add `@ApiTags('System')` on the class, (2) add `@ApiOperation({ summary: 'Health check', description: 'Returns API liveness status. Public — no authentication required.' })` on the method, (3) add `@ApiOkResponse({ type: HealthResponseDto, description: 'API is healthy' })` on the method, (4) return a `HealthResponseDto`-shaped object `{ status: 'ok', timestamp: new Date().toISOString() }` — `apps/api/src/modules/health/health.controller.ts`

**Checkpoint**: Swagger UI shows the "System" section. Expanding `GET /api/v1/health` shows the description and a 200 response schema with `status` and `timestamp` fields. No padlock on this endpoint. US1 acceptance scenarios 1–4 and US3 acceptance scenarios 1–3 are all verifiable.

---

## Phase 4: User Story 2 — Authenticated API Testing in Swagger UI (Priority: P1)

**Goal**: A developer can click Authorize in Swagger UI, enter a Bearer token, call the protected `GET /me` endpoint, and see a real response. Without a token, the endpoint returns 401.

**Independent Test**: In Swagger UI: (1) click Authorize, enter any non-empty string, click Authorize + Close. (2) Expand `GET /api/v1/me`, click Try it out → Execute. Confirm 200 response with `{ "userId": "stub_user_001", "tenantId": "stub_tenant_001" }`. (3) Click Authorize → Logout. Execute again. Confirm 401 Unauthorized response.

### Implementation for User Story 2

- [X] T006 [P] [US2] Create `StubBearerGuard` implementing `CanActivate`: extract `Authorization` header — throw `UnauthorizedException('Missing or invalid Bearer token')` if absent or not in `Bearer <token>` format — otherwise attach `{ userId: 'stub_user_001', tenantId: 'stub_tenant_001' }` to `request.user` and return `true` — `apps/api/src/common/guards/stub-bearer.guard.ts`
- [X] T007 [P] [US2] Create `MeResponseDto` class with `userId: string` and `tenantId: string`, both decorated with `@ApiProperty({ example: ... })` — `apps/api/src/modules/system/presentation/dto/me-response.dto.ts`
- [X] T008 [US2] Create `SystemController` with `@Controller()`, `@ApiTags('System')`, `@ApiBearerAuth()` on the class, and a `@Get('me')` method decorated with `@UseGuards(StubBearerGuard)`, `@ApiOperation({ summary: 'Get current user context' })`, `@ApiOkResponse({ type: MeResponseDto })` that returns `request.user` as `MeResponseDto` — `apps/api/src/modules/system/system.controller.ts`
- [X] T009 [US2] Create `SystemModule` with `controllers: [SystemController]` — `apps/api/src/modules/system/system.module.ts`
- [X] T010 [US2] Import `SystemModule` in the `imports` array of `AppModule` — `apps/api/src/app.module.ts`

**Checkpoint**: Swagger UI shows a padlock icon on `GET /me`. With Authorize set to any non-empty token → 200 with mock identity. Without token → 401. Acceptance scenarios 1–4 for US2 are all verifiable.

---

## Phase 5: User Story 4 — Consistent Error Contracts Visible in Docs (Priority: P2)

**Goal**: Every endpoint that can return an error documents that error using the standard `ErrorResponseDto` envelope. A developer inspecting any error response in Swagger UI sees the identical `{ statusCode, message, error }` shape.

**Independent Test**: In Swagger UI, expand `GET /me`. Confirm the "Responses" section shows a 401 entry with a schema that includes `statusCode: number`, `message: string`, `error?: string`. Inspect the schema model definitions — `ErrorResponseDto` appears as a named, reusable schema.

### Implementation for User Story 4

- [X] T011 [US4] Add `@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid Bearer token' })` to `SystemController.me()` — `apps/api/src/modules/system/system.controller.ts`

**Checkpoint**: Swagger UI shows a "401" entry under `GET /me` responses with the `ErrorResponseDto` schema. Acceptance scenarios 1–3 for US4 are verifiable. `HealthController` intentionally has no error response entries (it is a 200-only endpoint — no error docs needed).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the build is clean, no TypeScript errors, and all six success criteria from the spec are met.

- [X] T012 Run `pnpm --filter @leaseKo/api build` and confirm zero TypeScript compile errors — `apps/api/`
- [X] T013 [P] Manually verify SC-006: set `NODE_ENV=production` in terminal, start the API, confirm `GET http://localhost:3001/api/docs` returns 404 — `apps/api/src/main.ts`

**Final Checkpoint**: All six success criteria (SC-001 through SC-006) are met. Feature is ready to merge.

---

## Dependencies

```
T001 (deps install)
  └─ T002 (ErrorResponseDto)  ─────────────────────────────── T011 (error decorators on SystemController)
  └─ T003 (main.ts bootstrap)                                     │
       └─ T004 (HealthResponseDto) ──────────┐                    │
       └─ T005 (HealthController update) ◄───┘                    │
       └─ T006 (StubBearerGuard) ─────────────────────────────────┤
       └─ T007 (MeResponseDto) ───────────────────────────────────┤
            └─ T008 (SystemController) ◄──── T006, T007 ──────────┘
                 └─ T009 (SystemModule)
                      └─ T010 (AppModule import)
                           └─ T012 (build check)
                           └─ T013 (production check)
```

**Story completion order**: Phase 3 (US1+US3) can run independently of Phase 4 (US2) after Phase 2 completes.

---

## Parallel Execution Examples

### Within Phase 2
T002 and T003 can run in parallel — different files with no inter-dependency.

### Within Phase 3
T004 can be written at any time after T001. T005 depends on T004 (imports `HealthResponseDto`).

### Within Phase 4
T006 and T007 can run in parallel — different files. T008 depends on both. T009 depends on T008. T010 depends on T009.

### Phases 3 and 4 in parallel
After Phase 2 is complete, Phase 3 (HealthController work) and Phase 4 (SystemController work) can be executed by two developers in parallel — they touch different files.

---

## Implementation Strategy

**MVP scope**: Phases 1–3 only (T001–T005)
- Delivers: Swagger UI loads at `/api/docs`, health endpoint fully documented, System tag visible
- Validates: The Swagger bootstrap works, doc generation is correct, no TypeScript errors
- Unblocks: Frontend can reference the OpenAPI JSON at `/api/docs-json`

**Increment 2**: Phase 4 (T006–T010)
- Delivers: Authorize dialog, `/me` endpoint with stub auth, 401 path tested
- Validates: End-to-end auth flow works in Swagger UI

**Increment 3**: Phase 5 (T011) + Phase 6 (T012–T013)
- Delivers: Full error contract consistency, production safety verified
- Closes: All 6 success criteria

**Total tasks**: 13
**By user story**:
- US1: 2 tasks (T004–T005)
- US2: 5 tasks (T006–T010)
- US3: folded into US1 (same controller, no additional implementation tasks)
- US4: 1 task (T011)
- Foundational/setup/polish: 5 tasks (T001–T003, T012–T013)

**Parallel opportunities**: 4 identified (T002‖T003, T004 early start, T006‖T007, Phase 3‖Phase 4)
