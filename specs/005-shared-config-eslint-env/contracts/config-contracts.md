# Contracts: Shared Config, ESLint, and Environment Setup

**Feature**: `005-shared-config-eslint-env`

> This feature has no external API endpoints or network contracts. The "contracts" are the stable interfaces exposed by the shared configuration package to consuming apps and packages.

---

## Config Package Export Contract

**Package**: `@leaseKo/config`

The following paths are importable by any workspace package via `package.json` `exports`:

| Export Path                             | Resolves To                            | Consumer                      |
| --------------------------------------- | -------------------------------------- | ----------------------------- |
| `@leaseKo/config/tsconfig/base.json`    | `packages/config/tsconfig/base.json`   | Any workspace `tsconfig.json` |
| `@leaseKo/config/tsconfig/nextjs.json`  | `packages/config/tsconfig/nextjs.json` | `apps/web/tsconfig.json`      |
| `@leaseKo/config/tsconfig/nestjs.json`  | `packages/config/tsconfig/nestjs.json` | `apps/api/tsconfig.json`      |
| `@leaseKo/config/eslint`                | `packages/config/eslint/index.js`      | All ESLint configs (base)     |
| `@leaseKo/config/eslint/nestjs` _(NEW)_ | `packages/config/eslint/nestjs.js`     | `apps/api/.eslintrc.js`       |

**Stability**: These paths are stable. Apps MUST NOT import internal paths (e.g., `packages/config/tsconfig/base.json` directly — only via the `@leaseKo/config/tsconfig/base.json` export alias).

---

## ESLint Rule Contract

### Base Rules (`@leaseKo/config/eslint`)

| Rule                                                | Setting                       | Rationale                                 |
| --------------------------------------------------- | ----------------------------- | ----------------------------------------- |
| `@typescript-eslint/no-unused-vars`                 | `error` (ignore `^_` pattern) | Prevents dead code                        |
| `@typescript-eslint/no-explicit-any`                | `warn`                        | Gradual path toward type safety           |
| `no-console`                                        | `warn`                        | Base default — overridden per environment |
| `@typescript-eslint/explicit-function-return-type`  | `off`                         | Inferred return types acceptable          |
| `@typescript-eslint/explicit-module-boundary-types` | `off`                         | Inferred module boundaries acceptable     |

### NestJS Overrides (`@leaseKo/config/eslint/nestjs`) _(NEW)_

| Rule                            | Setting                                  | Rationale                                          |
| ------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| `no-console`                    | `error` (allow `error`, `warn`, `debug`) | Enforce NestJS `Logger` usage; block `console.log` |
| `no-console` (in `src/main.ts`) | `off`                                    | Bootstrap logging is acceptable in entry point     |

---

## TypeScript Strictness Contract

All apps and packages extending any shared tsconfig inherit these guarantees:

| Property                           | Value  | Source                    |
| ---------------------------------- | ------ | ------------------------- |
| `strict`                           | `true` | `base.json`               |
| `noUnusedLocals`                   | `true` | `base.json`               |
| `noUnusedParameters`               | `true` | `base.json`               |
| `noImplicitReturns`                | `true` | `base.json`               |
| `noFallthroughCasesInSwitch`       | `true` | `base.json`               |
| `forceConsistentCasingInFileNames` | `true` | `base.json`               |
| `skipLibCheck`                     | `true` | `base.json` (performance) |

**NestJS override** (intentional): `strictPropertyInitialization: false` — required for NestJS decorator injection patterns where properties are initialized by the framework, not in constructors.

---

## Environment Security Contract

| Rule                                                          | Enforcement                                       |
| ------------------------------------------------------------- | ------------------------------------------------- |
| No `NEXT_PUBLIC_` variable may contain a backend secret       | Code review + naming convention                   |
| `.env` files (all variants) are git-ignored                   | `.gitignore` patterns                             |
| `.env.example` files are committed and document all variables | `!.env.example` git-ignore negation               |
| Required env variables cause startup failure when absent      | Joi schema validation (api), `env.ts` throw (web) |
| Empty strings are invalid for required variables              | Joi `Joi.string().required()` rejects empty       |
