# Research: Shared Config, ESLint, and Environment Setup

**Feature**: `005-shared-config-eslint-env`
**Phase**: 0 — Pre-design research
**Status**: Complete

---

## Current State Assessment

A thorough review of the monorepo shows the vast majority of this feature is already implemented from Features 001–004. The scope of new work is narrow.

### Already Complete

| Artifact                       | Location                                          | Status                                                        |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------- |
| Shared TSConfig base           | `packages/config/tsconfig/base.json`              | ✅ Complete — strict, comprehensive                           |
| Shared TSConfig for Next.js    | `packages/config/tsconfig/nextjs.json`            | ✅ Complete — extends base, DOM, bundler resolution           |
| Shared TSConfig for NestJS     | `packages/config/tsconfig/nestjs.json`            | ✅ Complete — extends base, decorators, emitDecoratorMetadata |
| `packages/config/package.json` | `packages/config/package.json`                    | ✅ Complete — exports tsconfig + eslint entries               |
| `apps/web/tsconfig.json`       | `apps/web/tsconfig.json`                          | ✅ Extends `@leaseKo/config/tsconfig/nextjs.json`             |
| `apps/api/tsconfig.json`       | `apps/api/tsconfig.json`                          | ✅ Extends `@leaseKo/config/tsconfig/nestjs.json`             |
| Shared ESLint base             | `packages/config/eslint/index.js`                 | ✅ Complete — TypeScript rules, no-console warn               |
| `apps/web` ESLint config       | `apps/web/.eslintrc.js`                           | ✅ Extends shared + `next/core-web-vitals`                    |
| `apps/api` ESLint config       | `apps/api/.eslintrc.js`                           | ✅ Extends shared config                                      |
| Root turbo.json                | `turbo.json`                                      | ✅ Has `lint`, `build`, `dev`, `format`, `test`               |
| Root `package.json` scripts    | `package.json`                                    | ✅ Has `lint`, `build`, `dev`, `format`                       |
| `.gitignore` env patterns      | `.gitignore`                                      | ✅ `.env`, `.env.local`, `.env.*.local` patterns present      |
| `apps/web/.env.example`        | `apps/web/.env.example`                           | ✅ Both frontend vars documented                              |
| `apps/api/.env.example`        | `apps/api/.env.example`                           | ✅ All backend vars documented                                |
| Frontend env validation        | `apps/web/src/lib/env.ts`                         | ✅ Throws if `NEXT_PUBLIC_API_URL` missing                    |
| Backend env validation         | `apps/api/src/common/config/validation.schema.ts` | ✅ Joi schema, startup fail-fast (Feature 004)                |

### Gaps Identified

| Gap                                        | Where                              | What's Needed                                                  |
| ------------------------------------------ | ---------------------------------- | -------------------------------------------------------------- |
| `typecheck` turbo task                     | `turbo.json`                       | Add `typecheck` pipeline task                                  |
| `typecheck` script in `apps/web`           | `apps/web/package.json`            | Add `"typecheck": "tsc --noEmit"`                              |
| `typecheck` script in `apps/api`           | `apps/api/package.json`            | Add `"typecheck": "tsc --noEmit"`                              |
| `typecheck` script at root                 | `package.json`                     | Add `"typecheck": "turbo run typecheck"`                       |
| `format:check` script at root              | `package.json`                     | Add `"format:check": "prettier --check ..."`                   |
| NestJS-specific ESLint config              | `packages/config/eslint/nestjs.js` | Stricter `no-console` for NestJS (use Logger, not console.log) |
| `packages/config` export for nestjs eslint | `packages/config/package.json`     | Add `"./eslint/nestjs": "./eslint/nestjs.js"` export           |
| `apps/api` ESLint update                   | `apps/api/.eslintrc.js`            | Extend `nestjs.js` variant instead of `index.js`               |
| Root `.env.example`                        | `.env.example`                     | Minimal root-level env example pointing to app files           |

---

## Decision Log

### D1 — ESLint Format: Stay with Legacy (ESLint v8 + `.eslintrc.js`)

**Decision**: Do not migrate to ESLint v9 flat config.

**Rationale**:

- `packages/config` pins `eslint@^8.0.0`; both apps use `.eslintrc.js` — all working today.
- Next.js 14 supports legacy format; `next lint` uses ESLint 8 internally.
- NestJS CLI scaffolds `.eslintrc.js`; community patterns and documentation assume legacy format.
- Migration cost (rewriting all configs, testing compatibility) outweighs any benefit at this stage.
- **When to revisit**: When ESLint v9 flat config becomes standard in Next.js or NestJS ecosystems (est. 2026–2027).

### D2 — `no-console` Rule Strategy for NestJS

**Decision**: Create a `packages/config/eslint/nestjs.js` config that extends the base and overrides `no-console` to `error` (with `allow: ['error', 'warn', 'debug']`) and adds a `main.ts` override.

**Rationale**:

- The base config sets `no-console: warn` — suitable as a default but too permissive for a NestJS app where `Logger` is the correct logging API.
- NestJS's `Logger` internally uses `process.stdout/stderr` (not `console`), so `no-console: error` does not conflict with framework internals.
- Allowing `['error', 'warn', 'debug']` prevents blocking the rare case where developers use `console.error` for debugging — they'll get a warning-equivalent path.
- `main.ts` override (`no-console: off`) permits the startup `console.log` calls in the bootstrap function without adding `// eslint-disable-next-line` comments.

### D3 — `tsc --noEmit` for typecheck scripts

**Decision**: Use `tsc --noEmit` (no `-p` flag needed) in both apps.

**Rationale**:

- `tsc` without arguments finds `tsconfig.json` in the current directory automatically.
- `--noEmit` is a compiler flag that takes precedence over `outDir` — no files are emitted regardless of tsconfig settings.
- Adding `-p tsconfig.json` is redundant but harmless; omitting it is cleaner.

### D4 — Turborepo `typecheck` Task Configuration

**Decision**:

```json
"typecheck": {
  "cache": true,
  "outputs": [],
  "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json", "tsconfig.*.json"]
}
```

**Rationale**:

- No `dependsOn` needed — type-checking each app is independent; there is no inter-app type dependency in this monorepo.
- `cache: true` is safe because typecheck is deterministic: same TS files + same tsconfig = same result.
- Inputs must include tsconfig files to invalidate cache when TypeScript config changes.
- Shared config package changes (`packages/config/tsconfig/*`) will propagate cache invalidation through `tsconfig.json` reference — the app `tsconfig.json` extends the shared config, so any reference change rebuilds the cache key.
- Zero outputs (no files emitted).

### D5 — Root `.env.example`

**Decision**: Create a minimal root-level `.env.example` that documents workspace-level variables and pointers to app-specific files.

**Rationale**:

- This monorepo has no root-level env variables in use today.
- The file serves as orientation for new developers — it points them to `apps/web/.env.example` and `apps/api/.env.example`.
- Future workspace-level CI/CD variables (e.g., shared secrets in CI) will be documented here.
