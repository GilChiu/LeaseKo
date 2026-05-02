# Tasks: Shared TypeScript, ESLint, and Environment Configuration

**Feature**: `005-shared-config-eslint-env`
**Input**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/config-contracts.md](./contracts/config-contracts.md)

---

## Phase 1: Setup — Turborepo + Root Scripts

**Purpose**: Add `typecheck` pipeline task to Turborepo and the `typecheck` + `format:check` root scripts so `pnpm typecheck` works from the monorepo root. This is the foundational prerequisite for US1.

- [x] T001 Add `typecheck` task to `turbo.json` under `tasks` key with `cache: true`, `outputs: []`, and `inputs: ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json", "tsconfig.*.json"]`
- [x] T002 [P] Add `"typecheck": "turbo run typecheck"` and `"format:check": "prettier --check \"**/*.{ts,tsx,js,json,md}\""` to root `package.json` scripts

---

## Phase 2: Foundational — App-Level typecheck Scripts

**Purpose**: Add `tsc --noEmit` script to both apps. Required before `pnpm typecheck` from root will produce output from each app. Both tasks are independent (different files).

**Independent Test**: Running `pnpm --filter @leaseKo/web typecheck` and `pnpm --filter @leaseKo/api typecheck` each exits 0.

- [x] T003 [P] Add `"typecheck": "tsc --noEmit"` to `apps/web/package.json` scripts
- [x] T004 [P] Add `"typecheck": "tsc --noEmit"` to `apps/api/package.json` scripts

---

## Phase 3: User Story 1 — Lint and Typecheck Across the Monorepo (P1)

**Story Goal**: Developer runs `pnpm lint` and `pnpm typecheck` from the root and gets a unified pass/fail covering all apps, with no rule duplication in per-app configs.

**Independent Test**: `pnpm lint` exits 0; `pnpm typecheck` exits 0; introducing `const x = 1 as any` in `apps/api/src/app.module.ts` causes `pnpm lint` to warn; adding `const x: string = 1` causes `pnpm typecheck` to fail.

- [x] T005 [US1] Create `packages/config/eslint/nestjs.js` — extend `./index.js`, override `no-console` to `['error', { allow: ['error', 'warn', 'debug'] }]`, add `overrides` block with `files: ['src/main.ts']` setting `no-console: 'off'`
- [x] T006 [US1] Add `"./eslint/nestjs": "./eslint/nestjs.js"` to the `exports` map in `packages/config/package.json`
- [x] T007 [US1] Update `apps/api/.eslintrc.js` — replace `require.resolve('@leaseKo/config/eslint')` with `require.resolve('@leaseKo/config/eslint/nestjs')` in the `extends` array (all other rules remain)

---

## Phase 4: User Story 2 — Developer Copies `.env.example` and Starts Without Errors (P1)

**Story Goal**: A root-level `.env.example` file exists as an orientation doc pointing new developers to per-app env files. All required variables are documented. `.env` files are git-ignored.

**Independent Test**: A developer follows only `.env.example` files to create local `.env` files; API starts cleanly; removing `DATABASE_URL` causes startup to exit with a descriptive Joi error.

- [x] T008 [US2] Create `.env.example` at the monorepo root — document that root has no required variables; include pointers to `apps/web/.env.example` and `apps/api/.env.example` with the minimum values needed for local dev

---

## Phase 5: User Story 3 — New Package Uses Shared Config Without Duplication (P2)

**Story Goal**: Demonstrate that any new `packages/` entry can extend the shared TSConfig with zero rule duplication. This is a documentation/verification story with no new source files required (the shared config already supports this).

**Independent Test**: Shared configs exist and are exported correctly. Any workspace can add a `tsconfig.json` with `extends: "@leaseKo/config/tsconfig/base.json"` and get `strict: true` automatically.

- [x] T009 [P] [US3] Verify `packages/config/package.json` exports include all three tsconfig paths: `./tsconfig/base.json`, `./tsconfig/nextjs.json`, `./tsconfig/nestjs.json` — no file changes expected, this is a verification gate

---

## Phase 6: Polish — Verification Gates

**Purpose**: End-to-end validation that all tooling commands work correctly after the changes above.

- [x] T010 Run `pnpm install` from monorepo root — verify exit 0 and no unresolved dependencies
- [x] T011 [P] Run `pnpm typecheck` from monorepo root — verify exit 0 and output includes both `@leaseKo/web` and `@leaseKo/api` tasks
- [x] T012 [P] Run `pnpm lint` from monorepo root — verify exit 0 with zero errors and zero warnings after ESLint config changes
- [x] T013 [P] Run `pnpm format:check` from monorepo root — verify exit 0 on a clean repository
- [x] T014 Run `pnpm build` from monorepo root — verify exit 0 and no regressions from config changes
- [x] T015 Smoke-test NestJS ESLint override: temporarily add `console.log('test')` to `apps/api/src/modules/health/health.controller.ts`, run `pnpm --filter @leaseKo/api lint`, confirm error (not warning) on `no-console`, then remove the line

---

## Dependencies

```
T001 → T011 (typecheck task must exist before root typecheck runs)
T002 → T011 (root script must exist)
T003 → T011 (web typecheck script must exist)
T004 → T011 (api typecheck script must exist)
T005 → T006 → T007 → T012 (nestjs eslint must be created and exported before app uses it)
T001 ─┬→ T011
T002 ─┤
T003 ─┤
T004 ─┘
T005 → T006 → T007 → T010 → T012 → T015
T008 (independent — no dependencies)
T009 (independent verification gate)
T013 (independent — checks formatting only)
T014 (runs after T010 to avoid double install)
```

## Parallel Execution Per Story

**US1 parallel opportunities**:

- T003 and T004 (different files: `apps/web` vs `apps/api`)
- T011, T012, T013 (different commands, all read-only after implementation)

**US2 parallel opportunities**:

- T008 is fully independent of US1 tasks

**US3 parallel opportunities**:

- T009 is fully independent

## Implementation Strategy

**MVP scope**: Increment 1 (T001–T014) delivers the complete feature — all user stories are addressed.

**Increment 1** (P1 stories + polish): T001–T015

- US1 (P1): T001–T007, T009–T012, T014–T015 — lint and typecheck unified across monorepo
- US2 (P1): T008 — root env orientation doc
- US3 (P2): T009 — verified via existing shared tsconfig exports
- Polish: T010, T013, T014 — install, format:check, build gates

**Suggested execution order (sequential developer path)**:

1. T001 + T002 (turbo + root scripts — 2 file edits)
2. T003 + T004 (app scripts — 2 file edits, parallel)
3. T005 → T006 → T007 (NestJS ESLint chain — 3 file edits)
4. T008 (root `.env.example` — 1 new file)
5. T009 (verification — read-only)
6. T010 → T011 → T012 → T013 → T014 → T015 (validation gates — sequential)

Total: **15 tasks** across 6 phases. No new package installs required. Estimated implementation time: 20–30 minutes.
