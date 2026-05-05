# Tasks: Clean Architecture Module Structure

**Input**: Design documents from `/specs/016-clean-arch-module-structure/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US5 per spec.md)
- All paths relative to `apps/api/src/` unless stated otherwise

---

## Phase 1: Setup — Scaffold Layer Directories

**Purpose**: Create all missing `domain/`, `application/`, `infrastructure/`, and `presentation/dto/` directories with `.gitkeep` files so the four-layer template is visible in every module. No code changes — safe to run in full parallel.

- [X] T001 Create scaffold dirs for auth module: `modules/auth/domain/.gitkeep` and `modules/auth/presentation/dto/.gitkeep`
- [X] T002 [P] Create scaffold dirs for tenants module: `modules/tenants/domain/entities/.gitkeep`, `modules/tenants/application/use-cases/.gitkeep`, `modules/tenants/presentation/dto/.gitkeep`
- [X] T003 [P] Create scaffold dirs for users module: `modules/users/domain/.gitkeep`, `modules/users/presentation/dto/.gitkeep`
- [X] T004 [P] Create scaffold dirs for tenant-context module: `modules/tenant-context/domain/.gitkeep`, `modules/tenant-context/application/.gitkeep`, `modules/tenant-context/infrastructure/.gitkeep`
- [X] T005 [P] Create scaffold dirs for health module: `modules/health/domain/.gitkeep`, `modules/health/application/.gitkeep`, `modules/health/infrastructure/.gitkeep`
- [X] T006 [P] Create scaffold dirs for system module: `modules/system/domain/.gitkeep`, `modules/system/application/.gitkeep`, `modules/system/infrastructure/.gitkeep`

**Checkpoint**: All 6 modules now show four-layer directory structure. No typecheck needed — no code changed.

---

## Phase 2: User Story 1 — Complete Four-Layer Structure (Priority: P1) 🎯 MVP

**Goal**: Every business module has all four layers populated with the correct files. Two controllers currently at module root are moved into their `presentation/` layer.

**Independent Test**: `Get-ChildItem apps/api/src/modules -Directory` shows every module subdirectory contains `domain/`, `application/`, `infrastructure/`, `presentation/`. Running `pnpm --filter @leaseKo/api typecheck` exits 0.

- [X] T007 [US1] Move `modules/health/health.controller.ts` → `modules/health/presentation/health.controller.ts` and update its internal relative imports: `../../common/decorators/public.decorator` → `../../../common/decorators/public.decorator`; `./presentation/dto/health-response.dto` → `./dto/health-response.dto`
- [X] T008 [US1] Update `modules/health/health.module.ts`: change controller import from `./health.controller` → `./presentation/health.controller`
- [X] T009 [US1] Update `modules/health/health.controller.spec.ts`: change controller import from `./health.controller` → `./presentation/health.controller`
- [X] T010 [P] [US1] Move `modules/system/system.controller.ts` → `modules/system/presentation/system.controller.ts` and update its internal relative imports: `../../common/types/request-context.type` → `../../../common/types/request-context.type`; `../../shared/dto/error-response.dto` → `../../../shared/dto/error-response.dto`; `./presentation/dto/me-response.dto` → `./dto/me-response.dto`
- [X] T011 [P] [US1] Update `modules/system/system.module.ts`: change controller import from `./system.controller` → `./presentation/system.controller`
- [X] T012 [US1] Run `pnpm --filter @leaseKo/api typecheck` to validate all moves compile cleanly — must exit 0 before proceeding

**Checkpoint**: Both controllers are in `presentation/` layers. TypeScript compiles. US1 independently testable — verify four-layer dirs in all modules and zero type errors.

---

## Phase 3: User Story 2 + User Story 5 — Architecture Documentation (Priority: P2 + P3)

**Goal**: Create `docs/backend-architecture.md` as the canonical reference for module structure, layer boundaries, dependency rules, and the future module template. Can be done in parallel with Phase 2.

**Independent Test**: `docs/backend-architecture.md` exists and contains all required sections: module structure, layer responsibilities, dependency direction, Prisma usage rules, repository boundary rules, common folder rules, future module template, refactor checklist.

- [X] T013 [P] [US2] Create `docs/backend-architecture.md` containing: (1) module structure overview with folder tree, (2) layer responsibility table (domain/application/infrastructure/presentation), (3) dependency direction diagram (`presentation → application → domain`, `infrastructure → application/domain`), (4) Prisma usage rules (allowed: `database/prisma/` and `*/infrastructure/repositories/`; forbidden: all other locations), (5) repository boundary rules (interfaces in `application/repositories/`, implementations in `infrastructure/repositories/`, DI tokens in interface file), (6) common folder rules (only cross-cutting infrastructure; no domain-specific logic), (7) future module template with complete folder tree for `modules/example/`, (8) refactor checklist, (9) validation checklist

**Checkpoint**: Architecture documentation exists. New team members can scaffold any future module (`properties`, `units`, `leases`, `payments`) by following this doc alone.

---

## Phase 4: User Story 3 + User Story 4 — Final Validation (Priority: P1 + P2)

**Goal**: Confirm zero regressions after all structural changes. Verify Prisma isolation is intact.

**Independent Test**: All commands exit 0; grep returns zero violations.

- [X] T014 [US4] Run full validation suite: `pnpm --filter @leaseKo/api typecheck` + `pnpm --filter @leaseKo/api build` + `pnpm --filter @leaseKo/api test` — all must pass (10/10 tests, zero type errors, successful nest build)
- [X] T015 [US3] Run Prisma isolation grep: confirm zero `import.*PrismaService` or `import.*@prisma/client` statements outside `database/prisma/` and `*/infrastructure/repositories/` — command: `Get-ChildItem -Path "apps/api/src" -Recurse -Filter "*.ts" | Select-String -Pattern "^import.*PrismaService|^import.*@prisma/client" | Where-Object { $_.Path -notmatch "database[/\\]prisma" -and $_.Path -notmatch "infrastructure[/\\]repositories" }`

**Checkpoint**: All tests pass. Build succeeds. Prisma isolation confirmed. Feature is complete.

---

## Dependencies

```
T001 ──────────────────────────────────────────────┐
T002 [P] ─────────────────────────────────────────┤
T003 [P] ────────────────────────────────────────┤  (scaffold phase — all parallel)
T004 [P] ───────────────────────────────────────┤  │
T005 [P] ──────────────────────────────────────┤  │
T006 [P] ─────────────────────────────────────┘  │
                                                  ▼
T007 → T008 → T009 ──────────────────── T012 (typecheck gate)
T010 [P] → T011 [P] ─────────────────────┘

T013 [P] — runs parallel to T007–T012 (different files)

T012 ──────────────────────────────────────────────┐
T013 ─────────────────────────────────────────────┤
                                                  ▼
                                          T014 → T015
```

## Parallel Execution Examples

**Phase 1** — All 6 scaffold tasks (T001–T006) run in parallel:
```
T001 | T002 | T003 | T004 | T005 | T006
```

**Phase 2 + 3** — Health move and system move are parallel; docs creation is parallel with both:
```
T007 → T008 → T009 ─┐
T010 → T011 ─────────┤ → T012 → T014 → T015
T013 ────────────────┘
```

## Implementation Strategy

**MVP scope (US1 + US4)**: Complete Phases 1 and 2 first — scaffold directories and move the two controllers. This delivers a fully compliant four-layer structure in all modules and proves zero regressions. Phases 3 and 4 are documentation and final audit.

**Estimated effort**: Low — 2 file moves, 3 import updates, 16 `.gitkeep` files, 1 documentation file.

**Risk**: Near-zero. TypeScript catches any missed import path immediately after T012.

## Validation Summary

- [ ] `auth` module: `domain/`, `application/`, `infrastructure/`, `presentation/` all exist
- [ ] `tenants` module: `domain/entities/`, `application/repositories/`, `application/use-cases/`, `infrastructure/repositories/`, `presentation/dto/` all exist
- [ ] `users` module: `domain/`, `application/repositories/`, `application/use-cases/`, `infrastructure/repositories/`, `presentation/dto/` all exist
- [ ] `tenant-context` module: all four layers exist
- [ ] `health` module: all four layers exist; `health.controller.ts` is at `presentation/health.controller.ts`
- [ ] `system` module: all four layers exist; `system.controller.ts` is at `presentation/system.controller.ts`
- [ ] `docs/backend-architecture.md` exists with all required sections
- [ ] Zero `PrismaService`/`@prisma/client` import violations outside allowed paths
- [ ] `pnpm --filter @leaseKo/api typecheck` exits 0
- [ ] `pnpm --filter @leaseKo/api build` exits 0
- [ ] `pnpm --filter @leaseKo/api test` — 10/10 tests pass
