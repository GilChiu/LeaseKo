# Data Model: Shared Config, ESLint, and Environment Setup

**Feature**: `005-shared-config-eslint-env`

> This feature introduces no database entities. The "data model" for a configuration feature describes the structure and relationships of configuration artifacts.

---

## Configuration Artifact Model

### Shared Config Package (`packages/config`)

```
packages/config/
├── package.json                  # Workspace package manifest with exports
├── tsconfig/
│   ├── base.json                 # EXISTING — strict TypeScript base (all apps inherit)
│   ├── nextjs.json               # EXISTING — Next.js target: ESNext, bundler resolution, DOM, JSX
│   └── nestjs.json               # EXISTING — NestJS target: CommonJS, decorators, emitDecoratorMetadata
└── eslint/
    ├── index.js                  # EXISTING — shared TypeScript ESLint base rules
    └── nestjs.js                 # NEW — NestJS-specific overrides (no-console: error, main.ts override)
```

**Relationships**:

- `nextjs.json` extends `base.json`
- `nestjs.json` extends `base.json`
- `eslint/nestjs.js` extends `eslint/index.js`

### App Configurations

```
apps/web/
├── tsconfig.json                 # EXISTING — extends @leaseKo/config/tsconfig/nextjs.json
├── .eslintrc.js                  # EXISTING — extends @leaseKo/config/eslint + next/core-web-vitals
├── .env.example                  # EXISTING — NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
└── src/lib/env.ts                # EXISTING — runtime validation, throws if NEXT_PUBLIC_API_URL missing

apps/api/
├── tsconfig.json                 # EXISTING — extends @leaseKo/config/tsconfig/nestjs.json
├── .eslintrc.js                  # UPDATE — extend nestjs.js variant instead of index.js
├── .env.example                  # EXISTING — all backend vars
└── src/common/config/
    ├── validation.schema.ts      # EXISTING — Joi startup validation (Feature 004)
    └── app.config.ts             # EXISTING — typed config factory (Feature 004)
```

### Root Artifacts

```
/
├── package.json                  # UPDATE — add typecheck, format:check scripts
├── turbo.json                    # UPDATE — add typecheck pipeline task
└── .env.example                  # NEW — minimal root-level orientation doc
```

---

## Environment Variable Contract

### Root (workspace-level)

| Variable           | Required | Description                                        |
| ------------------ | -------- | -------------------------------------------------- |
| _(none currently)_ | —        | Root has no required env vars; see app-level files |

### `apps/web`

| Variable                            | Required                   | Format                  | Description                                                          |
| ----------------------------------- | -------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`               | ✅ Yes                     | URL (no trailing slash) | NestJS API base URL. Validated at runtime in `src/lib/env.ts`.       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ❌ Optional (until Epic 2) | `pk_...` string         | Clerk publishable key. Empty string allowed until Clerk integration. |

### `apps/api`

| Variable           | Required                   | Format                                  | Description                                      |
| ------------------ | -------------------------- | --------------------------------------- | ------------------------------------------------ |
| `NODE_ENV`         | ❌ Optional                | `development` \| `production` \| `test` | Defaults to `development`.                       |
| `PORT`             | ❌ Optional                | Integer                                 | Defaults to `3001`.                              |
| `DATABASE_URL`     | ✅ Yes                     | `postgresql://...`                      | PostgreSQL connection string.                    |
| `REDIS_URL`        | ✅ Yes                     | `redis://...`                           | Redis connection string.                         |
| `FRONTEND_URL`     | ✅ Yes                     | URL                                     | CORS allow-list origin.                          |
| `CLERK_SECRET_KEY` | ❌ Optional (until Epic 2) | `sk_...` string                         | Clerk secret key. Empty allowed until Epic 2.    |
| `CLERK_JWKS_URL`   | ❌ Optional (until Epic 2) | URL                                     | Clerk JWKS endpoint. Empty allowed until Epic 2. |

---

## Script Contract

### Root `package.json`

| Script         | Command                                       | Pipeline | Purpose                    |
| -------------- | --------------------------------------------- | -------- | -------------------------- |
| `dev`          | `turbo run dev`                               | Yes      | Start all apps in dev mode |
| `build`        | `turbo run build`                             | Yes      | Build all apps             |
| `lint`         | `turbo run lint`                              | Yes      | Lint all workspaces        |
| `typecheck`    | `turbo run typecheck`                         | **NEW**  | Type-check all workspaces  |
| `format`       | `prettier --write "**/*.{ts,tsx,js,json,md}"` | No       | Format all files           |
| `format:check` | `prettier --check "**/*.{ts,tsx,js,json,md}"` | **NEW**  | Check formatting (CI)      |

### `apps/web/package.json`

| Script      | Command        | Purpose     |
| ----------- | -------------- | ----------- |
| `dev`       | `next dev`     | ✅ Existing |
| `build`     | `next build`   | ✅ Existing |
| `lint`      | `next lint`    | ✅ Existing |
| `typecheck` | `tsc --noEmit` | **NEW**     |

### `apps/api/package.json`

| Script      | Command                       | Purpose     |
| ----------- | ----------------------------- | ----------- |
| `dev`       | `nest start --watch`          | ✅ Existing |
| `build`     | `nest build`                  | ✅ Existing |
| `lint`      | `eslint "{src,test}/**/*.ts"` | ✅ Existing |
| `test`      | `jest`                        | ✅ Existing |
| `typecheck` | `tsc --noEmit`                | **NEW**     |
