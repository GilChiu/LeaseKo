# Implementation Plan: Shared TypeScript, ESLint, and Environment Configuration

**Branch**: `005-shared-config-eslint-env` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-shared-config-eslint-env/spec.md`

## Summary

The monorepo already has a comprehensive shared configuration foundation from Features 001–004. This feature closes the remaining gaps: adding `typecheck` and `format:check` scripts to the root and apps, creating a NestJS-specific ESLint variant that enforces `Logger` usage over `console.log`, creating a root `.env.example`, and verifying all tooling commands work end-to-end.

Total new files: 3 (`packages/config/eslint/nestjs.js`, root `.env.example`, root `docs/development.md`).  
Total modified files: 5 (`packages/config/package.json`, `turbo.json`, root `package.json`, `apps/web/package.json`, `apps/api/package.json`, `apps/api/.eslintrc.js`).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: ESLint 8, `@typescript-eslint/eslint-plugin` 7.x, Prettier 3.x, Turborepo 2.x, pnpm 9.x  
**Storage**: N/A — configuration only  
**Testing**: `tsc --noEmit` (type-check), `eslint` (lint), `prettier --check` (format check)  
**Target Platform**: All — monorepo root tools affecting Next.js (Node 20, browser) and NestJS (Node 20)  
**Project Type**: Monorepo tooling and configuration  
**Performance Goals**: `pnpm typecheck` exits in under 30 seconds on cold run; cached runs under 2 seconds  
**Constraints**: Must not break existing `pnpm dev`, `pnpm build`, `pnpm lint` commands; no ESLint v9 migration  
**Scale/Scope**: 2 apps, 1 shared config package; ~50 source files today

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Architecture**

- [N/A] Module follows four-layer Clean Architecture — This feature adds no NestJS modules
- [N/A] Domain layer imports — No new domain code
- [N/A] Controllers are thin — No new controllers
- [N/A] Cross-module interaction — No new module interactions

**Multi-Tenancy (CRITICAL)**

- [N/A] All new DB tables include `tenant_id` — No DB tables
- [N/A] All repository queries filter by `tenant_id` — No repositories
- [N/A] Request context injected via guard — No new endpoints

**Authentication & Authorization**

- [N/A] Clerk JWT verified — No auth changes
- [N/A] Role/permission checks — No auth changes

**Data Layer**

- [N/A] DB access through repositories — No DB access
- [N/A] Prisma schema changes — No schema changes

**API & Async**

- [N/A] Endpoints documented with Swagger — No new endpoints
- [N/A] DTOs use class-validator — No new DTOs
- [N/A] BullMQ jobs — No new queue jobs

**Testing**

- [✅] No unit/integration/E2E tests required — tooling/config feature; verified by `pnpm typecheck` and `pnpm lint` passing

**Security**

- [✅] No secrets in source code — `.env.example` files use placeholder values only; `.gitignore` patterns cover all `.env` files
- [N/A] Rate limiting — No new endpoints
- [N/A] Input validation — No new endpoints

**Post-design re-check**: All N/A items remain N/A. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-shared-config-eslint-env/
├── plan.md                  # This file
├── research.md              # Current state assessment + decision log
├── data-model.md            # Config artifact model + env var contract
├── quickstart.md            # Developer setup guide
├── contracts/
│   └── config-contracts.md  # Package export contract, rule contract, security contract
└── tasks.md                 # (Phase 2 — /speckit.tasks)
```

### Source Code Changes

```text
packages/config/
├── package.json             # MODIFY — add ./eslint/nestjs export
└── eslint/
    ├── index.js             # EXISTING — shared base (no changes needed)
    └── nestjs.js            # CREATE — NestJS-specific no-console override

apps/web/
└── package.json             # MODIFY — add typecheck script

apps/api/
├── package.json             # MODIFY — add typecheck script
└── .eslintrc.js             # MODIFY — extend nestjs.js instead of index.js

# Root
├── package.json             # MODIFY — add typecheck + format:check scripts
├── turbo.json               # MODIFY — add typecheck pipeline task
└── .env.example             # CREATE — root-level env orientation doc
```

## Complexity Tracking

> No constitution violations to justify.

---

## Implementation Phases

### Phase 1: Turborepo + Root Scripts (US1 foundation)

**Goal**: Add `typecheck` and `format:check` to the Turborepo pipeline and root scripts so `pnpm typecheck` works from the monorepo root.

**Tasks**:

1. Add `typecheck` task to `turbo.json`:

   ```json
   "typecheck": {
     "cache": true,
     "outputs": [],
     "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json", "tsconfig.*.json"]
   }
   ```

2. Add scripts to root `package.json`:
   ```json
   "typecheck": "turbo run typecheck",
   "format:check": "prettier --check \"**/*.{ts,tsx,js,json,md}\""
   ```

**Files modified**: `turbo.json`, `package.json` (root)

---

### Phase 2: App-Level typecheck Scripts (US1)

**Goal**: Add `tsc --noEmit` script to both apps so `pnpm typecheck` has per-app tasks to run.

**Tasks**:

1. Add to `apps/web/package.json` scripts:

   ```json
   "typecheck": "tsc --noEmit"
   ```

2. Add to `apps/api/package.json` scripts:
   ```json
   "typecheck": "tsc --noEmit"
   ```

**Files modified**: `apps/web/package.json`, `apps/api/package.json`

---

### Phase 3: NestJS ESLint Config (US1, FR-017)

**Goal**: Create a NestJS-specific ESLint config that enforces NestJS `Logger` usage by tightening `no-console` to `error`, while allowing bootstrap logging in `main.ts`.

**Tasks**:

1. Create `packages/config/eslint/nestjs.js`:

   ```javascript
   /** @type {import('eslint').Linter.Config} */
   module.exports = {
     extends: [require.resolve("./index.js")],
     rules: {
       "no-console": ["error", { allow: ["error", "warn", "debug"] }],
     },
     overrides: [
       {
         files: ["src/main.ts"],
         rules: {
           "no-console": "off",
         },
       },
     ],
   };
   ```

2. Add export to `packages/config/package.json`:

   ```json
   "./eslint/nestjs": "./eslint/nestjs.js"
   ```

3. Update `apps/api/.eslintrc.js` to extend `nestjs.js`:
   ```javascript
   extends: [require.resolve('@leaseKo/config/eslint/nestjs')],
   ```
   (remove the now-inherited base extend line)

**Files created**: `packages/config/eslint/nestjs.js`  
**Files modified**: `packages/config/package.json`, `apps/api/.eslintrc.js`

---

### Phase 4: Root `.env.example` (US2)

**Goal**: Create a minimal root-level `.env.example` that orients new developers to the per-app env files.

**Tasks**:

1. Create `.env.example` at the monorepo root.

**Files created**: `.env.example` (root)

---

### Phase 5: Verification (US1, US2)

**Goal**: Confirm all commands work end-to-end.

**Tasks**:

1. Run `pnpm install` — verify exit 0
2. Run `pnpm typecheck` — verify exit 0, output shows both apps checked
3. Run `pnpm lint` — verify exit 0 (should already pass; re-confirm after ESLint changes)
4. Run `pnpm format:check` — verify exit 0 on clean repo
5. Run `pnpm build` — verify no regressions
6. Verify `no-console` error in `apps/api`: add a test `console.log('test')` to a source file, confirm lint fails, remove it
7. Verify `typecheck` cache: run `pnpm typecheck` twice, confirm second run reads from cache

---

## Decision Summary

| Decision                    | Choice                                         | Rationale                                                          |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| ESLint format               | Stay with legacy `.eslintrc.js` (ESLint v8)    | NestJS + Next.js 14 both work; migration cost not justified        |
| NestJS `no-console`         | `error` with `allow: ['error','warn','debug']` | Enforces Logger; permits framework internals                       |
| `tsc --noEmit`              | No `-p` flag                                   | Finds `tsconfig.json` automatically; `--noEmit` overrides `outDir` |
| `typecheck` caching         | `cache: true`, no `dependsOn`                  | Deterministic; per-app independent check                           |
| Separate `nestjs.js` ESLint | Create as extension of `index.js`              | Minimal duplication; `index.js` is the true base                   |

## Environment Variable Tables

See [data-model.md](./data-model.md) for complete environment variable contracts.

## Validation Checklist

After implementation, verify each acceptance criterion:

- [ ] `pnpm typecheck` exits 0 from monorepo root
- [ ] `pnpm typecheck` exits non-zero when a type error is introduced
- [ ] `pnpm lint` exits 0 from monorepo root
- [ ] `console.log` in `apps/api/src` causes lint error (not warning)
- [ ] `console.log` in `apps/api/src/main.ts` does NOT cause lint error
- [ ] `pnpm format:check` exits 0 on a clean repo
- [ ] `pnpm build` exits 0 (no regressions)
- [ ] Starting API without `FRONTEND_URL` exits with descriptive error
- [ ] Starting Next.js without `NEXT_PUBLIC_API_URL` throws at runtime
- [ ] `apps/web/tsconfig.json` has fewer than 10 lines of non-inherited config
- [ ] `apps/api/tsconfig.json` has fewer than 10 lines of non-inherited config
- [ ] No `.env` files (excluding `.env.example`) in git history

## Notes for Next Task (`/speckit.tasks`)

The implementation is small and well-bounded. Suggested task groupings:

- **Phase 1** (T001–T002): turbo.json + root package.json updates — can be done together
- **Phase 2** (T003–T004): app-level typecheck scripts — can be done in parallel
- **Phase 3** (T005–T007): NestJS ESLint config — 3 file changes, sequential
- **Phase 4** (T008): Root `.env.example` — single file
- **Phase 5** (T009–T015): Verification tasks — sequential validation gates

Total estimated tasks: ~15 (mostly verification).  
No external dependency installs required — all tooling already present.
