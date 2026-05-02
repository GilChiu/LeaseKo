---
description: "Task list for Monorepo Initialization"
---

# Tasks: Monorepo Initialization

**Feature**: `001-monorepo-init`
**Branch**: `001-monorepo-init`
**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md)
**Generated**: 2026-05-02

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable — different files, no unresolved dependencies
- **[US1–US4]**: User story this task satisfies
- Tests are NOT included (not requested in spec)

---

## Phase 1: Setup — Root Monorepo Scaffolding

**Purpose**: Create the root workspace files that every app and package depends on. Must complete before any app or package work begins.

- [x] T001 Create pnpm-workspace.yaml at repo root declaring `apps/*` and `packages/*`
- [x] T002 [P] Create root package.json with name `@leaseKo/monorepo`, `private: true`, `engines: { node: ">=20" }`, `packageManager: "pnpm@9"`, and scripts: `dev`, `build`, `lint`, `format`, `db:up`, `db:down`
- [x] T003 [P] Create turbo.json at repo root with Turborepo 2.x `tasks` key: `dev` (persistent, no cache), `build` (outputs: `dist/**`, `.next/**`, excludes `.next/cache/**`, dependsOn `^build`), `lint` (cached), `test` (no cache)
- [x] T004 [P] Create .gitignore at repo root covering: `node_modules/`, `dist/`, `.next/`, `.env`, `.env.local`, `*.log`, `.turbo/`
- [x] T005 [P] Create .env.example at repo root documenting all required variables: `DATABASE_URL`, `REDIS_URL`, `PORT` (3001), `NODE_ENV`, `NEXT_PUBLIC_API_URL` (http://localhost:3001)
- [x] T006 [P] Create root tsconfig.json as a project-references-only file (not compiled directly) pointing to `apps/web` and `apps/api`

**Checkpoint**: Root workspace is configured. `pnpm install` will resolve all workspaces once apps and packages exist.

---

## Phase 2: Foundational — Shared Config Package

**Purpose**: Establish `@leaseKo/config` — the shared TypeScript and ESLint configurations that both apps extend. Must complete before any app `tsconfig.json` or `.eslintrc.js` can be created.

**⚠️ CRITICAL**: Apps cannot extend shared configs until this phase is complete.

- [x] T007 Create packages/config/package.json with name `@leaseKo/config`, `version: "0.0.1"`, `private: true`, and `exports` pointing to the eslint config index
- [x] T008 [P] Create packages/config/tsconfig/base.json with: `target: ES2020`, `moduleResolution: node16`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `resolveJsonModule: true`, `declaration: true`, `sourceMap: true`, `noUnusedLocals: true`, `noImplicitReturns: true`
- [x] T009 [P] Create packages/config/tsconfig/nextjs.json extending base.json, adding: `jsx: preserve`, `incremental: true`, `plugins: [{ name: "next" }]`
- [x] T010 [P] Create packages/config/tsconfig/nestjs.json extending base.json, adding: `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `strictPropertyInitialization: false`
- [x] T011 [P] Create packages/config/eslint/index.js exporting shared ESLint rules: TypeScript parser (`@typescript-eslint/parser`), recommended TypeScript rules, no-console warning, no-unused-vars as error

**Checkpoint**: Shared config package ready. Both apps can now extend `@leaseKo/config` configs.

---

## Phase 3: User Story 1 — Developer Environment Bootstrap (Priority: P1) 🎯 MVP

**Goal**: Both `apps/web` (Next.js 14) and `apps/api` (NestJS 10) exist as valid workspace members, start with `pnpm dev`, and are accessible at localhost:3000 and localhost:3001 respectively.

**Independent Test**: Run `pnpm install` then `pnpm dev` from repo root. Confirm http://localhost:3000 returns the Next.js home page and http://localhost:3001/health returns `{ status: "ok" }`.

> Note: User Story 3 (Independent App Development) is satisfied by the same work — pnpm `--filter` and Turborepo caching are inherent properties of the workspace and turbo.json config created here.

### Next.js App (apps/web)

- [x] T012 [US1] Create apps/web/package.json with name `@leaseKo/web`, scripts (`dev`: `next dev`, `build`: `next build`, `start`: `next start`, `lint`: `next lint`), and dependencies: `next@^14`, `react@^18`, `react-dom@^18`, devDependencies: `typescript@^5`, `@types/react`, `@types/node`, `@leaseKo/config: workspace:*`
- [x] T013 [P] [US1] Create apps/web/tsconfig.json extending `@leaseKo/config/tsconfig/nextjs.json`, with `paths: { "@/*": ["./src/*"] }` and include `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`
- [x] T014 [P] [US1] Create apps/web/.eslintrc.js extending `@leaseKo/eslint-config` with Next.js core web vitals rules
- [x] T015 [P] [US1] Create apps/web/next.config.ts with minimal config: `reactStrictMode: true`, output left as default (no hardcoded URLs)
- [x] T016 [P] [US1] Create apps/web/src/app/layout.tsx as the root layout with `<html>`, `<body>`, and `{children}` — TypeScript, no inline styles
- [x] T017 [P] [US1] Create apps/web/src/app/page.tsx as a minimal home page returning a `<main>` with project name heading
- [x] T018 [P] [US1] Create apps/web/src/app/(auth)/layout.tsx as an empty pass-through layout (placeholder for Clerk auth group)
- [x] T019 [P] [US1] Create apps/web/src/app/(dashboard)/layout.tsx as an empty pass-through layout (placeholder for protected routes)
- [x] T020 [P] [US1] Scaffold apps/web/src/components/ui/.gitkeep and apps/web/src/lib/.gitkeep to preserve empty directories in git

### NestJS App (apps/api)

- [x] T021 [US1] Create apps/api/package.json with name `@leaseKo/api`, scripts (`dev`: `nest start --watch`, `build`: `nest build`, `start`: `node dist/main`, `lint`: `eslint .`), and dependencies: `@nestjs/core@^10`, `@nestjs/common@^10`, `@nestjs/platform-express@^10`, `reflect-metadata`, `rxjs`; devDependencies: `@nestjs/cli@^10`, `typescript@^5`, `@types/node`, `@leaseKo/config: workspace:*`
- [x] T022 [P] [US1] Create apps/api/tsconfig.json extending `@leaseKo/config/tsconfig/nestjs.json` with `outDir: ./dist`, `rootDir: ./src`, `paths: { "@/*": ["./src/*"] }`
- [x] T023 [P] [US1] Create apps/api/tsconfig.build.json extending `./tsconfig.json` with `exclude: ["node_modules", "dist", "test", "**/*.spec.ts"]`
- [x] T024 [P] [US1] Create apps/api/nest-cli.json with `collection: "@nestjs/schematics"`, `sourceRoot: "src"`, `compilerOptions: { deleteOutDir: true }`
- [x] T025 [P] [US1] Create apps/api/.eslintrc.js extending `@leaseKo/eslint-config` with NestJS-specific overrides
- [x] T026 [P] [US1] Create apps/api/src/modules/health/health.controller.ts with a single `GET /health` endpoint returning `{ status: 'ok', timestamp: new Date().toISOString() }` — thin controller, no business logic
- [x] T027 [P] [US1] Create apps/api/src/modules/health/health.module.ts importing and exporting `HealthController`
- [x] T028 [US1] Create apps/api/src/app.module.ts importing `ConfigModule.forRoot({ isGlobal: true })` and `HealthModule` — no other modules
- [x] T029 [US1] Create apps/api/src/main.ts bootstrapping the NestJS app: reads `PORT` from `process.env.PORT` (default 3001), enables CORS with `origin` from env, sets global prefix `/api/v1` (health check remains at `/health`)
- [x] T030 [P] [US1] Scaffold apps/api/src/common/

**Checkpoint**: US1 complete. `pnpm install && pnpm dev` starts both apps. US3 (independent app dev) is also satisfied — `pnpm --filter @leaseKo/web dev` and `pnpm --filter @leaseKo/api dev` each work independently. Turborepo caches build outputs per app.

---

## Phase 4: User Story 2 — Local Infrastructure Services (Priority: P2)

**Goal**: Docker Compose brings up PostgreSQL 16 and Redis 7 with health checks and named volumes. `pnpm db:up` starts them; `pnpm db:down` stops them cleanly.

**Independent Test**: Run `pnpm db:up`, then `docker ps` to confirm both containers show `(healthy)`. Connect to postgres with `psql postgresql://postgres:postgres@localhost:5432/leaseKo` and confirm empty database is reachable.

> Can be implemented in parallel with Phase 3 — Docker setup has no dependency on app code.

- [x] T031 [US2] Create infra/docker-compose.yml with: `postgres` service (image: `postgres:16-alpine`, port 5432, named volume `postgres_data`, health check `pg_isready`, env vars from `${DB_USER}`, `${DB_PASSWORD}`, `${DB_NAME}` with defaults); `redis` service (image: `redis:7-alpine`, port 6379, named volume `redis_data`, health check `redis-cli ping`); `adminer` service (image: `adminer`, port 8080, depends on postgres healthy); top-level `volumes` block
- [x] T032 [P] [US2] Create infra/.env.docker with compose defaults: `DB_USER=postgres`, `DB_PASSWORD=postgres`, `DB_NAME=leaseKo`, `DB_PORT=5432`, `REDIS_PORT=6379`

**Checkpoint**: US2 complete. `pnpm db:up` starts infrastructure. US4 (Shared Configuration Management) is fully satisfied by Phase 2 + Phase 3 — both apps extend `@leaseKo/config`, a single config change propagates to all apps automatically.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Enforce Node.js version, document per-app environment setup, and update README with setup instructions.

- [x] T033 [P] Add `engines` and `packageManager` to root package.json
- [x] T034 [P] Create apps/api/.env.example with API-specific vars: `PORT=3001`, `NODE_ENV=development`, `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leaseKo`, `REDIS_URL=redis://localhost:6379`
- [x] T035 [P] Create apps/web/.env.local.example with web-specific vars: `NEXT_PUBLIC_API_URL=http://localhost:3001`
- [x] T036 Update README.md at repo root with: project overview, prerequisites (Node 20, pnpm 9, Docker), quickstart steps (`pnpm install` → `pnpm db:up` → `pnpm dev`), app URLs table, and link to `specs/001-monorepo-init/quickstart.md` for full docs

**Checkpoint**: Feature complete. All 4 user stories satisfied. Monorepo is ready for Epic 2 (Authentication) and Epic 4 (Prisma).

---

## Dependency Graph

```
Phase 1 (T001–T006)
    └── Phase 2 (T007–T011)       [shared config must exist before apps extend it]
            └── Phase 3 (T012–T030)   [apps use shared config]
                    └── Phase 4 (T031–T032)   [verify backend connects to infra]
                            └── Final Phase (T033–T036)

Phase 4 can be started in parallel with Phase 3 — no code dependency.
```

### User Story Completion Order

| User Story                            | Satisfied After   | Blocking                                      |
| ------------------------------------- | ----------------- | --------------------------------------------- |
| US1 — Developer Environment Bootstrap | Phase 3           | All subsequent features                       |
| US2 — Local Infrastructure Services   | Phase 4           | Epic 4 (Prisma), Epic 2 (Clerk JWT)           |
| US3 — Independent App Development     | Phase 3           | Nothing (parallel dev capability is inherent) |
| US4 — Shared Configuration Management | Phase 2 + Phase 3 | Code quality consistency                      |

---

## Parallel Execution Examples

### Fastest path for a single developer

```bash
# Phase 1 — complete all in any order (different files)
create: pnpm-workspace.yaml, package.json, turbo.json, .gitignore, .env.example, tsconfig.json

# Phase 2 — T007 first, then T008–T011 in any order
create: packages/config/package.json → then tsconfig/base.json, nextjs.json, nestjs.json, eslint/index.js

# Phase 3 — Next.js and NestJS work can proceed in parallel
# Developer A: T012–T020 (apps/web)
# Developer B: T021–T030 (apps/api)
# Developer C: T031–T032 (infra/) — can start any time after Phase 1

# Polish — T033–T036 in any order
```

### Two-developer split

| Developer A                   | Developer B                   |
| ----------------------------- | ----------------------------- |
| Phase 1 (root)                | —                             |
| Phase 2 (packages/config)     | —                             |
| Phase 3: apps/web (T012–T020) | Phase 3: apps/api (T021–T030) |
| —                             | Phase 4: infra/ (T031–T032)   |
| Polish (T033–T036)            | —                             |

---

## Implementation Strategy

**Recommended order for a single implementer**:

1. **Start with Phase 1 + Phase 2** (root + shared config) — ~30 min. Unblocks everything else.
2. **Implement apps/api first** (T021–T030) — NestJS bootstrap is the harder task. Verify `/health` endpoint responds before moving on.
3. **Implement apps/web** (T012–T020) — Next.js scaffolding is straightforward once NestJS is working.
4. **Docker infra** (T031–T032) — Independent; can be done any time.
5. **Polish** (T033–T036) — Last.

**MVP scope**: Phases 1–3 only (T001–T030). This delivers US1 and US3 — a fully working developer environment with both apps running. Docker infra (US2) can follow immediately after.

---

## Summary

| Phase                 | Tasks                | User Stories       |
| --------------------- | -------------------- | ------------------ |
| Phase 1: Setup        | T001–T006 (6 tasks)  | Foundation         |
| Phase 2: Foundational | T007–T011 (5 tasks)  | Enables US4        |
| Phase 3: US1          | T012–T030 (19 tasks) | US1, US3           |
| Phase 4: US2          | T031–T032 (2 tasks)  | US2                |
| Polish                | T033–T036 (4 tasks)  | Cross-cutting      |
| **Total**             | **36 tasks**         | **4 user stories** |

**Parallel opportunities**: 26 of 36 tasks are marked [P] — can be executed concurrently by different agents or developers once their phase prerequisites are met.
